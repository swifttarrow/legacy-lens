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
  elapsed_ms: number;
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

  let answer = "";
  if (!retrievalOnly) {
    for await (const token of answerStream(ec.query, chunks, "explain")) {
      answer += token;
    }
  }

  const elapsed = Date.now() - start;

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

  // Latency: end-to-end time within the rubric budget (if specified).
  const latencyOk =
    ec.rubric.latency_ms_max === undefined ||
    elapsed <= ec.rubric.latency_ms_max;

  // Faithfulness: every citation in the answer must come from a retrieved chunk.
  const faithfulnessOk =
    retrievalOnly ||
    extractCitedFiles(answer).every((f) => retrievedFiles.has(f));

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
    failureReasons.push(
      `latency ${elapsed}ms exceeded budget ${ec.rubric.latency_ms_max}ms`,
    );
  }
  if (!faithfulnessOk) {
    failureReasons.push("answer cites files not present in retrieved chunks");
  }

  return {
    case_id: ec.id,
    category: ec.category,
    query: ec.query,
    passed: symbolHit && fileHit && latencyOk && faithfulnessOk,
    symbol_hit: symbolHit,
    file_hit: fileHit,
    latency_ok: latencyOk,
    faithfulness_ok: faithfulnessOk,
    elapsed_ms: elapsed,
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
    const elapsed = r.elapsed_ms >= 1000
      ? `${(r.elapsed_ms / 1000).toFixed(1)}s`
      : `${r.elapsed_ms}ms`;
    console.log(
      `[${idx}/${sorted.length}] ${status}  ${r.case_id} (${elapsed})`,
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
