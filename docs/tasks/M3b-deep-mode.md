# M3b — Deep Mode Retrieval

## Goal

Implement a "deep" retrieval profile.

Deep mode must:

- Perform multi-query expansion
- Increase candidate pool size
- Apply stronger reranking
- Return more chunks or larger total token size than interactive

---

## Acceptance Criteria

1. retrieve(query, "deep") works
2. Deep profile returns >= interactive chunk count OR higher total tokens
3. For at least one fixture case:
   - Deep profile returns additional relevant chunks
4. `pnpm retrieve --profile deep "<query>"` works

---

## Non-Goals

- No UI changes
- No LLM logic changes beyond profile parameter

---

## Verification

pnpm retrieve --profile interactive "Explain input events reach gameplay"
pnpm retrieve --profile deep "Explain input events reach gameplay"

Compare chunk counts and overlap.