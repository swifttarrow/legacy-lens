import { Pool } from "pg";

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _pool = new Pool({ connectionString: url });
  }
  return _pool;
}

export async function checkConnection(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    console.log("Database connection OK");
  } finally {
    client.release();
  }
}
