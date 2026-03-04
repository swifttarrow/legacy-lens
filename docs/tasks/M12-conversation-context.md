# M12 — Conversation Context

## Goal

Support multi-turn conversation so the LLM understands references to earlier messages. If the user says "explain that function in more detail" or "what about the other file I mentioned?", the assistant can resolve the referent from prior context.

---

## Dependencies

Requires:

- M4 completed (LLM answers)
- M6 completed (UI)

---

## Requirements

### API

- Extend `POST /api/ask` to accept optional `history` in the request body
- Request body shape: `{ query: string, profile?: string, mode?: string, history?: Array<{ role: "user" | "assistant", content: string }> }`
- When `history` is present, prepend it to the messages sent to the LLM (after system, before current user message)
- Limit history length to control cost (e.g., last N turns or max tokens)

### LLM

- `answerStream` accepts optional `history` parameter
- Messages array: `[system, ...history, currentUserMessage]`
- Current user message still includes retrieved chunks + query as today

### UI

- Maintain conversation history in client state (or sessionStorage)
- On each new user message, send prior user/assistant pairs as `history`
- Display conversation as a scrollable thread (user bubbles, assistant bubbles)

---

## Acceptance Criteria

1. `POST /api/ask` accepts `history` and forwards it to the LLM
2. Follow-up questions like "explain that in more detail" or "what about the damage formula?" are answered correctly when prior context is provided
3. History is truncated to avoid excessive token usage (configurable limit)
4. UI shows a coherent conversation thread when history is used

---

## Implementation Notes

- **Cost**: More turns = more tokens. Default to a small window (e.g., last 4–6 messages) unless user opts into deeper context.
- **Retrieval**: Current query is still used for retrieval; history is for LLM context only. Optionally, future work could use history to expand/refine the retrieval query.
- **Grounding**: Answers must still cite retrieved chunks. History helps resolve "that" / "it" / "the function" but does not replace retrieval.

---

## Files To Create/Modify

- `src/server/index.ts` — add `history` to AskSchema, pass to `answerStream`
- `src/llm/answer.ts` — accept `history`, build messages array with prior turns
- `src/server/html.ts` — maintain and send conversation history, thread UI
- `src/cli/ask.ts` — optional `--history` or interactive REPL mode (stretch)

---

## Non-Goals

- Persistent conversation storage (DB)
- Conversation IDs or session management
- Using history to modify retrieval (out of scope for M12)

---

## Verification

1. Ask: "Where is P_DamageMobj defined?"
2. Follow up: "Explain the damage formula in that function."
3. Verify the assistant answers about P_DamageMobj's damage logic and cites the correct file.
4. Without history, the same follow-up would be ambiguous; with history, it should resolve correctly.
