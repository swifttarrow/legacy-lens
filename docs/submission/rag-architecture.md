# RAG Architecture — Legacy Lens

**Related:** [Pre-Search Checklist](pre-search.md) | [AI Cost Analysis](ai-cost-analysis.md)

## Overview

Legacy Lens is a Retrieval-Augmented Generation (RAG) system over the original Doom (1993) C source code. A user submits a natural-language question; the system retrieves the most relevant source code chunks from a Postgres database, then streams a grounded, cited answer from an LLM.

```
User Query
    │
    ▼
[Embedding]  ──────────────────────────────────┐
    │                                           │
    ▼                                           ▼
[FTS Search]                           [Vector Search]
(Postgres GIN, augmented tsvector)     (pgvector cosine, HNSW)
    │                                           │
    └──────────────┬────────────────────────────┘
                   ▼
           [RRF Merge + Identifier Boost]
                   │
                   ▼
           [Top-K Chunks (10 or 20)]
                   │
                   ▼
           [LLM Answer Stream]
           (gpt-4o-mini, mode-specific prompt)
                   │
                   ▼
           [SSE → Client UI]
```

---

## Vector DB Selection

**Choice: Postgres + pgvector**

The Doom chunk corpus (~1,994 rows) is small enough that the same Postgres instance used for structured storage also serves as the vector store. pgvector provides:

- `vector(1536)` column type with cosine distance operator (`<=>`)
- HNSW index (`vector_cosine_ops`) for approximate nearest-neighbor search
- Exact k-NN when the HNSW index is bypassed (not needed here)

No separate vector database process is required. This keeps the deployment to a single Railway Postgres service and eliminates network hops between the app and vector store.

---

## Embedding Strategy

**Model:** `text-embedding-3-small` (OpenAI)
**Dimensions:** 1536
**Cost:** $0.02 / 1M tokens

### Ingest-time embedding
Each chunk's `content` field is embedded once and stored in the `embedding` column. Re-embedding is skipped for rows where `embedding IS NOT NULL`, enabling idempotent re-ingest. Chunks are batched 100 at a time per API call.

### Query-time embedding
The user's query string is embedded with the same model before vector search. This single API call adds ~10–20ms to retrieval latency.

### Caching
DB-level: embeddings persist across restarts. No in-memory or Redis cache is needed at this traffic level.

---

## Chunking Approach

**Parser:** tree-sitter 0.21.1 + tree-sitter-c 0.21.4 (native prebuilt `.node`)

### Symbol types extracted
| tree-sitter node | Symbol type stored |
|---|---|
| `function_definition` | `function` |
| `struct_specifier` | `struct` |
| `enum_specifier` | `enum` |
| `typedef_declaration` | `typedef` |
| top-level declarators | `global` |

All Doom structs and enums are `typedef`'d, so they appear as `typedef` chunks.

### Chunk schema
```
id, file_path, symbol_name, symbol_type,
start_line, end_line, content, chunk_hash, repo_ref, embedding
```

`chunk_hash` (SHA-256 of `content`) enforces uniqueness; `ON CONFLICT (chunk_hash) DO NOTHING` makes ingest idempotent.

### Large-file handling
A `bufferSize` of `max(source.length * 2, 32K)` is passed to `parser.parse()` to avoid "Invalid argument" errors on files with large static initializers (`tables.c`, `info.c`).

### Results
1,994 unique chunks extracted from 28 Doom C source files; 770 are `function` chunks.

---

## Retrieval Pipeline

### Hybrid retrieval (FTS + vector)

**FTS (Full-Text Search):**
- GIN index on an augmented tsvector that tokenizes `symbol_name` by splitting camelCase and underscores in addition to standard Postgres text tokens.
- Two-pass: strict AND query (`websearch_to_tsquery`) first; falls back to OR if results < limit/3.

**Vector search:**
- Cosine similarity via pgvector HNSW index.
- Query embedding vs. stored chunk embeddings.

**Merge — Reciprocal Rank Fusion (RRF):**
- RRF formula: `score = 1 / (k + rank)`, k=60.
- FTS and vector rank lists merged; chunks appearing in both lists naturally score higher.
- Identifier boost: tokens that look like C identifiers (contains underscore, mixed-case, or all-caps) get a 1.5× RRF score multiplier.

### Retrieval profiles

| Parameter | Interactive | Deep |
|---|---|---|
| Query variants | 1 | 4 (heuristic expansion) |
| SEARCH_LIMIT per source | 30 | 60 |
| TOP_K returned | 10 | 20 |

**Deep mode query expansion** (no LLM call):
1. Original query
2. Dense variant (stop-words stripped)
3. "C function implementation …"
4. "Doom game engine …"

Multi-variant results are flattened before RRF merge; chunks that appear across multiple variants receive a natural rank boost.

---

## Failure Modes

| Failure | Handling |
|---|---|
| Zero retrieval results | System prompt instructs LLM to ask a clarifying question rather than hallucinate |
| Oversized chunks | Truncated to 2,000 chars with `// ... (truncated)` appended |
| LLM fabrication | System prompt: "Never invent symbol names, file paths, or line numbers not in the excerpts" |
| Embedding API outage | Vector search returns empty; FTS results still returned |
| File path traversal (file viewer) | `path.resolve` + strict prefix check against `DOOM_REPO_DIR` |
| Proxy buffering strips SSE | `X-Accel-Buffering: no` header disables nginx buffering on Railway |

---

## Analysis Modes

The system supports 8 LLM analysis modes selected by the user, each with a distinct system prompt:

| Mode | Purpose |
|---|---|
| `explain` | General code explanation with citations |
| `dependencies` | Structured call graph (calls, called-by, data deps, headers) |
| `patterns` | Recurring code patterns across the corpus |
| `impact` | Change impact analysis (callers, affected systems, risk, testing) |
| `docs` | Docstring + markdown summary generation |
| `translation` | Porting hints for modern languages |
| `bugs` | Bug pattern search with severity ratings |
| `logic` | Game/business logic extraction in plain English |

All modes share the same retrieval pipeline; only the system prompt changes.

---

## Performance

| Metric | Observed |
|---|---|
| Ingest (chunks) | ~1,994 chunks from 28 files, <10s |
| Ingest (embeddings) | ~600K tokens, ~20 API calls, <30s |
| Interactive retrieval latency | ~200–400ms (FTS + vector + merge) |
| Total query latency (TTFT) | ~1–2s (retrieval + LLM first token) |
| Golden query precision | Key symbol in top-10 for all 5 canonical test cases |

---

## Deployment

- **Container:** Single-stage Dockerfile, `node:22-slim`, pnpm frozen install, `tsc`, `node dist/server/index.js`.
- **Platform:** Railway — one Postgres service (pgvector/pg16), one Node service.
- **Environment:** `DATABASE_URL`, `OPENAI_API_KEY`, `PORT` (Railway auto-sets PORT).
- **Corpus:** Ingested locally against the Railway Postgres URL prior to launch; no runtime ingest pipeline.
