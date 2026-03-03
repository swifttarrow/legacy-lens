import OpenAI from "openai";
import type { RetrievedChunk } from "../retrieval/types.js";
import { getSystemPrompt } from "./prompts.js";
import type { AnswerMode } from "./prompts.js";

const CHAT_MODEL = "gpt-4o-mini";

// Truncate very long chunk bodies to keep per-call cost reasonable.
// gpt-4o-mini has a 128K context window but dense C tables can be huge.
const MAX_CHUNK_CHARS = 2_000;

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
  return chunks
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
}

export async function* answerStream(
  query: string,
  chunks: RetrievedChunk[],
  mode: AnswerMode = "explain",
): AsyncGenerator<string> {
  const userContent =
    chunks.length === 0
      ? `No source code excerpts were retrieved for the query below.\n` +
        `Ask a focused clarifying question instead of attempting an answer.\n\n` +
        `Query: ${query}`
      : `## Retrieved source code\n\n${buildContext(chunks)}\n\n## Question\n\n${query}`;

  const stream = await getClient().chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: getSystemPrompt(mode) },
      { role: "user", content: userContent },
    ],
    stream: true,
  });

  for await (const event of stream) {
    const delta = event.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
