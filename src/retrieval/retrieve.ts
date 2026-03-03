import { getPool } from "../db/client.js";
import { generateEmbeddings } from "../embeddings/generate.js";
import { ftsSearch } from "./fts.js";
import { vectorSearch } from "./vector.js";
import { mergeAndRerank } from "./merge.js";
import { extractIdentifiers } from "./identifiers.js";
import type { RetrievedChunk } from "./types.js";

const TOP_K = 10;
const SEARCH_LIMIT = 30;

export type RetrievalProfile = "interactive";

export async function retrieve(
  query: string,
  _profile: RetrievalProfile = "interactive",
): Promise<RetrievedChunk[]> {
  const pool = getPool();
  const identifiers = extractIdentifiers(query);

  const [embeddings, ftsResults] = await Promise.all([
    generateEmbeddings([query]),
    ftsSearch(pool, query, SEARCH_LIMIT),
  ]);

  const queryEmbedding = embeddings[0];
  const vectorResults = queryEmbedding
    ? await vectorSearch(pool, queryEmbedding, SEARCH_LIMIT)
    : [];

  return mergeAndRerank(ftsResults, vectorResults, identifiers, TOP_K);
}
