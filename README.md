# The Scoreboard — MLB Stats Dashboard

[![CI](https://github.com/rga-rt/mlb-dashboard/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/rga-rt/mlb-dashboard/actions/workflows/ci.yml)
![Nuxt](https://img.shields.io/badge/Nuxt-3-00DC82?logo=nuxtdotjs&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-3-4FC08D?logo=vuedotjs&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vitest](https://img.shields.io/badge/tested_with-Vitest-6E9F18?logo=vitest&logoColor=white)

A Nuxt 3 + Tailwind v4 dashboard that reads live MLB standings, rosters, and
player stats from the public MLB Stats API. Styled like a manual ballpark
scoreboard: Green-Monster field green, chalk text, an amber "lamp" marking each
division leader. Server-rendered, dark-mode only, and bilingual (English /
Spanish).

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Build for production with `npm run build` and preview with `npm run preview`.
Lint with `npm run lint`, type-check with `npx vue-tsc --noEmit`, and run the
unit tests with `npm test`.

Requires Node 18.18+ (Node 20+ recommended).

## Pages

| Route        | Page                  | What it is                                                       |
| ------------ | --------------------- | --------------------------------------------------------------- |
| `/`          | `pages/index.vue`     | Landing page: a front door with a live mini standings board     |
| `/standings` | `pages/standings.vue` | The full standings board, all six divisions                     |
| `/team/:id`  | `pages/team/[id].vue` | Roster as a lineup card, plus an on-demand player detail panel   |

Spanish is served under `/es/*` (see [Internationalization](#internationalization)).

## How it works

The browser never talks to MLB directly. Nuxt's server routes (Nitro) proxy the
API, which does two things:

1. **Avoids CORS.** `statsapi.mlb.com` doesn't reliably send CORS headers, so a
   direct browser `fetch` can fail. Server-side there's no such restriction.
2. **Flattens the nested JSON** before it reaches the client, using the
   `.get()`-with-default pattern (here `pick()` in `server/utils/mlb.ts`) so a
   missing nested field returns `null` instead of throwing.

### API routes

Each route proxies the public MLB Stats API and returns a flattened shape from
`types/mlb.ts`. All accept an optional `?season=YYYY` (defaults to the current
year).

| Route                      | Returns                                                     |
| -------------------------- | ---------------------------------------------------------- |
| `/api/standings`           | Six divisions with flat team records                       |
| `/api/roster/:id`          | Flat active roster plus team name and logo                 |
| `/api/team/:id`            | Club info and ballpark (venue, dimensions, capacity)       |
| `/api/team-stats/:id`      | Team-wide hitting/pitching lines, for ranking a player     |
| `/api/player/:id`          | Bio plus season stat lines                                 |
| `/api/player-advanced/:id` | Sabermetrics, Statcast expected stats, ZiPS projection     |
| `/api/player-history/:id`  | Season-by-season history, for the trend forecast           |

### Internationalization

English and Spanish via `@nuxtjs/i18n` with the `prefix_except_default`
strategy: English lives at the bare routes, Spanish under `/es/*`. Strings live
in `i18n/locales/{en,es}.json`, and a header switch (`components/LangSwitch.vue`)
cross-links the current page in the other language. Baseball stat abbreviations
(W/L/PCT/GB, ERA, wOBA, and so on) stay universal.

### Layout

```
server/
  utils/mlb.ts            MLB fetch helper, pick(), division id map
  api/standings.get.ts
  api/roster/[id].get.ts
  api/team/[id].get.ts
  api/team-stats/[id].get.ts
  api/player/[id].get.ts
  api/player-advanced/[id].get.ts
  api/player-history/[id].get.ts
components/
  DivisionTable.vue       one division panel (sortable, follow-a-team, FLIP reorder)
  RosterGroup.vue         a position group in the lineup card
  PlayerStatLine.vue      hitting / pitching stat tables
  AdvancedPanel.vue       sabermetrics + Statcast actual-vs-expected
  TeamRankPanel.vue       where the player ranks on the team
  ForecastSection.vue     trend forecast (ForecastChart draws it)
  ForecastChart.vue
  BallparkPanel.vue       venue facts + outfield-wall diagram
  PanelRetry.vue          on-brand retry affordance for a failed panel
  LangSwitch.vue          English / Spanish toggle
layouts/
  default.vue             masthead + footer shell (the landing renders bare)
pages/
  index.vue               landing page
  standings.vue           the standings board
  team/[id].vue           roster + player detail
i18n/locales/
  en.json, es.json        UI strings
types/mlb.ts              shared interfaces (the flattened shapes)
assets/css/main.css       Tailwind v4 import + scoreboard @theme tokens
```

## Notes

- The MLB API is public but officially undocumented; field names or endpoints
  can change. The `pick()` guards keep the app from crashing if a field goes
  missing, but a persistent change may need a tweak in the relevant server route.
- Base URL is in `runtimeConfig.mlbBase`; override with `NUXT_MLB_BASE` if the
  API ever moves.
- The design is dark-mode only with a single amber accent, and honors
  `prefers-reduced-motion` for the board reorder and player-panel motion.
