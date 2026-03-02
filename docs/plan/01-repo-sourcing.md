# Repo Sourcing — Doom

We treat the Doom source as an external git repository cloned locally.

## Configuration

Environment variables:

- DOOM_REPO_URL
- DOOM_REPO_REF
- DOOM_REPO_DIR (default: ./vendor/doom)

Example:

DOOM_REPO_URL=https://github.com/id-Software/DOOM.git
DOOM_REPO_REF=master
DOOM_REPO_DIR=./vendor/doom

For reproducibility, DOOM_REPO_REF should ideally be a specific commit hash.

---

## Sync Mechanism

The only command allowed to modify the Doom repo directory:

pnpm doom:sync

doom:sync must:

1. Clone DOOM_REPO_URL into DOOM_REPO_DIR if missing
2. Fetch origin
3. Checkout DOOM_REPO_REF
4. Print the checked-out commit hash

---

## Ingestion Rules

All ingest commands:

- Must read from DOOM_REPO_DIR
- Must NOT fetch or checkout
- Must record the actual commit hash (`git rev-parse HEAD`) as repo_ref metadata

This guarantees deterministic builds and reproducibility.