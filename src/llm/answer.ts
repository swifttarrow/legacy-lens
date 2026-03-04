import OpenAI from "openai";
import type { RetrievedChunk } from "../retrieval/types.js";
import { getSystemPrompt } from "./prompts.js";
import type { AnswerMode } from "./prompts.js";

const CHAT_MODEL = "gpt-4.1-nano";

// Truncate very long chunk bodies to keep per-call cost reasonable.
// gpt-4o-mini has a 128K context window but dense C tables can be huge.
const MAX_CHUNK_CHARS = 2_000;

// Keep at most this many turns (user+assistant pairs) of history to control cost.
const MAX_HISTORY_TURNS = 3;

export type HistoryMessage = { role: "user" | "assistant"; content: string };

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

function buildContext(chunks: RetrievedChunk[]): string {
  const allowedFiles = [...new Set(chunks.map((c) => c.file_path))].join(", ");
  const header = `ALLOWED CITATION FILES (you may ONLY cite these — no others): ${allowedFiles}\n`;
  const excerpts = chunks
    .map((c, i) => {
      const body = c.content.length > MAX_CHUNK_CHARS
        ? c.content.slice(0, MAX_CHUNK_CHARS) + "\n// ... (truncated)"
        : c.content;
      return (
        `### Excerpt ${i + 1}\n` +
        `File: \`${c.file_path}:${c.start_line}-${c.end_line}\`\n` +
        `Symbol: \`${c.symbol_name}\` (${c.symbol_type})\n` +
        "```c\n" + body + "\n```"
      );
    })
    .join("\n\n");
  return header + "\n" + excerpts;
}

export async function* answerStream(
  query: string,
  chunks: RetrievedChunk[],
  mode: AnswerMode = "explain",
  history: HistoryMessage[] = [],
): AsyncGenerator<string> {
  const allowedFiles = chunks.length > 0
    ? [...new Set(chunks.map((c) => c.file_path))].join(", ")
    : "";
  const userContent =
    chunks.length === 0
      ? `No source code excerpts were retrieved for the query below.\n` +
        `Ask a focused clarifying question instead of attempting an answer.\n\n` +
        `Query: ${query}`
      : `## Retrieved source code\n\n${buildContext(chunks)}\n\n## Question\n\n${query}\n\n` +
        `REMINDER: Your answer MUST only cite files from this list: ${allowedFiles}. ` +
        `Do not cite any other file paths, even if you know them from prior knowledge.`;

  // Trim history to the last MAX_HISTORY_TURNS user+assistant pairs.
  const trimmedHistory = history.slice(-(MAX_HISTORY_TURNS * 2));

  const stream = await getClient().chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: getSystemPrompt(mode) },
      ...trimmedHistory,
      { role: "user", content: userContent },
    ],
    stream: true,
    ...(mode === "concise" && { max_tokens: 128 }),
  });

  for await (const event of stream) {
    const delta = event.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
