# M7 — Railway Deployment

## Goal

Deploy the system to Railway and populate the production index.

---

## Deployment Model

Railway deploy runs:

- API server only

Index population is performed manually.

---

## Production Index Population

You must:

1. Deploy Railway Postgres
2. Obtain DATABASE_URL
3. Run locally:

   DATABASE_URL=<railway_db_url> pnpm doom:sync
   DATABASE_URL=<railway_db_url> pnpm ingest:chunks
   DATABASE_URL=<railway_db_url> pnpm ingest:embed

This populates Railway Postgres.

---

## Acceptance Criteria

1. Public URL accessible
2. Retrieval works
3. LLM answers work
4. Citations visible
5. Interactive + Deep modes both function
6. Railway DB contains chunks + embeddings

---

## Non-Goals

- No automatic ingest on deploy
- No CI pipeline ingest