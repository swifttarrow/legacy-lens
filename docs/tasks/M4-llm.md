# M4 — LLM + Citations + Streaming

## Goal

Integrate OpenAI for grounded answers using retrieved chunks.

---

## Acceptance Criteria

1. Answers cite file_path + line ranges
2. Streaming works
3. If retrieval returns 0 chunks:
   - Assistant asks clarifying question
   - Does NOT fabricate file locations
4. Every answer:
   - Uses retrieved context only
   - Explicitly signals uncertainty if context incomplete

---

## Verification Checklist

Test 5 golden prompts manually:

- "Where is the rendering loop implemented?"
- "Explain how input events reach gameplay."
- etc.

Verify:

- Citations are present
- Cited files match retrieved chunks
- No fabricated file names

---

## Non-Goals

- No UI
- No deep mode implementation