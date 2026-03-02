---
name: codebase-qa-grounded
description: Answer "How does X work?" questions about the Doom codebase with grounded explanations and citations. Use when the user asks how something works, what a function does, or how a system operates.
---

# Codebase Q&A (Grounded)

**Use when:** "How does X work?"

## Steps

1. Retrieve top 5–10 chunks (functions + headers)
2. Identify the *entrypoint* and *call chain*
3. Explain in 5–10 bullets
4. Provide citations for each key step (`path:line-line`)
5. Offer "open these 2 files next" if more depth needed
