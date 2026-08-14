import type { Division, TeamRecord } from '~/types/mlb'

// Recent-form helpers for the Hot/Cold and division-matchup widgets. Pure and
// auto-imported by Nuxt (~/utils).

/** Last-10 winning percentage (0..1); 0 when no games are on record. */
export function lastTenPct(t: TeamRecord): number {
  const g = t.lastTenWins + t.lastTenLosses
  return g > 0 ? t.lastTenWins / g : 0
}

/** Signed streak length: +n for an n-game win streak, -n for a losing one. */
export function streakValue(streak: string): number {
  const n = Number(streak.slice(1)) || 0
  if (streak.startsWith('W')) return n
  if (streak.startsWith('L')) return -n
  return 0
}

/**
 * Rank teams by recent form — last-10 win %, current streak as the tiebreak —
 * and return the hottest and coldest `n`. `cold` is worst-first. When there
 * aren't enough teams to fill both ends without overlap, cold yields to hot so
 * no team appears in both.
 */
export function hotColdTeams(teams: TeamRecord[], n = 5): { hot: TeamRecord[]; cold: TeamRecord[] } {
  const byForm = [...teams].sort((a, b) => {
    const p = lastTenPct(b) - lastTenPct(a)
    if (p !== 0) return p
    return streakValue(b.streak) - streakValue(a.streak)
  })
  const hot = byForm.slice(0, n)
  // Take the tail for cold, but never a team already counted as hot.
  const coldCount = Math.min(n, Math.max(0, byForm.length - hot.length))
  const cold = byForm.slice(byForm.length - coldCount).reverse()
  return { hot, cold }
}

/** A division's leader (rank 1) and runner-up (rank 2); null under two teams. */
export function divisionMatchup(division: Division): { leader: TeamRecord; runnerUp: TeamRecord } | null {
  const byRank = [...division.teams].sort((a, b) => Number(a.divisionRank) - Number(b.divisionRank))
  if (byRank.length < 2) return null
  return { leader: byRank[0], runnerUp: byRank[1] }
}
