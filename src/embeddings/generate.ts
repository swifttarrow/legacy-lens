import OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-3-small";
const BATCH_SIZE = 100;
// text-embedding-3-small limit is 8192 tokens. C code is token-dense (~1.8 chars/token),
// so 6000 chars ≈ 3300 tokens — well under the limit even for the densest source files.
const MAX_CHARS = 6_000;

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const client = getClient();
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE).map((t) => t.slice(0, MAX_CHARS));
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });
    // response.data is already sorted by index
    results.push(...response.data.map((d) => d.embedding));
  }

  return results;
}
