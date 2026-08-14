import type { ScoreboardGame, UpcomingDay, UpcomingResponse } from '~/types/mlb'
import { SCOREBOARD_SPORTS, addScheduleDays, flattenScoreboardGame, mlbFetch, pick, scheduleToday, sortScoreboard } from '~/server/utils/mlb'

// GET /api/upcoming?days=3
// A look-ahead feed: the next N days (today inclusive, default 3) of games —
// MLB plus the Mexican leagues (LMB, LMP) — with probable pitchers, start times,
// and TV/radio broadcasts. Finals are dropped; it's a schedule, not a recap.
//
// One /schedule call per league over the whole date range (parallel, allSettled);
// a league that's dark or errors just drops out. Games are grouped by calendar
// day and each day is sorted (live first, then by start time).
export default defineEventHandler(async (event): Promise<UpcomingResponse> => {
  const q = getQuery(event)
  // Clamp to a sane window so a stray ?days=999 can't fan out a huge range.
  const span = Math.min(Math.max(Number(q.days) || 3, 1), 7)
  const start = scheduleToday()
  const end = addScheduleDays(start, span - 1)

  const results = await Promise.allSettled(
    SCOREBOARD_SPORTS.map(sport =>
      mlbFetch<any>('/schedule', {
        sportId: sport.sportId,
        // Narrow the umbrella sports (Independent / Winter) to their Mexican clubs.
        ...(sport.leagueId ? { leagueId: sport.leagueId } : {}),
        startDate: start,
        endDate: end,
        hydrate: 'linescore,team,probablePitcher,broadcasts(all)',
      }).then(raw => ({ raw, sport })),
    ),
  )

  // Collect games into per-day buckets keyed by the feed's own `date` (YYYY-MM-DD),
  // which is the game's local calendar day.
  const byDate = new Map<string, ScoreboardGame[]>()
  for (const r of results) {
    if (r.status !== 'fulfilled') continue
    const { raw, sport } = r.value
    for (const d of (pick(raw, 'dates', []) as any[])) {
      const date = pick<string>(d, 'date', '') as string
      if (!date) continue
      for (const game of (pick(d, 'games', []) as any[])) {
        const flat = flattenScoreboardGame(game, sport.label)
        if (flat.status === 'final') continue // look-ahead only
        if (!byDate.has(date)) byDate.set(date, [])
        byDate.get(date)!.push(flat)
      }
    }
  }

  const days: UpcomingDay[] = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, games]) => ({ date, games: sortScoreboard(games) }))

  return { start, end, days }
})
