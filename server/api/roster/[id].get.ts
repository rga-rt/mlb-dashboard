import type { RosterPlayer, RosterResponse } from '~/types/mlb'
import { mlbFetch, pick } from '~/server/utils/mlb'

// GET /api/roster/112  -> flattened active roster for team 112 (Cubs)
export default defineEventHandler(async (event): Promise<RosterResponse> => {
  const teamId = Number(getRouterParam(event, 'id'))
  if (!teamId) {
    throw createError({ statusCode: 400, statusMessage: 'A numeric team id is required.' })
  }

  // Fetch roster + the team name (one small extra call for a nicer header).
  const [rosterRaw, teamRaw] = await Promise.all([
    mlbFetch<any>(`/teams/${teamId}/roster`, { rosterType: 'active' }),
    mlbFetch<any>(`/teams/${teamId}`),
  ])

  const teamName =
    pick<string>((pick(teamRaw, 'teams', []) as any[])[0], 'name', 'Team') ?? 'Team'

  const players: RosterPlayer[] = (pick(rosterRaw, 'roster', []) as any[]).map((row) => {
    const person = pick(row, 'person', {}) as any
    const position = pick(row, 'position', {}) as any
    const status = pick(row, 'status', {}) as any
    return {
      personId: pick<number>(person, 'id', 0) as number,
      name: pick<string>(person, 'fullName', 'Unknown') as string,
      jersey: pick<string>(row, 'jerseyNumber', '') as string,
      position: pick<string>(position, 'name', '') as string,
      positionAbbr: pick<string>(position, 'abbreviation', '') as string,
      positionType: pick<string>(position, 'type', 'Other') as string,
      status: pick<string>(status, 'description', '') as string,
    }
  })

  return { teamId, teamName, players }
})
