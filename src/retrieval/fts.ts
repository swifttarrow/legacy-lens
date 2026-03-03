import type { Pool } from "pg";
import type { RetrievedChunk } from "./types.js";

export interface FtsRow extends RetrievedChunk {
  rank: number;
}

// Augmented tsvector: splits camelCase and underscores in symbol_name so that
// e.g. "render" matches "R_RenderPlayerView". Matches the GIN index expression.
const TSVEC = `to_tsvector('english',
  content || ' ' || symbol_name || ' ' ||
  lower(regexp_replace(
    regexp_replace(symbol_name, '([a-z])([A-Z])', '\\1 \\2', 'g'),
    '_', ' ', 'g'
  )))`;

// Convert an AND tsquery to an OR tsquery for fallback broad matching.
const RELAXED_TSQUERY = `replace(websearch_to_tsquery('english', $1)::text, ' & ', ' | ')::tsquery`;

export async function ftsSearch(
  pool: Pool,
  query: string,
  limit: number,
): Promise<FtsRow[]> {
  try {
    // First pass: strict AND semantics
    const strictResult = await pool.query<FtsRow>(
      `SELECT id, file_path, symbol_name, symbol_type, start_line, end_line,
              ts_rank(${TSVEC}, websearch_to_tsquery('english', $1)) AS rank,
              0 AS score
       FROM chunks
       WHERE ${TSVEC} @@ websearch_to_tsquery('english', $1)
       ORDER BY rank DESC
       LIMIT $2`,
      [query, limit],
    );
    if (strictResult.rows.length >= Math.ceil(limit / 3)) {
      return strictResult.rows;
    }

    // Second pass: relaxed OR semantics (fills in when AND matches too little)
    const relaxedResult = await pool.query<FtsRow>(
      `SELECT id, file_path, symbol_name, symbol_type, start_line, end_line,
              ts_rank(${TSVEC}, ${RELAXED_TSQUERY}) AS rank,
              0 AS score
       FROM chunks
       WHERE ${TSVEC} @@ (${RELAXED_TSQUERY})
       ORDER BY rank DESC
       LIMIT $2`,
      [query, limit],
    );

    // Merge: strict results first, then fill with relaxed (dedup by id)
    const seen = new Set(strictResult.rows.map((r) => r.id));
    const combined = [...strictResult.rows];
    for (const row of relaxedResult.rows) {
      if (!seen.has(row.id)) {
        combined.push(row);
        if (combined.length >= limit) break;
      }
    }
    return combined;
  } catch {
    return [];
  }
}
