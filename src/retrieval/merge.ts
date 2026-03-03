import type { RetrievedChunk } from "./types.js";
import type { FtsRow } from "./fts.js";
import type { VectorRow } from "./vector.js";

const RRF_K = 60;
const IDENTIFIER_BOOST = 1.5;

export function mergeAndRerank(
  ftsResults: FtsRow[],
  vectorResults: VectorRow[],
  identifiers: string[],
  topK: number,
): RetrievedChunk[] {
  const scores = new Map<number, { chunk: RetrievedChunk; score: number }>();

  // RRF from FTS results (accumulate when chunk appears in multiple variants)
  ftsResults.forEach((row, rank) => {
    const ftsScore = 1 / (RRF_K + rank + 1);
    const existing = scores.get(row.id);
    if (existing) {
      existing.score += ftsScore;
    } else {
      scores.set(row.id, { chunk: row, score: ftsScore });
    }
  });

  // RRF from vector results, accumulating if chunk already seen
  vectorResults.forEach((row, rank) => {
    const vectorScore = 1 / (RRF_K + rank + 1);
    const existing = scores.get(row.id);
    if (existing) {
      existing.score += vectorScore;
    } else {
      scores.set(row.id, { chunk: row, score: vectorScore });
    }
  });

  // Boost chunks whose symbol_name matches an extracted identifier
  if (identifiers.length > 0) {
    const lowerIds = identifiers.map((id) => id.toLowerCase());
    for (const entry of scores.values()) {
      const symLower = entry.chunk.symbol_name.toLowerCase();
      if (lowerIds.some((id) => symLower === id || symLower.includes(id))) {
        entry.score *= IDENTIFIER_BOOST;
      }
    }
  }

  const sorted = [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .map((e) => ({ ...e.chunk, score: e.score }));

  // Deduplicate by (file_path, symbol_name, start_line, end_line), keep highest score
  const seen = new Set<string>();
  const deduped: RetrievedChunk[] = [];
  for (const chunk of sorted) {
    const key = `${chunk.file_path}:${chunk.symbol_name}:${chunk.start_line}:${chunk.end_line}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(chunk);
    }
  }

  return deduped.slice(0, topK);
}
