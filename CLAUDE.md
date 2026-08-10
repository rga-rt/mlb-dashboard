# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # dev server at http://localhost:3000
npm run build      # production build
npm run preview    # preview the production build
npm run generate   # static generation
npm run lint       # eslint (npm run lint:fix to autofix)
npm test           # vitest run (npm run test:watch for watch mode)
npx vitest run test/mlb.test.ts   # a single test file
```

Type-check with `npx vue-tsc --noEmit`.

Requires Node 18.18+ (Node 20+ recommended). ESLint is pinned to v9 and the
flat config polyfills `Object.groupBy` for Node 20 — see `eslint.config.mjs`.
Tests are plain Vitest unit tests over the pure utilities (`test/`); the HTTP
route handlers aren't unit-tested (they need the Nitro runtime).

## Architecture

Nuxt 3 + Tailwind v4 dashboard reading the public (undocumented) MLB Stats API.

**Server-proxy pattern is the core design.** The browser never calls MLB directly — every request goes through a Nitro server route under `server/api/`. Two reasons this is non-negotiable:
1. `statsapi.mlb.com` doesn't reliably send CORS headers, so a direct browser `fetch` fails; server-side there's no such restriction.
2. Server routes flatten MLB's deeply nested JSON into the flat shapes in `types/mlb.ts` before it reaches the client.

When adding a feature that needs MLB data, add a `server/api/*.get.ts` route that proxies and flattens — do not fetch MLB from a component or page.

**Shared server helpers live in `server/utils/mlb.ts`** (auto-imported by Nitro):
- `mlbFetch(path, query)` — the only place that hits the MLB base URL; sends the UA header.
- `pick(obj, key, fallback)` — safe nested-field reader. Use it for every field pulled off an MLB response; the API's shape is unstable and `pick` returns the fallback instead of throwing when a field goes missing. Persistent breakage from an API change is fixed by adjusting the relevant server route, not the client.
- `DIVISIONS` — hard-coded division id → name/league map, so standings calls don't hydrate division names.
- `currentSeason()` — every route accepts an optional `?season=YYYY` defaulting to this.

**Config:** The MLB base URL is in `runtimeConfig.mlbBase` (`nuxt.config.ts`), overridable at runtime via `NUXT_MLB_BASE` — don't hard-code the base URL elsewhere.

**Styling:** Tailwind v4 with a scoreboard theme defined via `@theme` tokens in `assets/css/main.css`. Tokens like `--color-field` auto-generate utilities (`bg-field`, `text-field`, `border-field`). Use these semantic tokens (`field`, `panel`, `chalk`, `bulb`, etc.) rather than raw Tailwind colors to keep the ballpark-scoreboard look consistent. The design is dark-mode only (`color-scheme: dark`); amber `bulb` is the single accent color.

## Routes

| Route | Proxies | Returns |
| --- | --- | --- |
| `/api/standings` | `/standings?leagueId=103,104` | 6 divisions, flat records |
| `/api/roster/:id` | `/teams/:id/roster` + `/teams/:id` | flat active roster |
| `/api/player/:id` | `/people/:id?hydrate=stats(...)` | bio + season stat lines |

Pages: `pages/index.vue` (standings board), `pages/team/[id].vue` (roster + player stats).
