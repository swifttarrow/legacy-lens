import { Pool } from "pg";

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _pool = new Pool(parseConnectionConfig(url));
  }
  return _pool;
}

function parseConnectionConfig(url: string): { connectionString: string; ssl?: { rejectUnauthorized: boolean } } {
  // pg-connection-string v3 treats sslmode=require as verify-full, causing ECONNRESET
  // against cloud providers. Strip sslmode from the URL and control SSL explicitly.
  let connectionString = url;
  let needsSsl = false;
  try {
    const parsed = new URL(url);
    needsSsl = parsed.searchParams.has("sslmode");
    parsed.searchParams.delete("sslmode");
    parsed.searchParams.delete("uselibpqcompat");
    connectionString = parsed.toString();
  } catch {
    // unparseable URL — leave as-is
  }
  const ssl = needsSsl ? { rejectUnauthorized: false } : undefined;
  return { connectionString, ssl };
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
