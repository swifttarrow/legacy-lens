# Pre-Search Checklist — Legacy Lens

**Related:** [RAG Architecture](rag-architecture.md) | [AI Cost Analysis](ai-cost-analysis.md)

## Phase 1 — Define Constraints

### Scale & Load
- **Dataset:** ~2,000 code chunks extracted from the original Doom C source (~70K lines across 146 files). Static corpus; no ongoing ingestion.
- **Query volume:** Low — personal/demo usage. No SLA requirement. Interactive queries should respond within 3–6 seconds end-to-end (retrieval + LLM stream).
- **Concurrency:** Single-node; no horizontal scaling needed for this scope.

### Budget
- **Ingestion (one-time):** ~$0.01 (embedding ~600K tokens at text-embedding-3-small pricing).
- **Runtime:** ~$0.001–$0.002 per query (LLM + embedding). See `ai-cost-analysis.md` for full breakdown.
- **Infrastructure:** Railway Postgres + Node service, ~$10–15/month.
- **Hard limit:** Minimize per-query cost; no GPT-4-class model unless justified.

### Time to Ship
- Iterative milestones (M0–M11). Each milestone is independently shippable. No big-bang release.

### Data Sensitivity
- Source corpus is fully public (id-Software/DOOM, GPL-licensed). No PII. No access control needed.
- API keys managed via environment variables; never committed.

### Team Skills
- Solo TypeScript/Node developer. Familiarity with Postgres, OpenAI API, basic NLP.
- Prefer well-documented libraries with prebuilt binaries (tree-sitter native modules).

---

## Phase 2 — Architecture Discovery

### Vector Database
**Decision: Postgres + pgvector**

Alternatives considered:
| Option | Verdict |
|---|---|
| Pinecone / Weaviate | Rejected — adds external dependency, cost, and network latency |
| Qdrant (local) | Viable but another process to manage |
| pgvector | Chosen — same Postgres instance already used for chunks table; zero extra ops |

pgvector provides cosine similarity search and HNSW indexing. Sufficient for ~2K vectors.

### Embeddings
**Decision: OpenAI `text-embedding-3-small` (1536 dimensions)**

- $0.02/1M tokens — cheapest OpenAI embedding model.
- 1536 dims fits pgvector well; no dimensionality reduction needed at this scale.
- Embeddings cached in DB (`embedding` column); re-embedding only needed if corpus changes.
- Batch size: 100 chunks per API call to reduce round-trips.

### Chunking
**Decision: tree-sitter C grammar, symbol-level chunks**

- Extracts `function_definition`, `struct_specifier`, `enum_specifier`, `typedef_declaration`, global variables.
- Each chunk = one named symbol. Preserves semantic boundaries; avoids mid-function splits.
- `chunk_hash` (SHA-256 of content) enables idempotent re-ingest with `ON CONFLICT DO NOTHING`.
- `bufferSize` patched to `max(source.length * 2, 32K)` to handle large static initializers in Doom (e.g., `tables.c`, `info.c`).

### Retrieval
**Decision: Hybrid — FTS (Postgres GIN) + vector (pgvector cosine) → RRF merge**

- FTS augmented: camelCase and underscore splits on `symbol_name` so "render" matches `R_RenderPlayerView`.
- Two-pass FTS: strict AND query first; falls back to OR if results < limit/3.
- Identifier boost (1.5×) for tokens that look like C identifiers (underscore, mixed-case, all-caps).
- RRF (Reciprocal Rank Fusion, k=60) merges FTS and vector rank lists without score normalization issues.
- **Interactive profile:** top-10 chunks, SEARCH_LIMIT=30 per source.
- **Deep profile:** multi-query expansion (4 variants) + top-20, SEARCH_LIMIT=60 per source.

### Answer Generation
**Decision: OpenAI `gpt-4.1-nano`, streaming**

- 128K context window; ample for 10–20 retrieved chunks (capped at 2000 chars each).
- Streaming via SSE so users see tokens as they arrive.
- System prompt enforces citation format (`file:start-end`) and no fabrication.
- 8 analysis modes (explain, dependencies, patterns, impact, docs, translation, bugs, logic) via mode-specific system prompts.

### Framework
**Decision: No RAG framework; direct API calls**

- LangGraph was evaluated but adds complexity for a single-corpus, single-user app.
- Retrieval pipeline implemented in ~200 lines of typed TypeScript. Easier to debug and tune.

---

## Phase 3 — Post-Stack Refinement

### Failure Modes
| Mode | Mitigation |
|---|---|
| Zero retrieval results | LLM prompt instructs it to ask a clarifying question instead of hallucinating |
| Truncated chunks | Large chunks capped at 2000 chars with `// ... (truncated)` marker |
| Embedding API outage | Queries fall back to FTS-only (vector search just returns empty) |
| LLM hallucination | System prompt: "Never invent symbol names or file paths not present in excerpts" |
| Directory traversal (file API) | `path.resolve` + strict prefix check before serving any file |

### Evaluation
- Golden query set: `tests/fixtures/retrieval_cases.json` — 5 canonical Doom queries with expected top symbol.
- `pnpm test:retrieval` prints ranked results; manually verified that key symbols appear in top-10.
- No automated precision/recall scoring (out of scope for this project scale).

### Optimization
- HNSW index (`vector_cosine_ops`) for sub-linear ANN search — overkill at 2K vectors but production-ready.
- GIN index on augmented tsvector expression.
- Per-query embedding cached implicitly (same query string → same embedding, but no explicit client-side cache).

### Observability
- Server logs query, profile, and mode to stdout on each request.
- Retrieval count sent to client in `retrieved` SSE event.
- No distributed tracing (single process).

### Deployment
- Containerized with single-stage Dockerfile (`node:22-slim`, pnpm, `tsc`, `node dist/server/index.js`).
- Deployed to Railway. Environment variables: `DATABASE_URL`, `OPENAI_API_KEY`, `PORT` (auto-set by Railway).
- Corpus ingested locally against the Railway Postgres URL; no ingest pipeline needed at runtime.
- `railway.toml` configures Dockerfile builder, health check (`GET /`), and restart-on-failure policy.
