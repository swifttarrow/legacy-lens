# AI Cost Analysis — Legacy Lens

> **Pricing verified:** March 2025. Check [platform.openai.com](https://platform.openai.com/docs/pricing) for current rates.

## Assumptions

| Parameter | Value | Notes |
|---|---|---|
| Queries per user per month | 10 | Casual usage; developer exploring the codebase |
| Chunks retrieved per query | 10 (interactive) / 20 (deep) | Default interactive profile |
| Avg chunk size (chars) | ~800 chars → ~200 tokens | C code is token-dense (~4 chars/token) |
| Context per query (input) | 10 × 200 + 600 (system prompt + query) = **2,600 tokens** | Conservative estimate |
| Output tokens per answer | **400 tokens** | ~300–500 words of cited explanation |
| Query embedding tokens | **50 tokens** | Short natural-language question |

---

## Model Pricing (OpenAI, 2025)

| Model | Input | Output |
|---|---|---|
| `text-embedding-3-small` | $0.020 / 1M tokens | — |
| `gpt-4.1-nano` | $0.150 / 1M tokens | $0.600 / 1M tokens |

---

## Per-Query Cost Breakdown

| Component | Tokens | Unit cost | Cost per query |
|---|---|---|---|
| Query embedding | 50 | $0.020/1M | $0.0000010 |
| LLM input (context + system prompt) | 2,600 | $0.150/1M | $0.0003900 |
| LLM output (answer) | 400 | $0.600/1M | $0.0002400 |
| **Total per query** | | | **~$0.00063** |

---

## Monthly Cost by User Scale

Assumes 10 queries/user/month and no infrastructure fixed costs beyond Railway.

| Users | Queries/month | AI API cost | Railway infra* | **Total/month** |
|---|---|---|---|---|
| 100 | 1,000 | $0.63 | $15 | **~$16** |
| 1,000 | 10,000 | $6.30 | $15 | **~$21** |
| 10,000 | 100,000 | $63 | $30† | **~$93** |
| 100,000 | 1,000,000 | $630 | $100† | **~$730** |

\* Railway Postgres (pgvector plan) + Node service. Estimate: $10–15/month base; scales with DB size and CPU at higher load.

† At 10K+ users, a dedicated Postgres instance or connection pooler (PgBouncer) would be needed. Estimate adjusted upward.

---

## One-Time Ingest Costs

| Step | Tokens | Cost |
|---|---|---|
| Embed ~2,000 chunks (~300 tokens avg) | ~600,000 | **$0.012** |
| Re-ingest (incremental, only changed chunks) | ~0–50K | **<$0.001** |

Ingest is effectively free. The entire Doom corpus costs less than 2 cents to embed.

---

## Cost Optimization Notes

1. **Embedding model choice:** `text-embedding-3-small` costs 5× less than `text-embedding-3-large` with negligible quality difference at this corpus size.
2. **gpt-4.1-nano vs gpt-4o:** gpt-4o would cost ~20× more per query ($0.013 vs $0.00063). Not justified for a code Q&A over a known, indexed corpus.
3. **Chunk truncation:** Capping chunks at 2,000 chars keeps context tokens bounded. Without truncation, `tables.c` alone could consume 8K+ tokens.
4. **Deep mode cost:** Deep mode doubles chunks (20) and adds 3 extra embedding calls (4 variants − 1). Estimated cost: ~$0.0018/query — still under $0.002.
5. **No streaming cost penalty:** Streaming (`stream: true`) has the same token cost as non-streaming; it only affects time-to-first-token, not billing.

---

## Total Development Spend (Estimated)

| Category | Estimated spend |
|---|---|
| Embedding ingests (multiple re-runs during dev) | ~$0.10 |
| LLM calls during development and testing | ~$1.00 |
| Railway (Postgres + Node, ~1 month) | ~$15 |
| **Total** | **~$16** |

---

## Related docs

- [Pre-Search Checklist](pre-search.md) — constraints and architecture decisions
- [RAG Architecture](rag-architecture.md) — pipeline overview
