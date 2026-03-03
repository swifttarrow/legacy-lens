import type { Pool } from "pg";
import type { Chunk } from "./types.js";

const BATCH_SIZE = 100;

const INSERT_SQL = `
  INSERT INTO chunks
    (file_path, symbol_name, symbol_type, start_line, end_line, content, chunk_hash, repo_ref)
  VALUES
`;

export interface StoreResult {
  inserted: number;
  skipped: number;
}

export async function storeChunks(
  chunks: Chunk[],
  pool: Pool,
): Promise<StoreResult> {
  let inserted = 0;
  let skipped = 0;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const result = await insertBatch(chunks.slice(i, i + BATCH_SIZE), pool);
    inserted += result.inserted;
    skipped += result.skipped;
  }
  return { inserted, skipped };
}

async function insertBatch(
  batch: Chunk[],
  pool: Pool,
): Promise<{ inserted: number; skipped: number }> {
  const values: unknown[] = [];
  const placeholders: string[] = [];

  batch.forEach((chunk, idx) => {
    const b = idx * 8;
    placeholders.push(
      `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8})`,
    );
    values.push(
      chunk.file_path,
      chunk.symbol_name,
      chunk.symbol_type,
      chunk.start_line,
      chunk.end_line,
      chunk.content,
      chunk.chunk_hash,
      chunk.repo_ref,
    );
  });

  const result = await pool.query(
    `${INSERT_SQL} ${placeholders.join(", ")} ON CONFLICT (chunk_hash) DO NOTHING`,
    values,
  );
  const inserted = result.rowCount ?? 0;
  return { inserted, skipped: batch.length - inserted };
}
