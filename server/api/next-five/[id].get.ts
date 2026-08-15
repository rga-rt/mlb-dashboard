import type { NextFiveGame, NextFiveResponse } from '~/types/mlb'
import { addScheduleDays, currentSeason, flattenStandings, gameStatus, log5, mlbFetch, pick, scheduleToday, SCOREBOARD_SPORTS } from '~/server/utils/mlb'

// GET /api/next-five/:id
// A pinned club's next five games — opponent, probable pitchers, and a per-game
// win-% forecast (log5, from both clubs' records). Two pulls in parallel: the
// team's schedule over a two-week window (one /schedule per league, so a
// Mexican-league club works the same as an MLB one — a teamId is unique, so only
// its own league returns games), and the standings for the win pcts. Flattened
// here so the browser never calls MLB directly.
export default defineEventHandler(async (event): Promise<NextFiveResponse> => {
  const teamId = Number(getRouterParam(event, 'id'))
  if (!teamId) {
    throw createError({ statusCode: 400, statusMessage: 'A numeric team id is required.' })
  }

  const season = currentSeason()
  const start = scheduleToday()
  const end = addScheduleDays(start, 14) // a club plays ~daily; two weeks covers five

  const [scheduleResults, standingsRaw] = await Promise.all([
    Promise.allSettled(
      SCOREBOARD_SPORTS.map(sport =>
        mlbFetch<any>('/schedule', {
          sportId: sport.sportId,
          ...(sport.leagueId ? { leagueId: sport.leagueId } : {}),
          teamId,
          startDate: start,
          endDate: end,
          hydrate: 'probablePitcher,team',
        }),
      ),
    ),
    // The forecast degrades gracefully if standings are unavailable.
    mlbFetch<any>('/standings', {
      leagueId: '103,104,125,132',
      season,
      standingsTypes: 'regularSeason',
    }).catch(() => null),
  ])

  // teamId → record, for the header and both sides of each log5 estimate.
  const records = new Map<number, { name: string, wins: number, losses: number, pct: string }>()
  if (standingsRaw) {
    for (const div of flattenStandings(pick(standingsRaw, 'records', []) as any[])) {
      for (const t of div.teams) {
        records.set(t.teamId, { name: t.name, wins: t.wins, losses: t.losses, pct: t.pct })
      }
    }
  }
  const pctOf = (id: number): number | null => {
    const r = records.get(id)
    if (!r) return null
    const p = Number.parseFloat(r.pct)
    return Number.isFinite(p) ? p : null
  }

  // Collect every game the schedule calls returned, drop finals, order by first
  // pitch, keep the next five.
  const raw: any[] = []
  for (const r of scheduleResults) {
    if (r.status !== 'fulfilled') continue
    for (const d of (pick(r.value, 'dates', []) as any[])) {
      for (const g of (pick(d, 'games', []) as any[])) raw.push(g)
    }
  }

  const upcoming = raw
    .filter(g => gameStatus(pick(g?.status, 'abstractGameState', null), pick(g?.status, 'detailedState', null)) !== 'final')
    .sort((a, b) => String(pick(a, 'gameDate', '')).localeCompare(String(pick(b, 'gameDate', ''))))
    .slice(0, 5)

  const games: NextFiveGame[] = upcoming.map((g) => {
    const teams = pick(g, 'teams', {}) as any
    const home = (pick<number>(pick(teams?.home, 'team', {}), 'id', 0) as number) === teamId
    const mine = home ? teams.home : teams.away
    const other = home ? teams.away : teams.home
    const oppTeam = pick(other, 'team', {}) as any
    const oppId = pick<number>(oppTeam, 'id', 0) as number

    const pMe = pctOf(teamId)
    const pOpp = pctOf(oppId)
    return {
      gamePk: pick<number>(g, 'gamePk', 0) as number,
      date: pick<string>(g, 'gameDate', null),
      home,
      opponent: {
        teamId: oppId,
        name: pick<string>(oppTeam, 'name', 'TBD') as string,
        abbr: (pick<string>(oppTeam, 'abbreviation', null) ?? pick<string>(oppTeam, 'name', 'TBD')) as string,
      },
      myProbable: pick<string>(pick(mine, 'probablePitcher', {}), 'fullName', null),
      oppProbable: pick<string>(pick(other, 'probablePitcher', {}), 'fullName', null),
      winProb: pMe != null && pOpp != null ? log5(pMe, pOpp) : null,
    }
  })

  // The pinned club's own name/abbr: prefer the standings record for the name,
  // fall back to the schedule (which also carries the abbreviation).
  const rec = records.get(teamId)
  let name = rec?.name ?? ''
  let abbr = ''
  if (upcoming.length) {
    const g0 = upcoming[0]
    const homeIsMe = (pick<number>(pick(g0?.teams?.home, 'team', {}), 'id', 0) as number) === teamId
    const meTeam = pick(homeIsMe ? g0.teams.home : g0.teams.away, 'team', {}) as any
    name = name || (pick<string>(meTeam, 'name', '') as string)
    abbr = (pick<string>(meTeam, 'abbreviation', name) ?? name) as string
  }

  return {
    team: {
      teamId,
      name,
      abbr: abbr || name,
      wins: rec?.wins ?? 0,
      losses: rec?.losses ?? 0,
      pct: rec?.pct ?? '.000',
    },
    games,
  }
})
