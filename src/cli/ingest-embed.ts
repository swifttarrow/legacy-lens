import "dotenv/config";
import { getPool } from "../db/client.js";
import { migrate } from "../db/migrate.js";
import {
  getChunksNeedingEmbeddings,
  saveEmbeddings,
} from "../embeddings/cache.js";
import { generateEmbeddings } from "../embeddings/generate.js";

const BATCH_SIZE = 100;

const pool = getPool();
await migrate(pool);

const chunks = await getChunksNeedingEmbeddings(pool);
if (chunks.length === 0) {
  console.log("All chunks already have embeddings.");
  await pool.end();
  process.exit(0);
}

console.log(`Generating embeddings for ${chunks.length} chunks...`);

let processed = 0;
for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
  const batch = chunks.slice(i, i + BATCH_SIZE);
  const embeddings = await generateEmbeddings(batch.map((c) => c.content));
  await saveEmbeddings(
    pool,
    batch.map((c, j) => ({ id: c.id, embedding: embeddings[j] })),
  );
  processed += batch.length;
  console.log(`  ${processed}/${chunks.length}`);
}

console.log(`\nDone. Embedded ${processed} chunks.`);
await pool.end();
