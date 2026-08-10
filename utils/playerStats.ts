import type { StatLine } from '~/types/mlb'

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
  { key: 'homeRuns', label: 'HR', description: 'Home Runs' },
  { key: 'rbi', label: 'RBI', description: 'Runs Batted In' },
  { key: 'baseOnBalls', label: 'BB', description: 'Walks' },
  { key: 'strikeOuts', label: 'SO', description: 'Strikeouts' },
  { key: 'stolenBases', label: 'SB', description: 'Stolen Bases' },
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
