import type { Pool } from "pg";

const CREATE_CHUNKS_TABLE = `
  CREATE TABLE IF NOT EXISTS chunks (
    id          SERIAL  PRIMARY KEY,
    file_path   TEXT    NOT NULL,
    symbol_name TEXT    NOT NULL,
    symbol_type TEXT    NOT NULL,
    start_line  INTEGER NOT NULL,
    end_line    INTEGER NOT NULL,
    content     TEXT    NOT NULL,
    chunk_hash  TEXT    NOT NULL UNIQUE,
    repo_ref    TEXT    NOT NULL
  )
`;

const CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_chunks_symbol_type ON chunks (symbol_type)`,
  `CREATE INDEX IF NOT EXISTS idx_chunks_repo_ref    ON chunks (repo_ref)`,
  `CREATE INDEX IF NOT EXISTS idx_chunks_file_symbol ON chunks (file_path, symbol_type)`,
];

export async function migrate(pool: Pool): Promise<void> {
  await pool.query(CREATE_CHUNKS_TABLE);
  for (const idx of CREATE_INDEXES) {
    await pool.query(idx);
  }
  console.log("Migration OK");
}
