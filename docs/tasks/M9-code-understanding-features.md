# M9 — Code Understanding Features

## Goal

Implement 4+ Code Understanding features per REQUIREMENTS.md (lines 147–158).

The project already provides **Code Explanation** via LLM answers. Add at least 3 more:

- Dependency Mapping
- Pattern Detection
- Impact Analysis
- Documentation Generation
- Translation Hints
- Bug Pattern Search
- Business Logic Extraction

---

## Dependencies

Requires:

- M4 completed (LLM answers)
- M6 completed (UI)

---

## Feature Definitions

### 1. Dependency Mapping

**Query:** "What are dependencies of P_PlayerThink?" / "What does R_RenderPlayerView call?"

**Approach:** Use retrieval to find the target symbol and related chunks; LLM infers call graph, includes, and data flow from context. Return structured list (callers, callees, includes).

### 2. Pattern Detection

**Query:** "Find error handling patterns" / "Show me file I/O usage"

**Approach:** Retrieval for chunks matching pattern keywords; LLM summarizes recurring patterns across the codebase.

### 3. Impact Analysis

**Query:** "If I change P_DamageMobj, what is affected?"

**Approach:** Retrieval for callers and callees of the symbol; LLM summarizes impact scope (files, functions, systems).

### 4. Documentation Generation

**Query:** "Generate documentation for P_MovePlayer"

**Approach:** Retrieval for the function chunk + surrounding context; LLM outputs docstring (params, return, behavior) in a standard format.

---

## Implementation Options

**Option A — Prompt variants:** Extend `/api/ask` with optional `intent` or `mode` parameter. System prompt varies by mode.

**Option B — Dedicated endpoints:** Add `/api/dependencies`, `/api/patterns`, etc. Each has a focused prompt.

**Option C — Single endpoint, inferred intent:** LLM infers intent from query; no API changes. Add mode toggle in UI for explicit selection.

Recommend **Option A** for minimal API surface and reuse of retrieval pipeline.

---

## Acceptance Criteria

1. At least 4 Code Understanding features work end-to-end (CLI or UI)
2. Each feature returns grounded answers with citations
3. Dependency Mapping returns structured call graph info
4. Pattern Detection returns summarized patterns with file refs
5. Impact Analysis returns affected symbols/files
6. Documentation Generation returns valid docstring format

---

## Files To Create/Modify

- `src/llm/prompts.ts` or mode-specific prompt modules
- `src/server/index.ts` — optional `mode` in `/api/ask` body
- `src/server/html.ts` — mode selector (optional)
- `src/cli/ask.ts` — support `--mode` flag

---

## Non-Goals

- No static analysis (e.g., real call graph); retrieval + LLM only
- No multi-repo support

---

## Verification

Run golden queries for each feature:

- "What are dependencies of P_PlayerThink?"
- "Find error handling patterns in the codebase"
- "If I change P_DamageMobj, what is affected?"
- "Generate documentation for P_MovePlayer"
