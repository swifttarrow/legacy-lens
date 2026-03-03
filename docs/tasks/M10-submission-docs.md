# M10 — Submission Documentation

## Goal

Create the documentation required for final submission per REQUIREMENTS.md:

- Pre-Search doc
- RAG Architecture doc
- AI Cost analysis

---

## Dependencies

None. Can be done in parallel with other milestones.

---

## Deliverables

### 1. Pre-Search Doc

**Path:** `docs/submission/pre-search.md`

**Content (1–2 pages):** Use the Appendix Pre-Search Checklist (REQUIREMENTS lines 284–311):

- **Phase 1 — Define Constraints:** Scale & load, budget, time to ship, data sensitivity, team skills
- **Phase 2 — Architecture Discovery:** Vector DB, embeddings, chunking, retrieval, answer generation, framework
- **Phase 3 — Post-Stack Refinement:** Failure modes, evaluation, optimization, observability, deployment

Document the decisions made for Legacy Lens (pgvector, OpenAI embeddings, tree-sitter chunking, hybrid retrieval, etc.).

### 2. RAG Architecture Doc

**Path:** `docs/submission/rag-architecture.md`

**Content (1–2 pages):** Expand [plan/02-architecture.md](../plan/02-architecture.md) to cover:

- Vector DB selection (pgvector rationale)
- Embedding strategy (model, dimensions, caching)
- Chunking approach (tree-sitter, symbol types)
- Retrieval pipeline (FTS + vector, merge, rerank, profiles)
- Failure modes (empty retrieval, hallucination mitigation)
- Performance results (query latency, retrieval precision if measured)

### 3. AI Cost Analysis

**Path:** `docs/submission/ai-cost-analysis.md`

**Content:** Table and assumptions:

| Users   | Cost   |
| ------- | ------ |
| 100     | $___   |
| 1,000   | $___   |
| 10,000  | $___   |
| 100,000 | $___   |

**Track:**

- Embedding API costs (per chunk, per query)
- LLM costs (per answer, tokens)
- Vector DB costs (Railway Postgres)
- Total dev spend (optional)

**Include assumptions:** Queries per user per month, chunks per query, tokens per answer, etc.

---

## Acceptance Criteria

1. `docs/submission/pre-search.md` exists and covers all three phases
2. `docs/submission/rag-architecture.md` exists and covers all required sections
3. `docs/submission/ai-cost-analysis.md` exists with filled table and assumptions

---

## Files To Create

- `docs/submission/pre-search.md`
- `docs/submission/rag-architecture.md`
- `docs/submission/ai-cost-analysis.md`

---

## Non-Goals

- No code changes
- No automated cost tracking (manual estimates acceptable)
