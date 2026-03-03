# M8 — Query Interface Enhancements

## Goal

Enhance the query interface to satisfy REQUIREMENTS.md Query Interface section:

- Syntax-highlighted snippets
- Relevance scores
- Drill-down to full file

---

## Dependencies

Requires:

- M6 completed (Minimal UI)
- M7 completed (deployment)

---

## Requirements

### 1. Syntax-Highlighted Snippets

- Add client-side syntax highlighting for C code in inline code blocks and citation previews
- Options: Prism.js, highlight.js, or shiki (minimal bundle)
- Apply to `<code>` blocks and any code shown in the answer output

### 2. Relevance Scores

- Return retrieved chunks (with scores) in the SSE stream alongside the answer
- Add `retrieved` event payload: `{ type: "retrieved", chunks: [{ file_path, symbol_name, start_line, end_line, score }], count }`
- UI: optionally show a collapsible "Retrieved chunks" panel with scores (e.g., "0.87", "0.82")

### 3. Drill-Down to Full File

- Add `GET /api/file?path=<relative_path>` endpoint
- Serves raw file content from DOOM_REPO_DIR
- Validate path to prevent directory traversal
- UI: "View full file" link on citations that opens a modal or dedicated view with the full file content

---

## Acceptance Criteria

1. Code blocks in answers are syntax-highlighted (C)
2. Retrieved chunks and scores are available in the UI (visible or collapsible)
3. Citations have a "View full file" action that loads and displays the full file
4. `/api/file` returns correct content for valid paths and rejects invalid paths

---

## Files To Create/Modify

- `src/server/index.ts` — add `/api/file` route
- `src/server/html.ts` — add syntax highlighting lib, chunks panel, full-file modal
- Optional: `src/server/file.ts` — file-serving logic

---

## Non-Goals

- No new retrieval logic
- No auth on file endpoint (deployment handles access)

---

## Verification

1. Ask "Where is the rendering loop?" — verify code blocks are highlighted
2. Inspect SSE stream — verify chunks + scores in `retrieved` event
3. Click "View full file" on a citation — verify full file loads
