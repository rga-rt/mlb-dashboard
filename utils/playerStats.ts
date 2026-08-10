import type { StatLine, TeamStatEntry } from '~/types/mlb'

export interface StatColumn {
  key: string // field in the MLB stat object
  label: string // column header shown
  description: string // what the abbreviation means, for the box-score key
}

// The stats worth surfacing per group, in scoreboard order.
export const HITTING_COLUMNS: StatColumn[] = [
  { key: 'gamesPlayed', label: 'G', description: 'Games' },
  { key: 'atBats', label: 'AB', description: 'At Bats' },
  { key: 'runs', label: 'R', description: 'Runs' },
  { key: 'hits', label: 'H', description: 'Hits' },
  { key: 'doubles', label: '2B', description: 'Doubles' },
  { key: 'triples', label: '3B', description: 'Triples' },
  { key: 'homeRuns', label: 'HR', description: 'Home Runs' },
  { key: 'rbi', label: 'RBI', description: 'Runs Batted In' },
  { key: 'stolenBases', label: 'SB', description: 'Stolen Bases' },
  { key: 'caughtStealing', label: 'CS', description: 'Caught Stealing' },
  { key: 'baseOnBalls', label: 'BB', description: 'Walks' },
  { key: 'strikeOuts', label: 'SO', description: 'Strikeouts' },
  { key: 'intentionalWalks', label: 'IBB', description: 'Intentional Walks' },
  { key: 'hitByPitch', label: 'HBP', description: 'Hit By Pitch' },
  { key: 'sacBunts', label: 'SH', description: 'Sacrifice Bunts' },
  { key: 'sacFlies', label: 'SF', description: 'Sacrifice Flies' },
  { key: 'groundIntoDoublePlay', label: 'GIDP', description: 'Grounded Into Double Play' },
  { key: 'avg', label: 'AVG', description: 'Batting Average' },
  { key: 'obp', label: 'OBP', description: 'On-Base Percentage' },
  { key: 'slg', label: 'SLG', description: 'Slugging Percentage' },
  { key: 'ops', label: 'OPS', description: 'On-Base Plus Slugging' },
]

export const PITCHING_COLUMNS: StatColumn[] = [
  { key: 'wins', label: 'W', description: 'Wins' },
  { key: 'losses', label: 'L', description: 'Losses' },
  { key: 'era', label: 'ERA', description: 'Earned Run Average' },
  { key: 'gamesPlayed', label: 'G', description: 'Games' },
  { key: 'gamesStarted', label: 'GS', description: 'Games Started' },
  { key: 'saves', label: 'SV', description: 'Saves' },
  { key: 'inningsPitched', label: 'IP', description: 'Innings Pitched' },
  { key: 'strikeOuts', label: 'SO', description: 'Strikeouts' },
  { key: 'baseOnBalls', label: 'BB', description: 'Walks' },
  { key: 'whip', label: 'WHIP', description: 'Walks & Hits per Inning' },
  { key: 'strikeoutsPer9Inn', label: 'K/9', description: 'Strikeouts per 9 Innings' },
]

// Rate stats are rendered as lit amber digits on the board.
export const RATE_STATS = ['avg', 'obp', 'slg', 'ops', 'era', 'whip']

/** Which column set a stat line uses. */
export function columnsFor(line: StatLine): StatColumn[] {
  return line.group === 'pitching' ? PITCHING_COLUMNS : HITTING_COLUMNS
}

/** Format a stat cell — an em dash for missing or empty values. */
export function statValue(line: StatLine, key: string): string {
  const v = line.stats[key]
  return v === undefined || v === null || v === '' ? '—' : String(v)
}

// A metric to rank a player against their teammates on. ERA/WHIP win low, so
// they carry `lowerBetter` to flip the ranking and gauge direction.
export interface CompareMetric {
  key: string
  label: string
  lowerBetter?: boolean
}

export const HITTING_COMPARE: CompareMetric[] = [
  { key: 'runs', label: 'R' },
  { key: 'hits', label: 'H' },
  { key: 'homeRuns', label: 'HR' },
  { key: 'rbi', label: 'RBI' },
  { key: 'stolenBases', label: 'SB' },
  { key: 'ops', label: 'OPS' },
]

export const PITCHING_COMPARE: CompareMetric[] = [
  { key: 'wins', label: 'W' },
  { key: 'strikeOuts', label: 'SO' },
  { key: 'inningsPitched', label: 'IP' },
  { key: 'saves', label: 'SV' },
  { key: 'era', label: 'ERA', lowerBetter: true },
  { key: 'whip', label: 'WHIP', lowerBetter: true },
]

export interface CompareRow {
  key: string
  label: string
  lowerBetter: boolean
  value: string // formatted, em dash when the player has no value
  rank: number | null // 1-indexed among teammates with a value
  total: number // teammates with a value for this metric
  fill: number // 0..1 bar length relative to the team's best
  isLeader: boolean
}

function toNum(v: string | number | undefined | null): number | null {
  if (v === undefined || v === null || v === '') return null
  const n = typeof v === 'number' ? v : Number.parseFloat(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Rank one player against a pool of teammates on each metric. Returns a row
 * per metric with the player's value, rank, and a 0..1 gauge fill (full bar =
 * team best, honoring lower-is-better metrics like ERA).
 */
export function compareToTeam(
  team: TeamStatEntry[],
  personId: number,
  metrics: CompareMetric[],
): CompareRow[] {
  return metrics.map((m) => {
    const lowerBetter = !!m.lowerBetter
    const nums = team
      .map(p => ({ id: p.personId, n: toNum(p.stats[m.key]) }))
      .filter((x): x is { id: number, n: number } => x.n !== null)
    const total = nums.length
    const me = nums.find(x => x.id === personId)
    const raw = team.find(p => p.personId === personId)?.stats[m.key]
    const value = raw === undefined || raw === null || raw === '' ? '—' : String(raw)

    if (!me) {
      return { key: m.key, label: m.label, lowerBetter, value, rank: null, total, fill: 0, isLeader: false }
    }

    const better = nums.filter(x => (lowerBetter ? x.n < me.n : x.n > me.n)).length
    const rank = better + 1
    const best = lowerBetter ? Math.min(...nums.map(x => x.n)) : Math.max(...nums.map(x => x.n))
    let fill: number
    if (lowerBetter) fill = me.n <= 0 || best <= 0 ? (me.n <= best ? 1 : 0) : best / me.n
    else fill = best <= 0 ? 0 : me.n / best
    fill = Math.max(0, Math.min(1, fill))

    return { key: m.key, label: m.label, lowerBetter, value, rank, total, fill, isLeader: rank === 1 && total > 1 }
  })
}

/** 1 -> "1st", 2 -> "2nd", 11 -> "11th". */
export function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}
