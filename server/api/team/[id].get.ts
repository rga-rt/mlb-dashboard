import type { TeamInfoResponse } from '~/types/mlb'
import { currentSeason, mlbFetch, pick } from '~/server/utils/mlb'

// GET /api/team/147?season=2026 -> club + ballpark info (league, division,
// founding year, and the venue's capacity/surface/roof/outfield dimensions).
// One hydrated /teams call carries all of it.
export default defineEventHandler(async (event): Promise<TeamInfoResponse> => {
  const teamId = Number(getRouterParam(event, 'id'))
  if (!teamId) {
    throw createError({ statusCode: 400, statusMessage: 'A numeric team id is required.' })
  }
  const season = Number(getQuery(event).season) || currentSeason()

  const raw = await mlbFetch<any>(`/teams/${teamId}`, {
    season,
    hydrate: 'venue(location,fieldInfo)',
  })

  const team = (pick(raw, 'teams', []) as any[])[0] ?? {}
  const venue = pick(team, 'venue', {}) as any
  const loc = pick(venue, 'location', {}) as any
  const field = pick(venue, 'fieldInfo', {}) as any
  const numOrNull = (v: unknown) => (typeof v === 'number' ? v : null)

  return {
    teamId,
    name: pick<string>(team, 'name', 'Team') as string,
    abbreviation: pick<string>(team, 'abbreviation', null),
    location: pick<string>(team, 'locationName', null),
    firstYearOfPlay: pick<string>(team, 'firstYearOfPlay', null),
    league: pick<string>(pick(team, 'league', {}), 'name', null),
    division: pick<string>(pick(team, 'division', {}), 'name', null),
    venue: {
      name: pick<string>(venue, 'name', null),
      city: pick<string>(loc, 'city', null),
      state: pick<string>(loc, 'stateAbbrev', pick<string>(loc, 'state', null)),
      capacity: numOrNull(pick(field, 'capacity', null)),
      turf: pick<string>(field, 'turfType', null),
      roof: pick<string>(field, 'roofType', null),
      dimensions: {
        leftLine: numOrNull(pick(field, 'leftLine', null)),
        leftCenter: numOrNull(pick(field, 'leftCenter', null)),
        center: numOrNull(pick(field, 'center', null)),
        rightCenter: numOrNull(pick(field, 'rightCenter', null)),
        rightLine: numOrNull(pick(field, 'rightLine', null)),
      },
    },
  }
})
