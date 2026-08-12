import type { ScoreboardGame, ScoreboardResponse } from '~/types/mlb'
import { SCOREBOARD_SPORTS, flattenScoreboardGame, mlbFetch, pick, sortScoreboard } from '~/server/utils/mlb'

// GET /api/scoreboard?date=YYYY-MM-DD
// Returns the day's games — MLB plus the Mexican leagues (LMB, LMP) — with full
// live quick-state (score, inning, count, outs, runners, current pitcher/batter)
// for games in progress. Defaults to today.
//
// One /schedule call per league (they're separate sportIds), fired in parallel.
// A league that's dark or errors just drops out via allSettled — the board still
// renders for the leagues that answered.
export default defineEventHandler(async (event): Promise<ScoreboardResponse> => {
  const q = getQuery(event)
  const date = typeof q.date === 'string' && q.date ? q.date : today()

  const results = await Promise.allSettled(
    SCOREBOARD_SPORTS.map(sport =>
      mlbFetch<any>('/schedule', {
        sportId: sport.sportId,
        // Narrow the umbrella sports (Independent / Winter) to their Mexican clubs.
        ...(sport.leagueId ? { leagueId: sport.leagueId } : {}),
        date,
        hydrate: 'linescore,team,probablePitcher,broadcasts(all)',
      }).then(raw => ({ raw, sport })),
    ),
  )

  const games: ScoreboardGame[] = []
  for (const r of results) {
    if (r.status !== 'fulfilled') continue
    const { raw, sport } = r.value
    // `dates` is an array (one entry for the requested day, or empty when the
    // league has nothing scheduled). Guard both levels.
    const dates = pick(raw, 'dates', []) as any[]
    for (const d of dates) {
      for (const game of (pick(d, 'games', []) as any[])) {
        games.push(flattenScoreboardGame(game, sport.label))
      }
    }
  }

  return { date, games: sortScoreboard(games) }
})

/** Today's date as YYYY-MM-DD, in the server's local zone. */
function today(): string {
  return new Date().toISOString().slice(0, 10)
}
