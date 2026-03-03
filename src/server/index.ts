import "../load-env.js";
import http from "node:http";
import path from "node:path";
import fs from "node:fs/promises";
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
    send({
      type: "retrieved",
      count: chunks.length,
      chunks: chunks.map(c => ({
        file_path: c.file_path,
        symbol_name: c.symbol_name,
        start_line: c.start_line,
        end_line: c.end_line,
        score: c.score,
      })),
    });

    for await (const token of answerStream(query, chunks)) {
      send({ type: "token", text: token });
    }

    send({ type: "done", chunkCount: chunks.length });
  } catch (err) {
    send({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }

  res.end();
}

async function handleFile(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const rawUrl = req.url ?? "/";
  const parsedUrl = new URL(rawUrl, "http://localhost");
  const filePath = parsedUrl.searchParams.get("path");

  if (!filePath) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "path is required" }));
    return;
  }

  const doomDir = process.env.DOOM_REPO_DIR;
  if (!doomDir) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "DOOM_REPO_DIR is not set" }));
    return;
  }

  const base = path.resolve(doomDir);
  const target = path.resolve(base, filePath);

  // Prevent directory traversal: target must be strictly inside base
  if (!target.startsWith(base + path.sep)) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "access denied" }));
    return;
  }

  try {
    const content = await fs.readFile(target, "utf-8");
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(content);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "file not found" }));
    } else {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "failed to read file" }));
    }
  }
}

function setCors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
}

const server = http.createServer(async (req, res) => {
  const url = req.url ?? "/";
  const method = req.method ?? "GET";
  const urlPath = url.split("?")[0];

  setCors(res);

  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (method === "GET" && urlPath === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(HTML_PAGE);
    return;
  }

  if (method === "POST" && urlPath === "/api/ask") {
    await handleAsk(req, res);
    return;
  }

  if (method === "GET" && urlPath === "/api/file") {
    await handleFile(req, res);
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
