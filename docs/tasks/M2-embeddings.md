# M2 — Embeddings + pgvector

## Goal
Generate and store embeddings for chunks.

## Acceptance Criteria

1. `pnpm ingest:embed` runs
2. embeddings stored in pgvector column
3. Embedding cache keyed by chunk_hash works

## Files

- src/embeddings/generate.ts
- src/embeddings/cache.ts
- src/cli/ingest-embed.ts

## Non-Goals

- No LLM answering yet

## Verification

SELECT embedding FROM chunks LIMIT 1;