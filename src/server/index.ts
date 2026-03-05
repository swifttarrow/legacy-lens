import "../load-env.js";
import http from "node:http";
import path from "node:path";
import fs from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { retrieve } from "../retrieval/retrieve.js";
import type { RetrievalProfile } from "../retrieval/retrieve.js";
import { answerStream } from "../llm/answer.js";
import type { HistoryMessage } from "../llm/answer.js";
import { generateDiff } from "../llm/diff.js";
import { VALID_MODES } from "../llm/prompts.js";
import type { AnswerMode } from "../llm/prompts.js";
import { HTML_PAGE } from "./html.js";

const DiffSchema = z.object({
  query: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length >= 1, "query is required"),
  profile: z.enum(["interactive", "deep"]).default("interactive"),
});

const HistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const AskSchema = z.object({
  query: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length >= 1, "query is required"),
  profile: z.enum(["interactive", "deep"]).default("interactive"),
  mode: z
    .enum(VALID_MODES as [AnswerMode, ...AnswerMode[]])
    .default("explain"),
  history: z.array(HistoryMessageSchema).optional().default([]),
});

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
  let mode: AnswerMode;
  let history: HistoryMessage[];
  try {
    const parsed = JSON.parse(body) as unknown;
    const result = AskSchema.safeParse(parsed);
    if (!result.success) {
      const msg = result.error.errors.map((e) => e.message).join("; ");
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: msg }));
      return;
    }
    query = result.data.query;
    profile = result.data.profile;
    mode = result.data.mode;
    history = result.data.history;
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "invalid JSON" }));
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

  const requestStart = Date.now();

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

    let ttftMs: number | undefined;
    for await (const token of answerStream(query, chunks, mode, history)) {
      if (ttftMs === undefined) {
        ttftMs = Date.now() - requestStart;
        send({ type: "ttft", ms: ttftMs });
      }
      send({ type: "token", text: token });
    }

    send({ type: "done", chunkCount: chunks.length, ttftMs });
  } catch (err) {
    send({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }

  res.end();
}

async function handleDiff(req: IncomingMessage, res: ServerResponse): Promise<void> {
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
    const parsed = JSON.parse(body) as unknown;
    const result = DiffSchema.safeParse(parsed);
    if (!result.success) {
      const msg = result.error.errors.map((e) => e.message).join("; ");
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: msg }));
      return;
    }
    query = result.data.query;
    profile = result.data.profile;
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "invalid JSON" }));
    return;
  }

  try {
    const chunks = await retrieve(query, profile);
    const result = await generateDiff(query, chunks);
    res.writeHead(200, { "Content-Type": "application/json" });
    if (result.startsWith("# CANNOT_DIFF")) {
      const reason = result.replace(/^# CANNOT_DIFF:\s*/i, "").trim();
      res.end(JSON.stringify({ error: reason }));
    } else {
      res.end(JSON.stringify({ diff: result, file_path: chunks[0].file_path }));
    }
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
  }
}

const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/id-Software/DOOM/master/";

function isSafeFilePath(filePath: string): boolean {
  if (!filePath || filePath.includes("..") || path.isAbsolute(filePath)) return false;
  return /^[\w./-]+\.(c|h)$/i.test(filePath.trim());
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

  if (!isSafeFilePath(filePath)) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "access denied" }));
    return;
  }

  const doomDir = process.env.DOOM_REPO_DIR;
  if (doomDir) {
    const base = path.resolve(doomDir);
    const target = path.resolve(base, filePath);
    if (target.startsWith(base + path.sep)) {
      try {
        const content = await fs.readFile(target, "utf-8");
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(content);
        return;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "failed to read file" }));
          return;
        }
        // ENOENT: fall through to GitHub fallback
      }
    }
  }

  // Fallback: fetch from GitHub (used when DOOM_REPO_DIR is unset or file missing in production)
  try {
    const ghUrl = GITHUB_RAW_BASE + filePath;
    const ghResp = await fetch(ghUrl);
    if (!ghResp.ok) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "file not found" }));
      return;
    }
    const content = await ghResp.text();
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "file not found" }));
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

  if (method === "POST" && urlPath === "/api/diff") {
    await handleDiff(req, res);
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
