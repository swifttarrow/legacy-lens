# Architecture

## Storage

Postgres:
- chunks table
- pgvector embedding column
- FTS index

Optional:
- builds table (stores repo_ref per ingest run)

---

## Chunking

tree-sitter C grammar extracts:

- functions
- structs
- enums
- typedefs
- globals

Each chunk stores:

- file_path
- symbol_name
- symbol_type
- start_line
- end_line
- content
- chunk_hash
- repo_ref

---

## Retrieval Profiles

### Interactive (default)

1. Identifier heuristic
2. FTS retrieval
3. Vector retrieval
4. Merge + dedupe
5. Lightweight rerank
6. Top-k = 10

---

### Deep Mode

Adds:

- Multi-query expansion
- Larger candidate pool
- Stronger rerank
- Larger context window

---

## LLM

- OpenAI
- Streaming enabled
- Must cite file_path + line ranges
- Must output unified diff when proposing changes

---

## Deployment

- Railway Postgres
- Railway Node service
- Manual ingest into Railway DB
- Minimal UI