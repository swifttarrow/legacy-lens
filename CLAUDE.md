# CLAUDE.md

## Project Overview
This project builds a retrieval-augmented assistant over the original Doom source code.

Stack:
- TypeScript (Node)
- Postgres + pgvector
- tree-sitter for parsing
- OpenAI API for embeddings + chat

## Constraints
- Optimize for minimal cost.
- Do not introduce unnecessary dependencies.
- Keep architecture simple.
- Do not refactor unrelated files.

## Coding Style
- Strict TypeScript.
- Small modular functions.
- Avoid magic constants.
- Explicit types preferred over inference.

## When Making Changes
- Only modify files necessary for the task.
- Explain reasoning before large refactors.
- Prefer incremental commits.
- Avoid rewriting working components.

## Retrieval Rules
- Hybrid search: FTS + vector.
- Always preserve metadata.
- Do not change DB schema unless explicitly instructed.

## Diff Mode
- When proposing changes, output unified diffs.
