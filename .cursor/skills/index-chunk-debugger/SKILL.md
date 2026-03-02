---
name: index-chunk-debugger
description: Debug retrieval and chunking issues when search results feel wrong. Use when retrieval returns irrelevant results, chunks are poorly bounded, or embedding quality is suspect.
---

# Index/Chunk Debugger

**Use when:** retrieval feels wrong

## Steps

1. Inspect chunk boundaries and metadata (file path, symbols, language)
2. Verify embedding input (code-only vs code+comments)
3. Check recall with keyword search baseline
4. Propose revised chunking rules
5. Re-index only affected files
