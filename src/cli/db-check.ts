import "../load-env.js";
import { checkConnection, getPool } from "../db/client.js";

await checkConnection();

const pool = getPool();
const client = await pool.connect();
try {
  const r = await client.query(
    "SELECT 1 FROM pg_extension WHERE extname = 'vector'"
  );
  if (r.rowCount === 0) {
    throw new Error("pgvector extension is not enabled");
  }
  console.log("pgvector extension OK");
} finally {
  client.release();
}

await pool.end();
