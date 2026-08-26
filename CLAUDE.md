# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Geek Promos monitors deals on books and pop-culture products (books, collectibles, board/card games) on marketplaces (Mercado Livre and Amazon; Shopee planned) and pushes new offers to Telegram and WhatsApp (Evolution API). It's a pnpm/Turborepo monorepo with a single app today: `apps/api`.

## Commands

Run from repo root unless noted. Turborepo fans these out to workspaces (currently just `api`).

- `pnpm install` — install deps; also run `npx playwright install chromium` once inside `apps/api` (browser binaries aren't fetched automatically outside Docker)
- `pnpm dev` — run all apps in dev mode (turbo) → for `api`: `tsx watch src/server.ts`
- `pnpm build` — `tsc` build
- `pnpm lint` / `pnpm typecheck` — both run `tsc --noEmit` in `api` (there is no separate linter)

Inside `apps/api`:
- `pnpm test` — run vitest (`vitest run`)
- `pnpm test -- <file>` or `npx vitest run <path>` — run a single test file, e.g. `npx vitest run src/services/scraping/mercado-livre.service.test.ts`
- `pnpm scrape` — run the Playwright scraper once (`tsx src/run-scraper.ts`)
- `pnpm check-promotions` — run the full check-promotions job once (scrape/fetch → upsert → dispatch), same logic the cron runs
- `pnpm ml:oauth` — interactive OAuth setup for the Mercado Livre API (`src/scripts/ml-oauth-setup.ts`), writes tokens into the root `.env`
- `pnpm test-send` — manually trigger a notifier send for debugging
- `pnpm codegen` — Playwright codegen, useful when marketplace selectors change
- `npx prisma migrate dev` / `npx prisma generate` — schema changes (Prisma client output is `apps/api/generated/prisma`, not the default location)

Docker: `docker-compose.dev.yml` runs `api-dev` for local dev; `apps/api/Dockerfile` is the production build (multi-stage, installs Playwright's Chromium in the runtime image). `docker-compose.dev.yml` doesn't define its own `postgres` service — it depends on the one in `docker-compose.yml` — so start both files together:
```
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d api-dev postgres
```
There's a single `.env`/`.env.example` at the repo root — used by Docker Compose for `${VAR}` substitution (both compose files) and `env_file` (`api-dev`), and loaded by the Node code itself via `src/load-env.ts` (resolves the root `.env` from the importing file's own location with `import.meta.dirname`, not from `process.cwd()`, so it works the same whether a script runs from the repo root or from `apps/api`). Without it, required vars like `TELEGRAM_BOT_TOKEN`/`ML_CLIENT_ID`/`MATT_TOOL` are missing, `config.ts` exits on invalid env, and the container crash-loops silently (scheduler never starts).

## Architecture

Everything lives in `apps/api/src`. Flow for the core feature (scrape → notify):

1. **`scheduler/cron.ts`** — `node-cron` fires every 10 minutes, calling `jobs/check-promotion.job.ts`.
2. **`jobs/check-promotion.job.ts`** — orchestrates: fetch offers, `prisma.product.upsert` (keyed on `[store, externalId]`), then `dispatchOffer` per product.
3. **`services/scraping/`** — two independent ways to get Mercado Livre offers, both producing the same `ScrapedOffer` shape:
   - `mercado-livre.service.ts` — Playwright scraper (playwright-extra + stealth plugin) that hits the public search/deals page and parses HTML cards. Has anti-bot measures (rotating UA, image/font blocking, retry-with-backoff, block-page detection) since it's scraping without an API key.
   - `mercado-livre-api.service.ts` — official Mercado Livre API search, requires OAuth token from `services/ml-auth/`. Reuses helpers (`computeDiscountPercent`, `dedupeByExternalId`) from the Playwright service module.
   - Both wrap product links with affiliate params (`matt_word`/`matt_tool`).
   - `run-scraper.ts` / `run-check-promotions.ts` are standalone entry points for manually invoking these outside the cron.
4. **`services/ml-auth/`** — Mercado Livre OAuth: `oauth.ts` does the token exchange/refresh HTTP calls, `token-store.ts` holds tokens in memory (seeded from env) and persists refreshed tokens back to the root `.env` via `env-file.ts`. `ml-oauth-setup.ts` is the one-time interactive flow to obtain the first token pair.
5. **`services/offer-dispatcher.ts`** — for each configured `Notifier`, checks `offer-repository.ts` (`isOfferAlreadySent`, dedup window from `OFFER_DEDUP_DAYS`) before sending, then records the send in `SentOffer`. Dedup is per `(product, platform)`, not global, so the same offer can go to Telegram and WhatsApp independently.
6. **`services/notifiers/`** — `Notifier` interface (`platform`, `channelId`, `send(offer)`); `index.ts#createNotifiers()` builds the active list — Telegram always, Evolution (WhatsApp) only if all `EVOLUTION_*` env vars are set (checked in `config.ts#resolveEvolutionConfig`). `format.ts` builds the outgoing message text/layout shared by notifiers.
7. **`lib/prisma.ts`** — shared Prisma client singleton, using the `@prisma/adapter-pg` driver adapter.

Config (`config.ts`) is a single Zod-validated object built from `process.env` at import time and exported as `config`; the app exits on invalid env rather than failing later. Add new env vars to the schema there (and to the root `.env.example`).

Prisma schema (`apps/api/prisma/schema.prisma`): `Product` (unique on `[store, externalId]`) has many `SentOffer` (per platform/channel send record). Generated client output is customized to `apps/api/generated/prisma` — import types from there (e.g. `../../generated/prisma/client.js`), not `@prisma/client`.

## Notes

- Everything is ESM (`"type": "module"`); local imports use explicit `.js` extensions even though source is `.ts`.
- Tests are colocated (`*.service.test.ts` next to the module) and run with vitest.
- The repo is bilingual: log messages and env-var defaults (search keywords) are in Portuguese; code/identifiers are in English.
