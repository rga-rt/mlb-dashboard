// Server-only helpers for talking to the MLB Stats API.
// Runs inside Nitro (server), so there is no CORS restriction here — the
// browser only ever talks to our own /api routes.
import type { Division, League, TeamRecord } from '~/types/mlb'

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
