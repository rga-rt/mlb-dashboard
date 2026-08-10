import type { TeamStatsResponse } from '~/types/mlb'
import { currentSeason, mlbFetch, pick } from '~/server/utils/mlb'

// GET /api/team-stats/147?season=2026&group=hitting&sportId=1
// One MLB call returns every player who logged that stat group for the team
// this season (playerPool=all, not just qualifiers) — the pool we rank a
// selected player against. Flattened to { personId, name, stats }.
export default defineEventHandler(async (event): Promise<TeamStatsResponse> => {
  const teamId = Number(getRouterParam(event, 'id'))
  if (!teamId) {
    throw createError({ statusCode: 400, statusMessage: 'A numeric team id is required.' })
  }
  const q = getQuery(event)
  const season = Number(q.season) || currentSeason()
  const sportId = Number(q.sportId) || 1
  const group = q.group === 'pitching' ? 'pitching' : 'hitting'

  const raw = await mlbFetch<any>('/stats', {
    stats: 'season',
    group,
    season,
    teamId,
    sportId,
    gameType: 'R',
    playerPool: 'all',
    limit: 300,
  })

  const splits = (pick(raw, 'stats', []) as any[])[0]?.splits ?? []
  const players = (splits as any[]).map((sp) => {
    const person = pick(sp, 'player', {}) as any
    return {
      personId: pick<number>(person, 'id', 0) as number,
      name: pick<string>(person, 'fullName', 'Unknown') as string,
      stats: pick(sp, 'stat', {}) as Record<string, string | number>,
    }
  })

  return { teamId, season, group, players }
})
