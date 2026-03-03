import "../load-env.js";
import { getPool } from "../db/client.js";
import { migrate } from "../db/migrate.js";

const pool = getPool();
await migrate(pool);
await pool.end();
