import type { StatLine } from '~/types/mlb'

export interface StatColumn {
  key: string // field in the MLB stat object
  label: string // column header shown
}

// The stats worth surfacing per group, in scoreboard order.
export const HITTING_COLUMNS: StatColumn[] = [
  { key: 'gamesPlayed', label: 'G' },
  { key: 'atBats', label: 'AB' },
  { key: 'runs', label: 'R' },
  { key: 'hits', label: 'H' },
  { key: 'homeRuns', label: 'HR' },
  { key: 'rbi', label: 'RBI' },
  { key: 'baseOnBalls', label: 'BB' },
  { key: 'strikeOuts', label: 'SO' },
  { key: 'stolenBases', label: 'SB' },
  { key: 'avg', label: 'AVG' },
  { key: 'obp', label: 'OBP' },
  { key: 'slg', label: 'SLG' },
  { key: 'ops', label: 'OPS' },
]

export const PITCHING_COLUMNS: StatColumn[] = [
  { key: 'wins', label: 'W' },
  { key: 'losses', label: 'L' },
  { key: 'era', label: 'ERA' },
  { key: 'gamesPlayed', label: 'G' },
  { key: 'gamesStarted', label: 'GS' },
  { key: 'saves', label: 'SV' },
  { key: 'inningsPitched', label: 'IP' },
  { key: 'strikeOuts', label: 'SO' },
  { key: 'baseOnBalls', label: 'BB' },
  { key: 'whip', label: 'WHIP' },
  { key: 'strikeoutsPer9Inn', label: 'K/9' },
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
