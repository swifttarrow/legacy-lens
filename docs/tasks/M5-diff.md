# M5 — Diff Output (Existing Files Only)

## Goal

Support unified diff suggestions for modifications to existing files only.

This milestone does NOT support:

- Creating new files
- Deleting files
- Renaming files
- Modifying binary files

Only modifications to files that already exist in DOOM_REPO_DIR are in scope.

---

## Acceptance Criteria

1. LLM outputs valid unified diff format:
   - Contains --- and +++ headers
   - Contains @@ hunk headers
2. The diff references an existing file path
3. Running:

   git apply <diff-file>

   applies cleanly without errors
4. The diff modifies only existing files

---

## Verification

1. Ask:

   "Refactor damage calculation to use a helper function."

2. Save diff output to patch.diff
3. Run:

   cd vendor/doom
   git apply patch.diff

4. Confirm:
   - No errors
   - File modified correctly

---

## Non-Goals

- No new file creation
- No automatic patch application
- No commit creation