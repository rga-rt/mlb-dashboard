// Pure ordering logic for a division's rows: column sorting + pinned-team
// float. Kept free of Vue so it can be unit-tested like the other ~/utils
// helpers; the component wires these into refs. Auto-imported by Nuxt (~/utils).
import type { TeamRecord } from '~/types/mlb'

export type SortKey = 'rank' | 'name' | 'wins' | 'losses' | 'pct' | 'gamesBack'
export type SortDir = 'asc' | 'desc'

export interface SortState {
  key: SortKey
  dir: SortDir
}

// The first-click direction for each column — the one a fan expects. Wins and
// PCT lead with the best on top (desc); the rest read low-to-high (asc).
export const DEFAULT_DIR: Record<SortKey, SortDir> = {
  rank: 'asc',
  name: 'asc',
  wins: 'desc',
  losses: 'asc',
  pct: 'desc',
  gamesBack: 'asc',
}

// The board's resting order: standings rank, ascending. Clicking the # header
// returns to exactly this.
export const DEFAULT_SORT: SortState = { key: 'rank', dir: 'asc' }

// divisionRank / pct / gamesBack arrive as strings off the flat MLB shape; read
// them numerically. The leader's gamesBack is "-", which sorts as 0.
function rankVal(t: TeamRecord): number {
  const n = parseInt(t.divisionRank, 10)
  return Number.isNaN(n) ? Number.POSITIVE_INFINITY : n
}
function pctVal(t: TeamRecord): number {
  const n = parseFloat(t.pct)
  return Number.isNaN(n) ? 0 : n
}
function gamesBackVal(t: TeamRecord): number {
  if (t.gamesBack === '-') return 0
  const n = parseFloat(t.gamesBack)
  return Number.isNaN(n) ? 0 : n
}

// Compare two teams on a single column, always in ascending sense. The caller
// applies direction; the tiebreak (below) keeps things ascending too.
function compareBy(a: TeamRecord, b: TeamRecord, key: SortKey): number {
  switch (key) {
    case 'name': return a.name.localeCompare(b.name)
    case 'wins': return a.wins - b.wins
    case 'losses': return a.losses - b.losses
    case 'pct': return pctVal(a) - pctVal(b)
    case 'gamesBack': return gamesBackVal(a) - gamesBackVal(b)
    case 'rank':
    default: return rankVal(a) - rankVal(b)
  }
}

// Sort a copy of the rows by the given column and direction. Ties fall back to
// standings rank (ascending, unaffected by dir) so equal values stay stable and
// readable.
export function sortTeams(teams: TeamRecord[], { key, dir }: SortState): TeamRecord[] {
  const sign = dir === 'asc' ? 1 : -1
  return [...teams].sort((a, b) => {
    const primary = compareBy(a, b, key)
    if (primary !== 0) return primary * sign
    return rankVal(a) - rankVal(b)
  })
}

// Float pinned teams to the top, preserving the relative order of both groups.
// Stable, so pins ride on top of whatever sort is active beneath them.
export function partitionPinned(
  teams: TeamRecord[],
  isPinned: (teamId: number) => boolean,
): TeamRecord[] {
  const pinned: TeamRecord[] = []
  const rest: TeamRecord[] = []
  for (const team of teams) (isPinned(team.teamId) ? pinned : rest).push(team)
  return [...pinned, ...rest]
}

// The order the board actually renders: sort, then float pins on top.
export function orderTeams(
  teams: TeamRecord[],
  sort: SortState,
  isPinned: (teamId: number) => boolean,
): TeamRecord[] {
  return partitionPinned(sortTeams(teams, sort), isPinned)
}

// Given the current sort and a clicked column: same column flips direction;
// a new column adopts that column's natural default direction.
export function nextSort(current: SortState, key: SortKey): SortState {
  if (current.key === key) {
    return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
  }
  return { key, dir: DEFAULT_DIR[key] }
}
