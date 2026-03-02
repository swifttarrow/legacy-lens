# M3 — Hybrid Retrieval (Interactive Profile Only)

## Goal

Implement the interactive retrieval pipeline and establish deterministic fixture-based verification.

This milestone implements the default (interactive) retrieval profile only.

Deep mode is implemented in M3b.

---

## Interactive Retrieval Pipeline

For a given query:

1. Extract identifier candidates (simple heuristic)
2. Perform Postgres FTS retrieval
3. Perform pgvector similarity retrieval
4. Merge and deduplicate candidates
5. Apply lightweight reranking
6. Return top-k (k = 10)

---

## Fixture-Based Verification

Create:

tests/fixtures/retrieval_cases.json

Each fixture must define:

{
  "query": "...",
  "expected_symbols": ["SymbolName"],
  "expected_files": []
}

The `expected_symbols` field is authoritative.

---

## Canonical Rendering Fixture

Add this fixture:

Query:
"Where is the rendering loop implemented?"

Expected symbol:
R_RenderPlayerView

Retrieval passes if:

- At least one expected symbol appears in top-10 results.

---

## Acceptance Criteria

1. retrieve(query, "interactive") returns 10 ranked chunks
2. Each chunk includes:
   - file_path
   - symbol_name
   - start_line
   - end_line
3. `pnpm test:retrieval` passes
4. The rendering fixture returns R_RenderPlayerView in top 10

---

## Test Runner Requirements

Implement:

pnpm test:retrieval

The test must:

- Run all fixtures
- Execute interactive retrieval
- Assert that at least one expected symbol appears in top-k
- Fail if any fixture fails

---

## Non-Goals

- No deep mode (handled in M3b)
- No LLM integration
- No UI
- No evaluation metrics beyond fixture pass/fail

---

## Verification

Run:

pnpm retrieve "Where is the rendering loop implemented?"
pnpm test:retrieval

Expected:

- R_RenderPlayerView appears in output
- All fixtures pass