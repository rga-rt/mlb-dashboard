// Server-only helpers for talking to the MLB Stats API.
// Runs inside Nitro (server), so there is no CORS restriction here — the
// browser only ever talks to our own /api routes.
import type { League } from '~/types/mlb'

/** Fetch a path off the MLB base URL and return parsed JSON. */
export async function mlbFetch<T = any>(
  path: string,
  query: Record<string, string | number> = {},
): Promise<T> {
  const base = useRuntimeConfig().mlbBase
  return await $fetch<T>(`${base}${path}`, {
    query,
    // A UA header keeps some CDN edges happy; MLB's API is otherwise open.
    headers: { 'User-Agent': 'mlb-scoreboard-dashboard' },
  })
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
