// Server-only helpers for talking to the MLB Stats API.
// Runs inside Nitro (server), so there is no CORS restriction here — the
// browser only ever talks to our own /api routes.
import type {
  Broadcast,
  Division,
  GameSide,
  GameStatus,
  League,
  LiveState,
  ScoreboardGame,
  TeamRecord,
} from '~/types/mlb'

/** Fetch a path off the MLB base URL and return parsed JSON. */
export async function mlbFetch<T = any>(
  path: string,
  query: Record<string, string | number> = {},
): Promise<T> {
  const base = useRuntimeConfig().mlbBase
  // $fetch is typed to return TypedInternalResponse<…, T, "get">, which the
  // compiler won't narrow to a bare T; we own the shape via the caller's
  // generic, so assert it back to T.
  return await $fetch(`${base}${path}`, {
    query,
    // A UA header keeps some CDN edges happy; MLB's API is otherwise open.
    headers: { 'User-Agent': 'mlb-scoreboard-dashboard' },
  }) as T
}

/**
 * The `.get()`-with-default idiom from the book, ported to JS.
 * Safely reads obj?.[key] and falls back instead of throwing when a
 * nested field is missing (common with this API).
 */
export function pick<T = any>(obj: any, key: string, fallback: T | null = null): T | null {
  if (obj && typeof obj === 'object' && key in obj && obj[key] != null) {
    return obj[key] as T
  }
  return fallback
}

// Division ids are stable. Mapping them here means we don't have to hydrate
// division names on every standings call. Includes the two Mexican League
// (LMB) zones alongside the six MLB divisions.
export const DIVISIONS: Record<number, { name: string; league: League }> = {
  200: { name: 'AL West', league: 'AL' },
  201: { name: 'AL East', league: 'AL' },
  202: { name: 'AL Central', league: 'AL' },
  203: { name: 'NL West', league: 'NL' },
  204: { name: 'NL East', league: 'NL' },
  205: { name: 'NL Central', league: 'NL' },
  222: { name: 'Mexican League Norte', league: 'LMB' },
  223: { name: 'Mexican League Sur', league: 'LMB' },
}

// Some leagues report a single table with no division (division id is null in
// the feed). Key those off the league id instead. LMP (Liga Mexicana del
// Pacífico) is a winter league, so it only populates outside the MLB season.
export const LEAGUES: Record<number, { name: string; league: League }> = {
  132: { name: 'Liga Mexicana del Pacífico', league: 'LMP' },
}

/** Default to the season currently in progress. */
export function currentSeason(): number {
  return new Date().getFullYear()
}

/**
 * Flatten the raw MLB `/standings` records into our Division shape. Divisionless
 * leagues (LMP) report a null division id, so we key their metadata and their
 * stable divisionId off the league id instead. Teams are ordered by rank.
 */
export function flattenStandings(records: any[]): Division[] {
  return records.map((rec) => {
    const divId = pick<number>(rec?.division, 'id', 0) as number
    const leagueId = pick<number>(rec?.league, 'id', 0) as number
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
}

// Board order: the Mexican leagues first (LMB Norte/Sur, then LMP), then the
// MLB divisions AL East/Central/West, NL East/Central/West.
export const DIVISION_ORDER = [222, 223, 132, 201, 202, 200, 204, 205, 203]

/** Sort divisions into board order; unknown ids sort to the front. */
export function orderDivisions(divisions: Division[]): Division[] {
  return [...divisions].sort(
    (a, b) => DIVISION_ORDER.indexOf(a.divisionId) - DIVISION_ORDER.indexOf(b.divisionId),
  )
}

// --- Live Today (scoreboard) ---------------------------------------------

// The leagues the scoreboard covers, each its own sportId in the schedule feed.
// MLB=1, Mexican League (LMB)=23, LMP=17 — same ids the roster/stats routes use.
export const SCOREBOARD_SPORTS = [
  { id: 1, label: 'MLB' as const },
  { id: 23, label: 'LMB' as const },
  { id: 17, label: 'LMP' as const },
]

/**
 * Map MLB's `status.abstractGameState` to our small enum. The feed reports
 * "Live" / "Final" / "Preview"; anything else (Suspended, Postponed, …) lands
 * in "other" so the card can still show a status detail without a live block.
 */
export function gameStatus(abstractGameState: string | null): GameStatus {
  switch (abstractGameState) {
    case 'Live': return 'live'
    case 'Final': return 'final'
    case 'Preview': return 'scheduled'
    default: return 'other'
  }
}

/**
 * Flatten the raw `game.broadcasts` list (from hydrate=broadcasts(all)) into our
 * Broadcast shape. Normalizes the feed's medium (TV / AM / FM → TV / radio) and
 * de-duplicates: the same national carrier is often listed once per side (e.g.
 * "MLBN" for home and away), which we collapse to a single national entry.
 */
export function flattenBroadcasts(raw: any[] | null | undefined): Broadcast[] {
  const out: Broadcast[] = []
  const seen = new Set<string>()
  for (const b of (raw ?? [])) {
    const name = pick<string>(b, 'name', '') as string
    if (!name) continue
    const type = pick<string>(b, 'type', '') as string
    const medium: Broadcast['medium'] = type === 'TV' ? 'TV' : 'radio'
    const national = pick<boolean>(b, 'isNational', false) as boolean
    // National carriers dedupe by name alone (drop the per-side duplication);
    // local ones stay distinct per side so both clubs' feeds show.
    const side: Broadcast['side'] = national
      ? 'national'
      : (pick<string>(b, 'homeAway', 'home') as Broadcast['side'])
    const key = national ? `${medium}|${name}` : `${medium}|${name}|${side}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ name, medium, national, side })
  }
  return out
}

/** Read a side's flat shape off a raw schedule `game.teams.home|away` node. */
function flattenSide(rawSide: any): GameSide {
  const team = pick(rawSide, 'team', {}) as any
  const probable = pick(rawSide, 'probablePitcher', null) as any
  return {
    teamId: pick<number>(team, 'id', 0) as number,
    name: pick<string>(team, 'name', 'TBD') as string,
    // Abbreviation isn't always hydrated for Mexican-league clubs; fall back to
    // the full name so the row never renders blank.
    abbr: (pick<string>(team, 'abbreviation', null)
      ?? pick<string>(team, 'name', 'TBD')) as string,
    runs: pick<number>(rawSide, 'score', null),
    probablePitcher: pick<string>(probable, 'fullName', null),
  }
}

/**
 * Flatten one raw schedule game (hydrated with linescore, team, probablePitcher)
 * into our ScoreboardGame. The live block is only built for in-progress games;
 * runner presence is derived from whether offense.first|second|third exists.
 */
export function flattenScoreboardGame(
  game: any,
  sport: ScoreboardGame['sport'],
): ScoreboardGame {
  const status = gameStatus(pick<string>(game?.status, 'abstractGameState', null))
  const rawBroadcasts = pick(game, 'broadcasts', []) as any[]
  const line = pick(game, 'linescore', {}) as any
  const offense = pick(line, 'offense', {}) as any
  const defense = pick(line, 'defense', {}) as any

  let live: LiveState | null = null
  if (status === 'live') {
    live = {
      inning: pick<number>(line, 'currentInning', 0) as number,
      inningState: pick<string>(line, 'inningState', '') as string,
      balls: pick<number>(line, 'balls', 0) as number,
      strikes: pick<number>(line, 'strikes', 0) as number,
      outs: pick<number>(line, 'outs', 0) as number,
      onFirst: pick(offense, 'first', null) != null,
      onSecond: pick(offense, 'second', null) != null,
      onThird: pick(offense, 'third', null) != null,
      currentPitcher: pick<string>(pick(defense, 'pitcher', {}), 'fullName', null),
      currentBatter: pick<string>(pick(offense, 'batter', {}), 'fullName', null),
    }
  }

  return {
    gamePk: pick<number>(game, 'gamePk', 0) as number,
    status,
    statusDetail: pick<string>(game?.status, 'detailedState', '') as string,
    startTime: pick<string>(game, 'gameDate', null),
    sport,
    home: flattenSide(pick(game?.teams, 'home', {})),
    away: flattenSide(pick(game?.teams, 'away', {})),
    live,
    broadcasts: flattenBroadcasts(rawBroadcasts),
    // A game is "free" if any carrier flags it — MLB's free game of the day
    // streams on MLB.TV with no subscription.
    freeGame: rawBroadcasts.some(b => pick<boolean>(b, 'freeGame', false)),
  }
}

// Board order for the day's games: live first, then scheduled (earliest start
// first), then finals, then anything else. Used to key each group's rank.
const STATUS_ORDER: Record<GameStatus, number> = {
  live: 0,
  scheduled: 1,
  final: 2,
  other: 3,
}

/** Sort the day's games: live first, upcoming by start time, finals last. */
export function sortScoreboard(games: ScoreboardGame[]): ScoreboardGame[] {
  return [...games].sort((a, b) => {
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (byStatus !== 0) return byStatus
    // Within scheduled games, earliest first; elsewhere start time is a stable
    // tiebreak.
    return (a.startTime ?? '').localeCompare(b.startTime ?? '')
  })
}
