# The Scoreboard — MLB Stats Dashboard

A Nuxt 3 + Tailwind v4 dashboard that reads live MLB standings, rosters, and
player stats from the public MLB Stats API. Styled like a manual ballpark
scoreboard: Green-Monster field green, chalk text, an amber "lamp" marking each
division leader.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Build for production with `npm run build` and preview with `npm run preview`.

Requires Node 18.18+ (Node 20+ recommended).

## How it works

The browser never talks to MLB directly. Nuxt's server routes (Nitro) proxy the
API, which does two things:

1. **Avoids CORS.** `statsapi.mlb.com` doesn't reliably send CORS headers, so a
   direct browser `fetch` can fail. Server-side there's no such restriction.
2. **Flattens the nested JSON** before it reaches the client, using the
   `.get()`-with-default pattern (here `pick()` in `server/utils/mlb.ts`) so a
   missing nested field returns `null` instead of throwing.

### Routes

| Our route            | Proxies (MLB)                                   | Returns                  |
| -------------------- | ----------------------------------------------- | ------------------------ |
| `/api/standings`     | `/standings?leagueId=103,104`                   | 6 divisions, flat records |
| `/api/roster/:id`    | `/teams/:id/roster` + `/teams/:id`              | flat active roster        |
| `/api/player/:id`    | `/people/:id?hydrate=stats(...)`                | bio + season stat lines   |

All accept an optional `?season=YYYY` (defaults to the current year).

### Layout

```
server/
  utils/mlb.ts        MLB fetch helper, pick(), division id map
  api/standings.get.ts
  api/roster/[id].get.ts
  api/player/[id].get.ts
components/
  DivisionTable.vue   one division panel on the standings board
  PlayerStatLine.vue  hitting / pitching stat tables
pages/
  index.vue           the standings board
  team/[id].vue       roster + player stat panel
types/mlb.ts          shared interfaces (the flattened shapes)
assets/css/main.css   Tailwind v4 import + scoreboard @theme tokens
```

## Notes

- The MLB API is public but officially undocumented; field names or endpoints
  can change. The `pick()` guards keep the app from crashing if a field goes
  missing, but a persistent change may need a tweak in the relevant server route.
- Base URL is in `runtimeConfig.mlbBase` — override with `NUXT_MLB_BASE` if the
  API ever moves.
