import "dotenv/config";
import { existsSync, readdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { getPool } from "../db/client.js";
import { migrate } from "../db/migrate.js";
import { parseFile } from "../ingest/parse.js";
import { storeChunks } from "../ingest/store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../..");

// ---------------------------------------------------------------------------
// Validate DOOM_REPO_DIR
// ---------------------------------------------------------------------------
const repoDirRaw = process.env.DOOM_REPO_DIR ?? "../doom";
const repoDir = resolve(projectRoot, repoDirRaw);

if (!existsSync(repoDir)) {
  console.error(`DOOM_REPO_DIR not found: ${repoDir}`);
  console.error("Run 'pnpm doom:sync' first.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Get current commit hash (read-only — no clone/fetch)
// ---------------------------------------------------------------------------
const result = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: repoDir,
  encoding: "utf8",
});
if (result.status !== 0) {
  console.error("Failed to read git HEAD in DOOM_REPO_DIR");
  process.exit(1);
}
const repoRef = result.stdout.trim();
console.log(`Ingesting repo_ref: ${repoRef}`);

// ---------------------------------------------------------------------------
// Collect all .c / .h files
// ---------------------------------------------------------------------------
function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (entry.isFile() && /\.(c|h)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const sourceFiles = collectSourceFiles(repoDir);
console.log(`Found ${sourceFiles.length} source files`);

// ---------------------------------------------------------------------------
// Parse + ingest
// ---------------------------------------------------------------------------
const pool = getPool();
await migrate(pool);

let totalParsed = 0;
let totalInserted = 0;
let totalSkipped = 0;
let parseErrors = 0;

for (const filePath of sourceFiles) {
  try {
    const chunks = parseFile(filePath, repoDir, repoRef);
    if (chunks.length > 0) {
      const { inserted, skipped } = await storeChunks(chunks, pool);
      totalParsed += chunks.length;
      totalInserted += inserted;
      totalSkipped += skipped;
    }
  } catch (err) {
    parseErrors++;
    console.warn(`  WARN: failed to parse ${filePath}: ${(err as Error).message}`);
  }
}

console.log(
  `\nParsed ${totalParsed} chunks → inserted ${totalInserted}, skipped ${totalSkipped} (duplicates)${parseErrors > 0 ? `, ${parseErrors} file errors` : ""}`,
);
await pool.end();
