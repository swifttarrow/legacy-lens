import "../load-env.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { RetrievalProfile } from "../retrieval/retrieve.js";
import { runEval, printReport, writeReportToFile } from "../eval/run.js";
import type { EvalCase, EvalResult } from "../eval/run.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Argument parsing ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let parallel = 4;
let upload = false;
let retrievalOnly = false;
let profile: RetrievalProfile = "interactive";
let reportPath: string | null = "eval-report.md";

for (let i = 0; i < args.length; i++) {
  if ((args[i] === "--parallel" || args[i] === "-p") && i + 1 < args.length) {
    const n = parseInt(args[++i], 10);
    if (isNaN(n) || n < 1) {
      console.error("--parallel requires a positive integer");
      process.exit(1);
    }
    parallel = n;
  } else if (args[i] === "--upload") {
    upload = true;
  } else if (args[i] === "--retrieval-only") {
    retrievalOnly = true;
  } else if (args[i] === "--profile" && i + 1 < args.length) {
    const val = args[++i];
    if (val !== "interactive" && val !== "deep") {
      console.error(`Unknown profile "${val}". Use: interactive | deep`);
      process.exit(1);
    }
    profile = val;
  } else if (args[i] === "--report" && i + 1 < args.length) {
    const val = args[++i];
    reportPath = val === "json" ? "eval-report.json" : val;
  } else if (args[i] === "--no-report") {
    reportPath = null;
  } else if (args[i] === "--help" || args[i] === "-h") {
    console.log(
      "Usage: pnpm eval [--parallel N] [--upload] [--retrieval-only] [--profile interactive|deep] [--report path|json] [--no-report]",
    );
    process.exit(0);
  }
}

// ── Load eval cases ───────────────────────────────────────────────────────────
const fixturePath = join(__dirname, "../../tests/fixtures/eval_cases.json");
const cases: EvalCase[] = JSON.parse(readFileSync(fixturePath, "utf8"));

console.log(
  `Running ${cases.length} eval cases` +
    ` [parallel=${parallel}, profile=${profile}${retrievalOnly ? ", retrieval-only" : ""}]\n`,
);

// ── LangSmith path ────────────────────────────────────────────────────────────
if (upload) {
  if (!process.env.LANGSMITH_API_KEY) {
    console.error("LANGSMITH_API_KEY is not set. Cannot upload.");
    process.exit(1);
  }
  console.log("Uploading to LangSmith (maxConcurrency=" + parallel + ")...");
  const { runWithLangSmith } = await import("../eval/langsmith.js");
  try {
    const experimentName = await runWithLangSmith(cases, { parallel });
    console.log(`\nLangSmith experiment: ${experimentName}`);
    console.log("View at: https://smith.langchain.com");
  } catch (err) {
    console.error("LangSmith upload failed:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
  process.exit(0);
}

// ── Local eval path ───────────────────────────────────────────────────────────
const width = String(cases.length).length;
let completed = 0;

const results: EvalResult[] = await runEval(cases, {
  parallel,
  profile,
  retrievalOnly,
  onProgress(result, done, total) {
    completed = done;
    const idx = String(done).padStart(width, " ");
    const status = result.passed ? "PASS" : "FAIL";
    const ms = result.ttft_ms ?? result.elapsed_ms;
    const elapsed = ms >= 1000
      ? `${(ms / 1000).toFixed(1)}s`
      : `${ms}ms`;
    const suffix = result.ttft_ms !== undefined ? " TTFT" : "";
    process.stdout.write(`[${idx}/${total}] ${status}  ${result.case_id} (${elapsed}${suffix})\n`);
    if (!result.passed) {
      for (const reason of result.failure_reasons) {
        process.stdout.write(`       \u21b3 ${reason}\n`);
      }
    }
  },
});

console.log();
printReport(results);

if (reportPath) {
  writeReportToFile(results, reportPath);
  console.log(`\nReport written to ${reportPath}`);
}

const failed = results.filter((r) => !r.passed).length;
if (failed > 0) process.exit(1);
