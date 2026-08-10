import type { StandingsResponse } from '~/types/mlb'
import { currentSeason, flattenStandings, mlbFetch, orderDivisions, pick } from '~/server/utils/mlb'

// GET /api/standings?season=2026
// Returns every division with flattened team records: the six MLB divisions
// plus the two LMB zones and LMP (each Mexican league only shows up when its
// season has data for the requested year).
export default defineEventHandler(async (event): Promise<StandingsResponse> => {
  const q = getQuery(event)
  const season = Number(q.season) || currentSeason()

  const raw = await mlbFetch<any>('/standings', {
    // 103 = AL, 104 = NL, 125 = Mexican League (LMB), 132 = LMP.
    // Spanning sports in one call works as long as we don't pin sportId.
    leagueId: '103,104,125,132',
    season,
    standingsTypes: 'regularSeason',
  })

  const records = pick(raw, 'records', []) as any[]
  const divisions = orderDivisions(flattenStandings(records))

  return { season, divisions }
})
