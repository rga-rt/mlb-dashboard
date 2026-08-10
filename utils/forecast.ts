import type { SeasonStat } from '~/types/mlb'

export interface Point { x: number, y: number }

export interface LinearModel {
  slope: number
  intercept: number
  r2: number // coefficient of determination, 0..1
  predict: (x: number) => number
}

// Stats worth projecting. Rate stats (OPS, ERA) are the honest default — raw
// counting totals are confounded by playing time (see the book's HR-vs-SO
// caution). `lowerBetter` only affects copy, not the fit.
export interface ForecastStat {
  key: string
  label: string
  rate?: boolean
  lowerBetter?: boolean
  decimals?: number
}

export const HITTING_FORECAST: ForecastStat[] = [
  { key: 'ops', label: 'OPS', rate: true, decimals: 3 },
  { key: 'avg', label: 'AVG', rate: true, decimals: 3 },
  { key: 'homeRuns', label: 'HR' },
  { key: 'rbi', label: 'RBI' },
]

export const PITCHING_FORECAST: ForecastStat[] = [
  { key: 'era', label: 'ERA', rate: true, lowerBetter: true, decimals: 2 },
  { key: 'whip', label: 'WHIP', rate: true, lowerBetter: true, decimals: 2 },
  { key: 'strikeOuts', label: 'SO' },
  { key: 'wins', label: 'W' },
]

function toNum(v: string | number | undefined | null): number | null {
  if (v === undefined || v === null || v === '') return null
  const n = typeof v === 'number' ? v : Number.parseFloat(v)
  return Number.isFinite(n) ? n : null
}

/** Pull a numeric (season, value) series for one stat, dropping missing years. */
export function seriesFor(seasons: SeasonStat[], key: string): Point[] {
  return seasons
    .map(s => ({ x: s.season, y: toNum(s.stats[key]) }))
    .filter((p): p is Point => p.y !== null)
}

/** Ordinary least-squares line through the points, with R². */
export function linearRegression(points: Point[]): LinearModel {
  const n = points.length
  if (n === 0) return { slope: 0, intercept: 0, r2: 0, predict: () => 0 }
  if (n === 1) {
    const c = points[0].y
    return { slope: 0, intercept: c, r2: 0, predict: () => c }
  }
  const mx = points.reduce((a, p) => a + p.x, 0) / n
  const my = points.reduce((a, p) => a + p.y, 0) / n
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (const p of points) {
    const dx = p.x - mx
    const dy = p.y - my
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }
  const slope = sxx === 0 ? 0 : sxy / sxx
  const intercept = my - slope * mx
  const r2 = sxx === 0 || syy === 0 ? 0 : (sxy * sxy) / (sxx * syy)
  return { slope, intercept, r2, predict: (x: number) => intercept + slope * x }
}

/** Format a projected value the way the board shows that stat. */
export function formatForecast(value: number, stat: ForecastStat): string {
  if (stat.decimals != null) {
    const s = value.toFixed(stat.decimals)
    // AVG/OPS-style rates drop the leading zero (.291), like the box score.
    return stat.decimals >= 3 && value < 1 && value >= 0 ? s.replace(/^0/, '') : s
  }
  return String(Math.round(value))
}
