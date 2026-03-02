# M1 — Syntax-Aware Chunking (Pinned Doom Source)

## Goal

Parse the pinned Doom repository and extract structured chunks using tree-sitter.

Chunks must be generated ONLY from the locally synced Doom repository.

Ingestion must be deterministic and read-only with respect to the Doom repo.

---

## Repo Source Rules

Chunks are generated from:

DOOM_REPO_DIR (default: ./vendor/doom)

The Doom repo must already exist and be pinned via:

pnpm doom:sync

The ingestion command must:

- NOT clone
- NOT fetch
- NOT checkout
- Only read files from DOOM_REPO_DIR
- Fail fast if DOOM_REPO_DIR does not exist

---

## Chunk Extraction Requirements

Use tree-sitter (C grammar) to extract:

- Functions
- Structs
- Enums
- Typedefs
- Global variables

Each chunk must include metadata:

- file_path (relative to DOOM_REPO_DIR)
- symbol_name
- symbol_type
- start_line
- end_line
- content
- chunk_hash (stable hash of content)
- repo_ref (actual git commit hash at ingest time)

`repo_ref` must be retrieved via:

git rev-parse HEAD

and stored for each chunk OR stored once in a builds table referenced by chunks.

---

## CLI Command

Implement:

pnpm ingest:chunks

This command must:

1. Validate DOOM_REPO_DIR exists
2. Read current commit hash
3. Parse all .c / .h files
4. Extract structured chunks
5. Insert into database

---

## Acceptance Criteria

1. `pnpm ingest:chunks` runs successfully
2. chunks table is populated
3. Each chunk contains:
   - symbol_name
   - file_path
   - start_line
   - end_line
   - repo_ref
4. `repo_ref` matches the commit returned by:

   cd vendor/doom  
   git rev-parse HEAD  

5. At least 100+ function chunks exist (sanity check)

---

## Files To Create

- src/ingest/parse.ts
- src/ingest/hash.ts
- src/ingest/store.ts
- src/cli/ingest-chunks.ts

---

## Non-Goals

- No embeddings
- No vector index usage
- No retrieval
- No LLM integration
- No UI

---

## Verification

After running:

pnpm doom:sync  
pnpm ingest:chunks  

Run:

SELECT COUNT(*) FROM chunks;  

Run:

SELECT symbol_name, file_path  
FROM chunks  
WHERE symbol_type = 'function'  
LIMIT 10;  

Run:

SELECT DISTINCT repo_ref FROM chunks;  

The repo_ref must match:

cd vendor/doom  
git rev-parse HEAD  

If all checks pass, M1 is complete.