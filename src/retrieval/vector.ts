import type { Pool } from "pg";
import type { RetrievedChunk } from "./types.js";

export interface VectorRow extends RetrievedChunk {
  similarity: number;
}

export async function vectorSearch(
  pool: Pool,
  embedding: number[],
  limit: number,
): Promise<VectorRow[]> {
  const vectorStr = `[${embedding.join(",")}]`;
  const result = await pool.query<VectorRow>(
    `SELECT id, file_path, symbol_name, symbol_type, start_line, end_line,
            1 - (embedding <=> $1::vector) AS similarity,
            0 AS score
     FROM chunks
     WHERE embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [vectorStr, limit],
  );
  return result.rows;
}
