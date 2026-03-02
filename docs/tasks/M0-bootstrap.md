# M0 — Bootstrap Environment + Doom Source Sync

## Goal

Set up the local development environment and establish a deterministic, pinned Doom source repository for ingestion.

The Doom source must:
- Be cloned locally (not a submodule)
- Be pinned to a specific commit or tag
- Be synced manually via a CLI command
- Never auto-update during ingestion

This milestone establishes reproducibility.

---

## Doom Source Configuration

Environment variables:

- DOOM_REPO_URL  
- DOOM_REPO_REF  
- DOOM_REPO_DIR (default: ./vendor/doom)

Example `.env`:

DOOM_REPO_URL=https://github.com/id-Software/DOOM.git  
DOOM_REPO_REF=master  
DOOM_REPO_DIR=./vendor/doom  

(You may replace `master` with a specific commit hash for reproducibility.)

---

## Required Commands

You must implement:

pnpm doom:sync

This command must:

1. Clone DOOM_REPO_URL into DOOM_REPO_DIR if it does not exist
2. Fetch latest from origin
3. Checkout DOOM_REPO_REF
4. Print:
   - Repo URL
   - Checked-out commit hash
   - Local path

This command is the ONLY mechanism allowed to modify the Doom repo directory.

---

## Database Setup

You must also:

- Set up Postgres via Docker
- Enable pgvector extension
- Confirm database connectivity from TypeScript

---

## Acceptance Criteria

1. Docker Postgres container is running
2. pgvector extension is enabled
3. TypeScript app connects to Postgres successfully
4. `pnpm doom:sync` clones and checks out the pinned Doom repo
5. Running:

   cd vendor/doom  
   git rev-parse HEAD  

   prints the exact commit matching DOOM_REPO_REF

---

## Files To Create

- docker-compose.yml
- src/db/client.ts
- src/doom/sync.ts
- src/cli/doom-sync.ts
- .env.example

---

## Non-Goals

- No chunking yet
- No embeddings yet
- No ingestion yet
- No schema beyond basic connectivity

---

## Verification Steps

Run:

docker ps  

Then:

psql -c "CREATE EXTENSION vector;"

Then:

pnpm doom:sync  

Then:

cd vendor/doom  
git rev-parse HEAD  

The printed commit must match DOOM_REPO_REF.