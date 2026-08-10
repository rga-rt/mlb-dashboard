import type { PlayerAdvancedResponse } from '~/types/mlb'
import { currentSeason, mlbFetch, pick } from '~/server/utils/mlb'

// Pull the split's stat object for a given stat-type displayName, or null.
function blockOf(raw: any, typeName: string): { season: number, stat: Record<string, string | number> } | null {
  const block = (pick(raw, 'stats', []) as any[])
    .find(b => pick<string>(pick(b, 'type', {}), 'displayName', '') === typeName)
  const split = (pick(block, 'splits', []) as any[])[0]
  if (!split) return null
  return {
    season: Number(pick(split, 'season', 0)),
    stat: pick(split, 'stat', {}) as Record<string, string | number>,
  }
}

// GET /api/player-advanced/592450?group=hitting&season=2026&sportId=1
// Sabermetrics + actual + Statcast expected for the season, plus the ZiPS
// projection. Two calls because projections are forward-looking and drop out
// when a past season is pinned on the same request.
export default defineEventHandler(async (event): Promise<PlayerAdvancedResponse> => {
  const personId = Number(getRouterParam(event, 'id'))
  if (!personId) {
    throw createError({ statusCode: 400, statusMessage: 'A numeric player id is required.' })
  }
  const q = getQuery(event)
  const group = q.group === 'pitching' ? 'pitching' : 'hitting'
  const season = Number(q.season) || currentSeason()
  const sportId = Number(q.sportId) || 1

  const [main, proj] = await Promise.all([
    mlbFetch<any>(`/people/${personId}/stats`, {
      stats: 'season,sabermetrics,expectedStatistics',
      group,
      season,
      sportId,
    }),
    mlbFetch<any>(`/people/${personId}/stats`, {
      stats: 'projected_Zips',
      group,
      sportId,
    }).catch(() => null), // ZiPS is MLB-only; missing for e.g. Mexican leagues
  ])

  const zips = proj ? blockOf(proj, 'projected_Zips') : null

  return {
    personId,
    group,
    year: season,
    sabermetrics: blockOf(main, 'sabermetrics')?.stat ?? null,
    standard: blockOf(main, 'season')?.stat ?? null,
    expected: blockOf(main, 'expectedStatistics')?.stat ?? null,
    projection: zips ? { season: zips.season, stats: zips.stat } : null,
  }
})
