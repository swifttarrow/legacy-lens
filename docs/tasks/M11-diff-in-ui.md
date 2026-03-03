# M11 — Diff in UI

## Goal

Expose the diff feature (M5) in the web UI so users can request code changes and view unified diffs without using the CLI.

---

## Dependencies

Requires:

- M5 completed (Diff output)
- M6 completed (Minimal UI)

---

## Requirements

### API

- Add `POST /api/diff` endpoint
- Request body: `{ query: string, profile?: "interactive" | "deep" }`
- Response: `{ diff: string }` or `{ error: string }` when `# CANNOT_DIFF`
- Reuse `generateDiff` from `src/llm/diff.ts`

### UI

- Add "Suggest change" or "Edit" mode/mode toggle
- When in diff mode, user enters a change request (e.g., "Refactor damage calculation to use a helper function")
- Response displays the unified diff in a monospace block
- "Copy to clipboard" button for the diff
- Clear indication when diff cannot be generated (e.g., no relevant chunks, file too large)

---

## Acceptance Criteria

1. `POST /api/diff` returns valid unified diff for supported requests
2. `POST /api/diff` returns error object when `# CANNOT_DIFF`
3. UI has a way to enter diff requests and display the result
4. User can copy the diff to clipboard

---

## Files To Create/Modify

- `src/server/index.ts` — add `/api/diff` route
- `src/server/html.ts` — add diff mode UI, copy button

---

## Non-Goals

- No automatic patch application
- No commit creation
- No new file creation (M5 scope unchanged)

---

## Verification

1. In UI, request: "Add a comment above P_DamageMobj explaining the damage formula"
2. Verify diff is displayed and can be copied
3. Run `git apply` on copied diff in Doom repo — should apply cleanly
