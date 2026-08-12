import type { NewsDay, NewsResponse, Transaction } from '~/types/mlb'
import { SCOREBOARD_SPORTS, flattenTransaction, mlbFetch, pick } from '~/server/utils/mlb'

// GET /api/news?days=3
// Recent roster transactions (all types) over the last N days (default 3,
// clamped 1-7) across MLB and the Mexican leagues (LMB, LMP), grouped by date
// newest-first. One /transactions call per league in parallel; a league that's
// dark or errors just drops out. Each move keeps its ready-made description plus
// player/team ids so the name can link to the player's stats.
export default defineEventHandler(async (event): Promise<NewsResponse> => {
  const q = getQuery(event)
  // Clamp the window: "all transactions" is high-volume, so keep it bounded.
  const span = Math.min(Math.max(Number(q.days) || 3, 1), 7)
  const end = today()
  const start = addDays(end, -(span - 1))

  const results = await Promise.allSettled(
    SCOREBOARD_SPORTS.map((sport) => {
      // /transactions accepts leagueId on its own, which pins the Mexican
      // leagues to their clubs (sportId 23/17 would drag in unrelated
      // independent/winter circuits). MLB has no single leagueId, so use its
      // sportId.
      const query: Record<string, string | number> = { startDate: start, endDate: end }
      if (sport.leagueId) query.leagueId = sport.leagueId
      else query.sportId = sport.sportId
      return mlbFetch<any>('/transactions', query).then(raw => ({ raw, sport }))
    }),
  )

  const byDate = new Map<string, Transaction[]>()
  for (const r of results) {
    if (r.status !== 'fulfilled') continue
    const { raw, sport } = r.value
    for (const tx of (pick(raw, 'transactions', []) as any[])) {
      const flat = flattenTransaction(tx, sport.label)
      if (!flat.date) continue
      if (!byDate.has(flat.date)) byDate.set(flat.date, [])
      byDate.get(flat.date)!.push(flat)
    }
  }

  const days: NewsDay[] = [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a)) // newest day first
    .map(([date, transactions]) => ({ date, transactions }))

  return { start, end, days }
})

/** Today's date as YYYY-MM-DD, in the server's local zone. */
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Add `n` days (may be negative) to a YYYY-MM-DD string, returning YYYY-MM-DD. */
function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
