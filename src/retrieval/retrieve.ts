import type { Pool } from "pg";
import { getPool } from "../db/client.js";
import { generateEmbeddings } from "../embeddings/generate.js";
import { ftsSearch } from "./fts.js";
import type { FtsRow } from "./fts.js";
import { vectorSearch } from "./vector.js";
import { mergeAndRerank } from "./merge.js";
import { extractIdentifiers } from "./identifiers.js";
import { expandQuery } from "./expand.js";
import type { RetrievedChunk } from "./types.js";

const INTERACTIVE_SEARCH_LIMIT = 30;
const INTERACTIVE_TOP_K = 10;

const DEEP_SEARCH_LIMIT = 60;
const DEEP_TOP_K = 20;

export type RetrievalProfile = "interactive" | "deep";

export async function retrieve(
  query: string,
  profile: RetrievalProfile = "interactive",
): Promise<RetrievedChunk[]> {
  const pool = getPool();
  const identifiers = extractIdentifiers(query);
  const isDeep = profile === "deep";

  const searchLimit = isDeep ? DEEP_SEARCH_LIMIT : INTERACTIVE_SEARCH_LIMIT;
  const topK = isDeep ? DEEP_TOP_K : INTERACTIVE_TOP_K;
  const queries = isDeep ? expandQuery(query) : [query];

  // Batch-embed all query variants in a single API call
  const [allEmbeddings, ftsResults] = await Promise.all([
    generateEmbeddings(queries),
    isDeep
      ? mergeAllFts(pool, queries, searchLimit)
      : ftsSearch(pool, query, searchLimit),
  ]);

  // Vector search for every variant's embedding; RRF in mergeAndRerank naturally
  // rewards chunks that surface across multiple query variants.
  const vectorRows = (
    await Promise.all(
      allEmbeddings.map((emb) => vectorSearch(pool, emb, searchLimit)),
    )
  ).flat();

  return mergeAndRerank(ftsResults, vectorRows, identifiers, topK);
}

/**
 * Run FTS for each query variant and concatenate results (no dedup).
 * Chunks appearing in multiple variants get RRF accumulated in mergeAndRerank.
 * Capped at 4×limit to bound growth if expandQuery returns more variants later.
 */
async function mergeAllFts(
  pool: Pool,
  queries: string[],
  limit: number,
): Promise<FtsRow[]> {
  const cap = limit * 4;
  const allResults = await Promise.all(
    queries.map((q) => ftsSearch(pool, q, limit)),
  );
  const merged: FtsRow[] = [];
  for (const rows of allResults) {
    for (const row of rows) {
      merged.push(row);
      if (merged.length >= cap) return merged;
    }
  }
  return merged;
}
