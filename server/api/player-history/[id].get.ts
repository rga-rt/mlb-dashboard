import type { PlayerHistoryResponse, SeasonStat } from '~/types/mlb'
import { mlbFetch, pick } from '~/server/utils/mlb'

// GET /api/player-history/592450?group=hitting&sportId=1
// A player's season-by-season stats for one group — the series a forecast is
// fit on. Multi-team seasons can yield several splits per year; we keep the
// fullest one (most at-bats / innings) so each season is a single point.
export default defineEventHandler(async (event): Promise<PlayerHistoryResponse> => {
  const personId = Number(getRouterParam(event, 'id'))
  if (!personId) {
    throw createError({ statusCode: 400, statusMessage: 'A numeric player id is required.' })
  }
  const q = getQuery(event)
  const group = q.group === 'pitching' ? 'pitching' : 'hitting'
  const sportId = Number(q.sportId) || 1

  const raw = await mlbFetch<any>(`/people/${personId}`, {
    hydrate: `stats(group=${group},type=yearByYear,sportId=${sportId})`,
  })

  const person = (pick(raw, 'people', []) as any[])[0] ?? {}
  const splits = (pick(person, 'stats', []) as any[])[0]?.splits ?? []

  const volKey = group === 'pitching' ? 'inningsPitched' : 'atBats'
  const bySeason = new Map<number, { vol: number, stat: SeasonStat }>()
  for (const sp of splits as any[]) {
    const season = Number(pick(sp, 'season', 0))
    if (!season) continue
    const stat = pick(sp, 'stat', {}) as Record<string, string | number>
    const vol = Number.parseFloat(String(stat[volKey] ?? 0)) || 0
    const existing = bySeason.get(season)
    if (!existing || vol > existing.vol) bySeason.set(season, { vol, stat: { season, stats: stat } })
  }

  const seasons = [...bySeason.values()]
    .map(x => x.stat)
    .sort((a, b) => a.season - b.season)

  return { personId, group, seasons }
})
