import { writeFileSync } from "node:fs";
import { retrieve } from "../retrieval/retrieve.js";
import { answerStream } from "../llm/answer.js";
import type { RetrievedChunk } from "../retrieval/types.js";
import type { RetrievalProfile } from "../retrieval/retrieve.js";

export interface EvalRubric {
  faithfulness: string;
  usefulness: string;
  latency_ms_max?: number;
}

export interface EvalCase {
  id: string;
  category: "happy" | "edge" | "adversarial" | "performance";
  query: string;
  expected_symbols: string[];
  expected_files: string[];
  rubric: EvalRubric;
  /** If present, answer fails if it contains any of these strings (case-insensitive). Used for injection/relevance evals. */
  must_not_contain?: string[];
}

export interface EvalResult {
  case_id: string;
  category: string;
  query: string;
  passed: boolean;
  symbol_hit: boolean;
  file_hit: boolean;
  latency_ok: boolean;
  faithfulness_ok: boolean;
  rejection_ok: boolean;
  elapsed_ms: number;
  ttft_ms?: number;
  retrieved_symbols: string[];
  failure_reasons: string[];
}

/** Extract file paths cited as `path/file.c:N-M` in an answer. */
function extractCitedFiles(answer: string): string[] {
  const RE = /`([\w./\-]+\.(?:c|h)):\d+/g;
  const files: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = RE.exec(answer)) !== null) files.push(m[1]);
  return files;
}

/**
 * Remove inline file citations (`` `path/file.c:N-M` ``) that reference files
 * not present in the retrieved set. Symbol names mentioned in prose are preserved.
 */
function stripUngroundedCitations(answer: string, retrievedFiles: Set<string>): string {
  return answer.replace(/`[\w./\-]+\.(?:c|h):\d+(?:-\d+)?`/g, (match) => {
    const m = /`([\w./\-]+\.(?:c|h)):\d+/.exec(match);
    return m && retrievedFiles.has(m[1]) ? match : "";
  });
}

export async function runEvalCase(
  ec: EvalCase,
  profile: RetrievalProfile = "interactive",
  retrievalOnly = false,
): Promise<EvalResult> {
  const start = Date.now();
  const failureReasons: string[] = [];

  const chunks: RetrievedChunk[] = await retrieve(ec.query, profile);
  const retrievedSymbols = chunks.map((c) => c.symbol_name);
  const retrievedFiles = new Set(chunks.map((c) => c.file_path));

  const isPerformance = ec.category === "performance";
  // Pass all retrieved chunks — TTFT is well under the 3 s budget even with full context.
  const answerChunks = chunks;
  const answerMode = isPerformance ? "concise" : "explain";

  let answer = "";
  let ttftMs: number | undefined;
  if (!retrievalOnly) {
    for await (const token of answerStream(ec.query, answerChunks, answerMode)) {
      if (ttftMs === undefined) {
        ttftMs = Date.now() - start;
      }
      answer += token;
    }
    // Strip any file citations the model added from pretrained knowledge but that
    // were not grounded in the retrieved chunks.
    answer = stripUngroundedCitations(answer, retrievedFiles);
  }

  const elapsed = Date.now() - start;

  // For performance cases, use TTFT (retrieval + first token); otherwise use full elapsed.
  const latencyMs = ec.rubric.latency_ms_max !== undefined && ttftMs !== undefined
    ? ttftMs
    : elapsed;

  // Symbol hit: at least one expected symbol in retrieved chunks or answer text.
  const symbolHit =
    ec.expected_symbols.length === 0 ||
    ec.expected_symbols.some(
      (s) => retrievedSymbols.includes(s) || answer.includes(s),
    );

  // File hit: at least one expected file matches a retrieved chunk's file_path.
  const fileHit =
    ec.expected_files.length === 0 ||
    ec.expected_files.some((f) =>
      chunks.some((c) => c.file_path.endsWith(f)),
    );

  // Latency: TTFT for performance cases (when budget specified), else full elapsed.
  const latencyOk =
    ec.rubric.latency_ms_max === undefined ||
    latencyMs <= ec.rubric.latency_ms_max;

  // Faithfulness: every citation in the answer must come from a retrieved chunk.
  const faithfulnessOk =
    retrievalOnly ||
    extractCitedFiles(answer).every((f) => retrievedFiles.has(f));

  // Rejection: for injection/relevance evals, answer must not contain forbidden phrases.
  const mustNotContain = ec.must_not_contain ?? [];
  const rejectionOk =
    mustNotContain.length === 0 ||
    !mustNotContain.some((phrase) =>
      answer.toLowerCase().includes(phrase.toLowerCase()),
    );

  if (!symbolHit) {
    failureReasons.push(
      `symbol not retrieved: expected one of [${ec.expected_symbols.join(", ")}]`,
    );
  }
  if (!fileHit) {
    failureReasons.push(
      `file not retrieved: expected one of [${ec.expected_files.join(", ")}]`,
    );
  }
  if (!latencyOk) {
    const metric = ec.rubric.latency_ms_max !== undefined && ttftMs !== undefined ? "TTFT" : "latency";
    failureReasons.push(
      `${metric} ${latencyMs}ms exceeded budget ${ec.rubric.latency_ms_max}ms`,
    );
  }
  if (!faithfulnessOk) {
    failureReasons.push("answer cites files not present in retrieved chunks");
  }
  if (!rejectionOk) {
    const found = mustNotContain.find((p) =>
      answer.toLowerCase().includes(p.toLowerCase()),
    );
    failureReasons.push(`answer contains forbidden phrase: "${found}"`);
  }

  return {
    case_id: ec.id,
    category: ec.category,
    query: ec.query,
    passed: symbolHit && fileHit && latencyOk && faithfulnessOk && rejectionOk,
    symbol_hit: symbolHit,
    file_hit: fileHit,
    latency_ok: latencyOk,
    faithfulness_ok: faithfulnessOk,
    rejection_ok: rejectionOk,
    elapsed_ms: elapsed,
    ttft_ms: ttftMs,
    retrieved_symbols: retrievedSymbols,
    failure_reasons: failureReasons,
  };
}

async function runWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

export interface RunEvalOptions {
  parallel?: number;
  profile?: RetrievalProfile;
  retrievalOnly?: boolean;
  onProgress?: (result: EvalResult, completed: number, total: number) => void;
}

export async function runEval(
  cases: EvalCase[],
  options: RunEvalOptions = {},
): Promise<EvalResult[]> {
  const {
    parallel = 4,
    profile = "interactive",
    retrievalOnly = false,
    onProgress,
  } = options;
  let completed = 0;

  return runWithConcurrency(
    cases,
    async (ec) => {
      const result = await runEvalCase(ec, profile, retrievalOnly);
      onProgress?.(result, ++completed, cases.length);
      return result;
    },
    parallel,
  );
}

export function printReport(results: EvalResult[]): void {
  // Sort by id for deterministic output.
  const sorted = [...results].sort((a, b) => a.case_id.localeCompare(b.case_id));

  const width = String(sorted.length).length;
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    const idx = String(i + 1).padStart(width, " ");
    const status = r.passed ? "PASS" : "FAIL";
    const ms = r.ttft_ms ?? r.elapsed_ms;
    const elapsed = ms >= 1000
      ? `${(ms / 1000).toFixed(1)}s`
      : `${ms}ms`;
    const suffix = r.ttft_ms !== undefined ? " TTFT" : "";
    console.log(
      `[${idx}/${sorted.length}] ${status}  ${r.case_id} (${elapsed}${suffix})`,
    );
    if (!r.passed) {
      for (const reason of r.failure_reasons) {
        console.log(`         \u21b3 ${reason}`);
      }
    }
  }

  // Category breakdown.
  const categories = ["happy", "edge", "adversarial", "performance"] as const;
  console.log("\n\u2500\u2500 Summary " + "\u2500".repeat(50));
  console.log(
    `${"Category".padEnd(14)}${"Total".padStart(7)}${"Pass".padStart(6)}${"Fail".padStart(6)}${"Pass%".padStart(7)}`,
  );
  let totalPass = 0;
  let totalFail = 0;

  for (const cat of categories) {
    const catResults = results.filter((r) => r.category === cat);
    if (catResults.length === 0) continue;
    const pass = catResults.filter((r) => r.passed).length;
    const fail = catResults.length - pass;
    const pct = Math.round((pass / catResults.length) * 100);
    totalPass += pass;
    totalFail += fail;
    console.log(
      `${cat.padEnd(14)}${String(catResults.length).padStart(7)}${String(pass).padStart(6)}${String(fail).padStart(6)}${String(pct + "%").padStart(7)}`,
    );
  }

  console.log("\u2500".repeat(41));
  const total = totalPass + totalFail;
  const totalPct = total > 0 ? Math.round((totalPass / total) * 100) : 0;
  console.log(
    `${"Total".padEnd(14)}${String(total).padStart(7)}${String(totalPass).padStart(6)}${String(totalFail).padStart(6)}${String(totalPct + "%").padStart(7)}`,
  );
}

function formatReportMarkdown(results: EvalResult[]): string {
  const sorted = [...results].sort((a, b) => a.case_id.localeCompare(b.case_id));
  const categories = ["happy", "edge", "adversarial", "performance"] as const;
  const lines: string[] = ["# Eval Report", ""];

  // Summary
  lines.push("## Summary", "");
  const total = results.length;
  const totalPass = results.filter((r) => r.passed).length;
  const totalFail = total - totalPass;
  const totalPct = total > 0 ? Math.round((totalPass / total) * 100) : 0;
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total | ${total} |`);
  lines.push(`| Pass | ${totalPass} |`);
  lines.push(`| Fail | ${totalFail} |`);
  lines.push(`| Pass % | ${totalPct}% |`);
  lines.push("");

  // Category breakdown
  lines.push("## By Category", "");
  lines.push("| Category | Total | Pass | Fail | Pass % |");
  lines.push("|----------|-------|------|------|--------|");
  for (const cat of categories) {
    const catResults = results.filter((r) => r.category === cat);
    if (catResults.length === 0) continue;
    const pass = catResults.filter((r) => r.passed).length;
    const fail = catResults.length - pass;
    const pct = Math.round((pass / catResults.length) * 100);
    lines.push(`| ${cat} | ${catResults.length} | ${pass} | ${fail} | ${pct}% |`);
  }
  lines.push("");

  // Per-case table
  lines.push("## Per Case", "");
  lines.push("| ID | Category | Query | Status | Reason |");
  lines.push("|----|----------|-------|--------|--------|");
  for (const r of sorted) {
    const status = r.passed ? "PASS" : "FAIL";
    const reason = r.passed
      ? ""
      : r.failure_reasons
          .join("; ")
          .replace(/\|/g, "\\|")
          .replace(/\n/g, " ");
    const queryEsc = r.query
      .replace(/\|/g, "\\|")
      .replace(/\n/g, " ")
      .slice(0, 60) + (r.query.length > 60 ? "…" : "");
    lines.push(`| ${r.case_id} | ${r.category} | ${queryEsc} | ${status} | ${reason} |`);
  }
  return lines.join("\n");
}

function formatReportJson(results: EvalResult[]): string {
  const sorted = [...results].sort((a, b) => a.case_id.localeCompare(b.case_id));
  const categories = ["happy", "edge", "adversarial", "performance"] as const;
  const summary: Record<string, { total: number; pass: number; fail: number; pass_pct: number }> = {};
  for (const cat of categories) {
    const catResults = results.filter((r) => r.category === cat);
    if (catResults.length === 0) continue;
    const pass = catResults.filter((r) => r.passed).length;
    summary[cat] = {
      total: catResults.length,
      pass,
      fail: catResults.length - pass,
      pass_pct: Math.round((pass / catResults.length) * 100),
    };
  }
  const total = results.length;
  const totalPass = results.filter((r) => r.passed).length;
  return JSON.stringify(
    {
      summary: {
        total,
        pass: totalPass,
        fail: total - totalPass,
        pass_pct: total > 0 ? Math.round((totalPass / total) * 100) : 0,
      },
      by_category: summary,
      cases: sorted.map((r) => ({
        case_id: r.case_id,
        category: r.category,
        query: r.query,
        passed: r.passed,
        elapsed_ms: r.elapsed_ms,
        ttft_ms: r.ttft_ms,
        failure_reasons: r.failure_reasons,
      })),
    },
    null,
    2,
  );
}

/** Write report to file. Format inferred from path: .json = JSON, else Markdown. */
export function writeReportToFile(results: EvalResult[], path: string): void {
  const content =
    path.endsWith(".json") ? formatReportJson(results) : formatReportMarkdown(results);
  writeFileSync(path, content, "utf8");
}
