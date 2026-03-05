# Legacy Lens

**Live app:** [https://legacy-lens-production-aab7.up.railway.app/](https://legacy-lens-production-aab7.up.railway.app/)

Legacy Lens is a RAG-powered assistant for the original Doom (1993) C source code. Ask questions in natural language and get answers grounded in the codebase, with citations to specific files and line ranges.

## What it does

- **Natural language Q&A** — Ask things like "Where is the rendering loop?" or "How does the player move?" and receive answers backed by retrieved source excerpts.
- **Grounded answers** — All answers cite `file_path:start_line-end_line`; the model is instructed not to invent symbols or line numbers.
- **Hybrid search** — Combines vector similarity (embeddings) with full-text search for better retrieval.
- **Interactive & Deep modes** — Interactive for fast queries; Deep expands the query and retrieves more context for complex questions.

**Example eval report:** [eval-report.md](eval-report.md)

## Tech stack

- **Vector DB:** pgvector (Postgres)
- **Embeddings:** OpenAI text-embedding-3-small
- **LLM:** gpt-4.1-nano
- **Chunking:** tree-sitter (syntax-aware, function/struct/typedef boundaries)
- **Deployment:** Railway
