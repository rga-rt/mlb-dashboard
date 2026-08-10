import type { PlayerResponse, StatLine } from '~/types/mlb'
import { currentSeason, mlbFetch, pick } from '~/server/utils/mlb'

// GET /api/player/607192?season=2026 -> bio + flattened season stat lines
export default defineEventHandler(async (event): Promise<PlayerResponse> => {
  const personId = Number(getRouterParam(event, 'id'))
  if (!personId) {
    throw createError({ statusCode: 400, statusMessage: 'A numeric player id is required.' })
  }
  const season = Number(getQuery(event).season) || currentSeason()
  // Which league's season the stats come from: MLB=1 (default), LMB=23, LMP=17.
  // Season stats are scoped to a sport, so a Mexican-league player returns no
  // lines unless we ask for their sport.
  const sportId = Number(getQuery(event).sportId) || 1

  // One hydrated call gets bio + season hitting & pitching in a single trip.
  const raw = await mlbFetch<any>(`/people/${personId}`, {
    hydrate: `currentTeam,stats(group=[hitting,pitching],type=[season],season=${season},sportId=${sportId})`,
  })

  const person = (pick(raw, 'people', []) as any[])[0] ?? {}
  const primaryPosition = pick(person, 'primaryPosition', {}) as any
  const currentTeam = pick(person, 'currentTeam', {}) as any

  const lines: StatLine[] = (pick(person, 'stats', []) as any[])
    .map((block): StatLine | null => {
      const group = pick<string>(pick(block, 'group', {}), 'displayName', '') as string
      const split = (pick(block, 'splits', []) as any[])[0]
      const stat = pick(split, 'stat', null)
      if (!stat) return null
      return {
        group: group as StatLine['group'],
        season: pick<string>(split, 'season', String(season)) as string,
        stats: stat as Record<string, string | number>,
      }
    })
    .filter((l): l is StatLine => l !== null)

  return {
    personId,
    name: pick<string>(person, 'fullName', 'Unknown') as string,
    position: pick<string>(primaryPosition, 'name', '') as string,
    positionAbbr: pick<string>(primaryPosition, 'abbreviation', '') as string,
    teamName: pick<string>(currentTeam, 'name', null),
    bats: pick<string>(pick(person, 'batSide', {}), 'code', null),
    throws: pick<string>(pick(person, 'pitchHand', {}), 'code', null),
    lines,
  }
})
