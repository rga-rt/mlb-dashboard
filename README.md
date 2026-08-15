# The Scoreboard — MLB Stats Dashboard

[![CI](https://github.com/rga-rt/mlb-dashboard/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/rga-rt/mlb-dashboard/actions/workflows/ci.yml)
![Nuxt](https://img.shields.io/badge/Nuxt-3-00DC82?logo=nuxtdotjs&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-3-4FC08D?logo=vuedotjs&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vitest](https://img.shields.io/badge/tested_with-Vitest-6E9F18?logo=vitest&logoColor=white)

A Nuxt 3 + Tailwind v4 dashboard that reads the public MLB Stats API: live
standings, today's scores, the upcoming schedule, roster transactions, rosters,
and deep player stats — for Major League Baseball **and** the Mexican leagues
(LMB and LMP). Styled like a manual ballpark scoreboard: Green-Monster field
green, chalk text, an amber "lamp" marking each division leader. Server-rendered,
dark-mode only, and bilingual (English / Spanish).

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

| Route         | Page                   | What it is                                                                   |
| ------------- | ---------------------- | --------------------------------------------------------------------------- |
| `/`           | `pages/index.vue`      | Landing page: a front door with a live mini board, live games, and form guide |
| `/standings`  | `pages/standings.vue`  | The full standings board — the six MLB divisions plus the Mexican leagues    |
| `/scoreboard` | `pages/scoreboard.vue` | Live Today: every game on today's card, with live score, inning, count, bases, and an inning-by-inning line score. Self-refreshes every 30s |
| `/upcoming`   | `pages/upcoming.vue`   | The next three days' schedule with probable pitchers and where to watch/listen |
| `/news`       | `pages/news.vue`       | Recent roster moves (trades, signings, call-ups, IL) across the leagues      |
| `/team/:id`   | `pages/team/[id].vue`  | Roster as a lineup card, plus an on-demand player detail panel               |

Spanish is served under `/es/*` (see [Internationalization](#internationalization)).

A few things that cut across pages:

- **Score ticker.** A ribbon board sits under the masthead on every page, drifting
  today's slate by as compact score chits (leader lit amber); hover a chit for a
  quick game peek.
- **My Team's Next 5.** On the landing and the standings board, for any club
  you've pinned (the ★ follow control), a panel shows its next five games with
  the probable-pitcher matchup and a per-game win-odds estimate (log5, from both
  clubs' season records). Centered for a single pin, a grid when you pin more,
  hidden when none. Pins persist in `localStorage`, so it's there when you return.

## How it works

The browser never talks to MLB directly. Nuxt's server routes (Nitro) proxy the
API, which does two things:

1. **Avoids CORS.** `statsapi.mlb.com` doesn't reliably send CORS headers, so a
   direct browser `fetch` can fail. Server-side there's no such restriction.
2. **Flattens the nested JSON** before it reaches the client, using the
   `.get()`-with-default pattern (here `pick()` in `server/utils/mlb.ts`) so a
   missing nested field returns `null` instead of throwing.

The schedule feeds (scoreboard, upcoming, news) fan out one `/schedule` (or
`/transactions`) call per league in parallel and merge the results with
`allSettled`, so a league that's dark or errors just drops out while the rest
still render. The three leagues are MLB (`sportId 1`) plus the two Mexican
leagues, LMB and LMP.

### API routes

Each route proxies the public MLB Stats API and returns a flattened shape from
`types/mlb.ts`. The standings and team/player routes take an optional
`?season=YYYY` (defaults to the current year); the schedule and news feeds take a
date window instead (`?date=` / `?days=`).

| Route                      | Returns                                                              |
| -------------------------- | ------------------------------------------------------------------- |
| `/api/standings`           | Six MLB divisions plus the Mexican leagues, with flat team records  |
| `/api/scoreboard?date=`    | A day's games with live quick-state (score, inning, count, bases, pitcher/batter) and line score |
| `/api/upcoming?days=`      | The next N days' schedule with probables, start times, and TV/radio |
| `/api/news?days=`          | Recent roster transactions across the leagues, grouped by date      |
| `/api/next-five/:id`       | A pinned club's next five games: opponent, probables, log5 win-odds |
| `/api/roster/:id`          | Flat active roster plus team name and logo                          |
| `/api/team/:id`            | Club info and ballpark (venue, dimensions, capacity)                |
| `/api/team-stats/:id`      | Team-wide hitting/pitching lines, for ranking a player              |
| `/api/player/:id`          | Bio plus season stat lines                                          |
| `/api/player-advanced/:id` | Sabermetrics, Statcast expected stats, ZiPS projection              |
| `/api/player-history/:id`  | Season-by-season history, for the trend forecast                    |

### Following teams

Pins are stored in the browser — there's no account or server. `usePinnedTeams`
(`composables/usePinnedTeams.ts`) holds the list as SSR-safe `useState`, and the
`pinnedTeams.client` plugin persists it to `localStorage` (key
`mlb-dashboard:pinned`), reading it back after hydration so there's no
server/client mismatch. Pinning powers the follow-a-team star (a pinned club
floats to the top of its division) and My Team's Next 5.

### Internationalization

English and Spanish via `@nuxtjs/i18n` with the `prefix_except_default`
strategy: English lives at the bare routes, Spanish under `/es/*`. Strings live
in `i18n/locales/{en,es}.json`, and a header switch (`components/LangSwitch.vue`)
cross-links the current page in the other language. Baseball stat abbreviations
(W/L/PCT/GB, ERA, wOBA, and so on) stay universal.

### Layout

```
server/
  utils/mlb.ts               MLB fetch helper, pick(), division map, log5, schedule helpers
  api/
    standings.get.ts
    scoreboard.get.ts        today's games: live quick-state + line score
    upcoming.get.ts          next N days' schedule
    news.get.ts              recent roster transactions
    next-five/[id].get.ts    a pinned club's next five + win-odds
    roster/[id].get.ts
    team/[id].get.ts
    team-stats/[id].get.ts
    player/[id].get.ts
    player-advanced/[id].get.ts
    player-history/[id].get.ts
components/
  SiteMasthead.vue           masthead + primary nav
  SiteTicker.vue             site-wide score ribbon (fetches, renders ScoreTicker)
  ScoreTicker.vue            the drifting ticker + hover peek (presentational)
  GameCard.vue               one game: live state, line score, broadcasts, watch links
  LineScore.vue              inning-by-inning box (runs by inning + R/H/E)
  NextFive.vue               a pinned club's next five games
  DivisionTable.vue          one division panel (sortable, follow-a-team, FLIP reorder)
  HotColdPanel.vue           form guide: hot / cold clubs
  DivisionMatchups.vue       form guide: division races
  TransactionRow.vue         one roster move on the News page
  RosterGroup.vue            a position group in the lineup card
  PlayerStatLine.vue         hitting / pitching stat tables
  PlayerStatusBadge.vue      roster status (IL / Minors / DFA / …)
  AdvancedPanel.vue          sabermetrics + Statcast actual-vs-expected
  TeamRankPanel.vue          where the player ranks on the team
  ForecastSection.vue        trend forecast (ForecastChart draws it)
  ForecastChart.vue
  BallparkPanel.vue          venue facts + outfield-wall diagram
  PanelRetry.vue             on-brand retry affordance for a failed panel
  LangSwitch.vue             English / Spanish toggle
composables/
  usePinnedTeams.ts          followed-teams state (localStorage-backed)
plugins/
  pinnedTeams.client.ts      persists pins to localStorage
layouts/
  default.vue                masthead + ticker + footer shell (the landing renders bare)
pages/
  index.vue                  landing page
  standings.vue              the standings board
  scoreboard.vue             Live Today
  upcoming.vue               upcoming schedule
  news.vue                   roster transactions
  team/[id].vue              roster + player detail
i18n/locales/
  en.json, es.json           UI strings
types/mlb.ts                 shared interfaces (the flattened shapes)
assets/css/main.css          Tailwind v4 import + scoreboard @theme tokens
```

## Notes

- The MLB API is public but officially undocumented; field names or endpoints
  can change. The `pick()` guards keep the app from crashing if a field goes
  missing, but a persistent change may need a tweak in the relevant server route.
- Base URL is in `runtimeConfig.mlbBase`; override with `NUXT_MLB_BASE` if the
  API ever moves.
- Not affiliated with, or endorsed by, MLB or any club — it just reads the
  public Stats API.
- The design is dark-mode only with a single amber accent, and honors
  `prefers-reduced-motion` for the board reorder, the score ticker, and
  player-panel motion.
