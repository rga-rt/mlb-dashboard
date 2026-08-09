import type { Division, StandingsResponse, TeamRecord } from '~/types/mlb'
import { DIVISIONS, LEAGUES, currentSeason, mlbFetch, pick } from '~/server/utils/mlb'

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

  const records: any[] = pick(raw, 'records', []) as any[]

  const divisions: Division[] = records.map((rec) => {
    const divId = pick<number>(rec?.division, 'id', 0) as number
    const leagueId = pick<number>(rec?.league, 'id', 0) as number
    // Divisionless leagues (LMP) report a null division id — key those off the
    // league id so they still get a name and a stable non-zero key.
    const meta = DIVISIONS[divId] ?? LEAGUES[leagueId] ?? { name: 'Division', league: 'AL' as const }

    const teams: TeamRecord[] = (pick(rec, 'teamRecords', []) as any[]).map((tr) => {
      const team = pick(tr, 'team', {}) as any
      const streak = pick(tr, 'streak', {}) as any
      return {
        teamId: pick<number>(team, 'id', 0) as number,
        name: pick<string>(team, 'name', 'Unknown') as string,
        wins: pick<number>(tr, 'wins', 0) as number,
        losses: pick<number>(tr, 'losses', 0) as number,
        pct: pick<string>(tr, 'winningPercentage', '.000') as string,
        gamesBack: pick<string>(tr, 'gamesBack', '-') as string,
        streak: pick<string>(streak, 'streakCode', '-') as string,
        divisionRank: pick<string>(tr, 'divisionRank', '-') as string,
        divisionLeader: pick<boolean>(tr, 'divisionLeader', false) as boolean,
      }
    })

    // Order within a division by rank so the leader sits on top.
    teams.sort((a, b) => Number(a.divisionRank) - Number(b.divisionRank))

    return {
      // Fall back to the league id so divisionless leagues (LMP) still key
      // uniquely instead of colliding on 0.
      divisionId: divId || leagueId,
      divisionName: meta.name,
      league: meta.league,
      teams,
    }
  })

  // Group the board AL first, then NL East/Central/West, then the Mexican
  // leagues (LMB Norte/Sur, then LMP) last.
  const order = [201, 202, 200, 204, 205, 203, 222, 223, 132]
  divisions.sort((a, b) => order.indexOf(a.divisionId) - order.indexOf(b.divisionId))

  return { season, divisions }
})
