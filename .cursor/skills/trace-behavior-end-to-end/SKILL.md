---
name: trace-behavior-end-to-end
description: Trace a behavior from trigger to outcome in the Doom codebase. Use when the user asks "when I do X, what happens?" or "how is Y computed?" (e.g., damage, input handling, rendering).
---

# Trace a Behavior End-to-End

**Use when:** "When I shoot, how is damage computed?"

## Steps

1. Find the event trigger (input/command)
2. Follow calls until state mutation
3. List structs/globals involved
4. Note compile-time switches/macros
5. Output a callgraph outline + citations
