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

const ADD_EMBEDDING_COLUMN = `
  ALTER TABLE chunks
  ADD COLUMN IF NOT EXISTS embedding vector(1536)
`;

// FTS_EXPR: augments the symbol_name by splitting camelCase and underscores into
// individual words so "render" matches "R_RenderPlayerView".
const FTS_EXPR = `to_tsvector('english',
  content || ' ' || symbol_name || ' ' ||
  lower(regexp_replace(
    regexp_replace(symbol_name, '([a-z])([A-Z])', '\\1 \\2', 'g'),
    '_', ' ', 'g'
  )))`;

const CREATE_SEARCH_INDEXES = [
  `DROP INDEX IF EXISTS idx_chunks_fts`,
  `CREATE INDEX idx_chunks_fts ON chunks USING GIN(${FTS_EXPR})`,
  `CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw
   ON chunks USING hnsw (embedding vector_cosine_ops)`,
];


export async function migrate(pool: Pool): Promise<void> {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS vector`);
  await pool.query(CREATE_CHUNKS_TABLE);
  for (const idx of CREATE_INDEXES) {
    await pool.query(idx);
  }
  await pool.query(ADD_EMBEDDING_COLUMN);
  for (const idx of CREATE_SEARCH_INDEXES) {
    await pool.query(idx);
  }
  console.log("Migration OK");
}
