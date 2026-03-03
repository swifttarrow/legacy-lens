import "../src/load-env.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { retrieve } from "../src/retrieval/retrieve.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface FixtureCase {
  query: string;
  expected_symbols: string[];
  expected_files: string[];
}

const fixtures: FixtureCase[] = JSON.parse(
  readFileSync(join(__dirname, "fixtures", "retrieval_cases.json"), "utf8"),
);

let passed = 0;
let failed = 0;

for (const fixture of fixtures) {
  const results = await retrieve(fixture.query);
  const symbols = new Set(results.map((r) => r.symbol_name));

  const symbolHit =
    fixture.expected_symbols.length === 0 ||
    fixture.expected_symbols.some((s) => symbols.has(s));

  const fileHit =
    fixture.expected_files.length === 0 ||
    fixture.expected_files.some((f) =>
      results.some((r) => r.file_path.endsWith(f)),
    );

  if (symbolHit && fileHit) {
    console.log(`PASS: "${fixture.query}"`);
    passed++;
  } else {
    console.error(`FAIL: "${fixture.query}"`);
    if (!symbolHit) {
      console.error(`  Expected one of: ${fixture.expected_symbols.join(", ")}`);
      console.error(`  Got symbols: ${[...symbols].join(", ")}`);
    }
    if (!fileHit) {
      console.error(
        `  Expected file (suffix): ${fixture.expected_files.join(", ")}`,
      );
      console.error(
        `  Got files: ${[...new Set(results.map((r) => r.file_path))].join(", ")}`,
      );
    }
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
