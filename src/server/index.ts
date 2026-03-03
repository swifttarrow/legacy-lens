import "../load-env.js";
import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { retrieve } from "../retrieval/retrieve.js";
import type { RetrievalProfile } from "../retrieval/retrieve.js";
import { answerStream } from "../llm/answer.js";
import { HTML_PAGE } from "./html.js";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function handleAsk(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: string;
  try {
    body = await readBody(req);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "failed to read request body" }));
    return;
  }

  let query: string;
  let profile: RetrievalProfile;
  try {
    const parsed = JSON.parse(body) as { query?: unknown; profile?: unknown };
    query = (typeof parsed.query === "string" ? parsed.query : "").trim();
    profile = parsed.profile === "deep" ? "deep" : "interactive";
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "invalid JSON" }));
    return;
  }

  if (!query) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "query is required" }));
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no", // disable nginx proxy buffering if present
  });

  const send = (data: object): void => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const chunks = await retrieve(query, profile);
    send({ type: "retrieved", count: chunks.length });

    for await (const token of answerStream(query, chunks)) {
      send({ type: "token", text: token });
    }

    send({ type: "done", chunkCount: chunks.length });
  } catch (err) {
    send({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }

  res.end();
}

function setCors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
}

const server = http.createServer(async (req, res) => {
  const url = req.url ?? "/";
  const method = req.method ?? "GET";

  setCors(res);

  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (method === "GET" && url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(HTML_PAGE);
    return;
  }

  if (method === "POST" && url === "/api/ask") {
    await handleAsk(req, res);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Legacy Lens running at http://localhost:${PORT}`);
});

function shutdown(): void {
  server.close(() => process.exit(0));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
