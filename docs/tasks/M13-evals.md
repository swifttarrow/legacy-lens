# M13 — Evaluation Harness + LangSmith

## Goal

Create a 50-case evaluation harness that runs locally, supports parallel execution, and uploads results to LangSmith for tracking and comparison over time.

---

## Dependencies

Requires:

- M4 completed (LLM answers)
- M3 completed (retrieval fixtures)

---

## Requirements

### 1. Eval Dataset (50 Cases)

Create `tests/fixtures/eval_cases.json` with 50 cases split across four categories:

| Category      | Count | Purpose |
|---------------|-------|---------|
| **Happy**     | 20    | Typical Doom queries; expected to work well |
| **Edge**      | 12    | Ambiguous, boundary, or unusual queries |
| **Adversarial** | 10  | Tricky queries that probe hallucination, off-topic, or misleading |
| **Performance** | 8   | Latency-sensitive or stress-style cases |

Each case must define:

```json
{
  "id": "unique-slug",
  "category": "happy" | "edge" | "adversarial" | "performance",
  "query": "natural language question",
  "expected_symbols": ["SymbolName"],
  "expected_files": ["file.c"],
  "rubric": {
    "faithfulness": "answer cites only retrieved chunks",
    "usefulness": "answer addresses the question",
    "latency_ms_max": 5000
  }
}
```

- `expected_symbols`: at least one must appear in top-k retrieval or cited in answer
- `expected_files`: optional; at least one file suffix should match if specified
- `rubric.latency_ms_max`: optional; for performance cases, fail if end-to-end exceeds this

### 2. Local Eval Runner

Implement `pnpm eval` (and optionally `pnpm eval:retrieval` for retrieval-only):

- Run all 50 cases
- Support `--parallel N` (default: 4) for concurrent execution
- Output: pass/fail per case to stdout; always write local report (Markdown by default, or JSON via `--report json`)
- For full eval: retrieval → answer → rubric checks
- For retrieval-only: same as `test:retrieval` but over eval dataset

### 3. LangSmith Integration

- Add `langsmith` as a dev dependency
- When `LANGSMITH_API_KEY` is set and `--upload` is passed:
  - Create or reuse a dataset (e.g. `legacy-lens-eval`)
  - Upload examples (inputs = query, expected outputs = expected_symbols/files)
  - Run evaluator that invokes the assistant and scores outputs
  - Use LangSmith's `maxConcurrency` for parallel runs
- Output: link to LangSmith run for inspection

### 4. Parallel Eval Runs

- Use a concurrency limit (e.g. `p-limit` or native `Promise.all` with chunks) to avoid overwhelming OpenAI/DB
- Configurable via `--parallel N` or `EVAL_PARALLEL` env
- Ensure deterministic ordering in report (sort by case id before output)

### 5. Local Report

Generate a viewable local report after each run:

- Write to `eval-report.md` (or `--report <path>`) — Markdown
- Report contents:
  - **Summary**: total pass/fail, breakdown by category (happy/edge/adversarial/performance)
  - **Per-case table**: id, category, query, status (pass/fail), **reason** (why it failed)
- Failure reasons must be explicit, e.g.:
  - "Expected symbol X not in top-k retrieval"
  - "Expected file Y not cited"
  - "Latency 6200ms exceeds max 5000ms"
  - "Answer cited non-retrieved file"
- Report is viewable in any editor or Markdown viewer
- Optional: `--report json` for machine-readable `eval-report.json` (same structure)

---

## Acceptance Criteria

1. `tests/fixtures/eval_cases.json` exists with 50 cases (20 happy, 12 edge, 10 adversarial, 8 performance)
2. `pnpm eval` runs all cases locally; `pnpm eval --parallel 8` runs up to 8 concurrently
3. `pnpm eval --upload` uploads to LangSmith when `LANGSMITH_API_KEY` is set
4. Eval report shows pass/fail per case and category breakdown
5. Performance cases enforce `latency_ms_max` when specified
6. Local report (`eval-report.md`) details each case with pass/fail and explicit failure reason

---

## Files To Create/Modify

- `tests/fixtures/eval_cases.json` — 50 eval cases
- `src/eval/run.ts` — main eval runner (retrieval + answer, parallel execution)
- `src/eval/langsmith.ts` — LangSmith dataset creation, upload, run evaluator
- `src/cli/eval.ts` — CLI entry: `--parallel`, `--upload`, `--retrieval-only`, `--report [path|json]`
- `src/eval/report.ts` — Markdown/JSON report generation
- `package.json` — add `eval`, `eval:retrieval` scripts; add `langsmith` (devDep)
- `docs/plan/03-milestones.md` — add M13

---

## Non-Goals

- No CI integration (manual runs for now)
- No automatic regression gates
- No custom LangSmith evaluators beyond basic pass/fail (stretch: add faithfulness scorer)

---

## Verification

1. Run `pnpm eval` — all 50 cases execute; summary printed
2. Run `pnpm eval --parallel 8` — completes faster; results match
3. Set `LANGSMITH_API_KEY` and run `pnpm eval --upload` — run visible in LangSmith
4. Inspect category breakdown — happy > edge > adversarial pass rates (expected)
5. Open `eval-report.md` — verify pass/fail per case with explicit failure reasons
