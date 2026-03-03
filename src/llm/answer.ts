import OpenAI from "openai";
import type { RetrievedChunk } from "../retrieval/types.js";

const CHAT_MODEL = "gpt-4o-mini";

// Truncate very long chunk bodies to keep per-call cost reasonable.
// gpt-4o-mini has a 128K context window but dense C tables can be huge.
const MAX_CHUNK_CHARS = 2_000;

const SYSTEM_PROMPT = `\
You are an expert on the original Doom C source code (linuxdoom-1.10).
Answer using ONLY the source code excerpts provided below.

Rules:
- Cite every factual claim using this exact format: \`file_path:start_line-end_line\`
- Never invent or guess symbol names, file paths, or line numbers not present in the excerpts.
- If the excerpts do not contain enough information to answer fully, explicitly say so and state what is uncertain.
- If no excerpts were retrieved, do NOT attempt to answer; instead ask one focused clarifying question to help narrow the search.`;

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
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    stream: true,
  });

  for await (const event of stream) {
    const delta = event.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
