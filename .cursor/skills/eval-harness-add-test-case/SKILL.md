---
name: eval-harness-add-test-case
description: Add evaluation test cases to measure assistant improvements. Use when the user wants to add a benchmark, measure recall/latency, or create an eval dataset.
---

# Eval Harness: Add a Test Case

**Use when:** you want to measure improvements

## Steps

1. Convert the user question into:
   - query
   - expected citations (gold files)
   - rubric (faithfulness, usefulness, latency)
2. Add to dataset
3. Run locally
4. Report deltas and failure categories
