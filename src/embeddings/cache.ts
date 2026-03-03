import type { Pool } from "pg";

export interface ChunkRow {
  id: number;
  chunk_hash: string;
  content: string;
}

export async function getChunksNeedingEmbeddings(
  pool: Pool,
): Promise<ChunkRow[]> {
  const result = await pool.query<ChunkRow>(
    `SELECT id, chunk_hash, content FROM chunks WHERE embedding IS NULL ORDER BY id`,
  );
  return result.rows;
}

export async function saveEmbeddings(
  pool: Pool,
  items: Array<{ id: number; embedding: number[] }>,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const { id, embedding } of items) {
      await client.query(
        `UPDATE chunks SET embedding = $1::vector WHERE id = $2`,
        [`[${embedding.join(",")}]`, id],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
