# Project Overview

We are building a retrieval-augmented AI assistant over the original Doom source code (C + assembly).

The assistant must allow a small team to:

- Ask natural-language questions about the codebase
- Locate where features are implemented
- Explain functions and systems end-to-end
- Suggest patch-style code changes in unified diff format

The system must:

- Use syntax-aware chunking (tree-sitter)
- Use hybrid retrieval (Postgres FTS + pgvector)
- Support two retrieval profiles:
  - Interactive (default)
  - Deep (multi-query + stronger rerank)
- Use OpenAI for answer generation
- Cite file paths and line ranges for all claims
- Be reproducible and deterministic (pinned Doom commit)
- Be deployable to Railway for demo

Constraints:

- Optimize for lowest cost
- No managed vector DB
- Manual ingest (static codebase)
- Milestone-based, verifiable progress
- MVP deadline: Wednesday 10PM

Non-Goals (MVP):

- Automatic patch application
- CI/CD ingestion
- Multi-repo support
- Authentication
- Production-grade UI polish