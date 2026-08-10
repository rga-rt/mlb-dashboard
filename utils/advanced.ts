type StatMap = Record<string, string | number> | null | undefined

function toNum(v: string | number | null | undefined): number | null {
  if (v === undefined || v === null || v === '') return null
  const n = typeof v === 'number' ? v : Number.parseFloat(v)
  return Number.isFinite(n) ? n : null
}

/** Format a rate as ".309" (leading zero dropped when < 1). */
function fmtRate(v: string | number | null | undefined, decimals = 3): string {
  const n = toNum(v)
  if (n === null) return '—'
  const s = n.toFixed(decimals)
  return n < 1 && n >= 0 ? s.replace(/^0/, '') : s
}

// A sabermetric readout. baseline100 marks stats where 100 = league average
// (wRC+, ERA−); lowerBetter flags where down is good (FIP, ERA−).
export interface SaberStat {
  key: string
  label: string
  decimals: number
  rate?: boolean // sub-1 rate → drop the leading zero
  baseline100?: boolean
  lowerBetter?: boolean
  hint?: string
}

export const SABER_HITTING: SaberStat[] = [
  { key: 'wRcPlus', label: 'wRC+', decimals: 0, baseline100: true, hint: '100 = league average' },
  { key: 'woba', label: 'wOBA', decimals: 3, rate: true },
  { key: 'war', label: 'WAR', decimals: 1 },
  { key: 'wRaa', label: 'wRAA', decimals: 0 },
]

export const SABER_PITCHING: SaberStat[] = [
  { key: 'fip', label: 'FIP', decimals: 2, lowerBetter: true },
  { key: 'xfip', label: 'xFIP', decimals: 2, lowerBetter: true },
  { key: 'eraMinus', label: 'ERA−', decimals: 0, baseline100: true, lowerBetter: true, hint: '100 = league average' },
  { key: 'war', label: 'WAR', decimals: 1 },
]

export function formatSaber(v: string | number | null | undefined, cfg: SaberStat): string {
  const n = toNum(v)
  if (n === null) return '—'
  const s = n.toFixed(cfg.decimals)
  return cfg.rate && cfg.decimals >= 3 && n < 1 && n >= 0 ? s.replace(/^0/, '') : s
}

// One actual-vs-expected comparison (the Statcast "luck" read).
export interface ExpectedRow {
  label: string
  actual: string
  expected: string
  delta: string // signed, e.g. "+.013"
  over: boolean | null // actual above expected (out-performing) / below / n/a
}

const EXPECTED_DEFS: { label: string, key: string, from: 'standard' | 'saber' }[] = [
  { label: 'AVG', key: 'avg', from: 'standard' },
  { label: 'SLG', key: 'slg', from: 'standard' },
  { label: 'wOBA', key: 'woba', from: 'saber' },
]

function fmtDelta(d: number): string {
  const s = Math.abs(d).toFixed(3).replace(/^0/, '')
  return `${d >= 0 ? '+' : '−'}${s}`
}

/**
 * Actual vs Statcast-expected for AVG/SLG/wOBA. Actual AVG/SLG come from the
 * standard line, actual wOBA from sabermetrics; expected from expectedStatistics.
 */
export function expectedRows(standard: StatMap, saber: StatMap, expected: StatMap): ExpectedRow[] {
  if (!expected) return []
  return EXPECTED_DEFS.map((d) => {
    const src = d.from === 'saber' ? saber : standard
    const a = toNum(src?.[d.key])
    const e = toNum(expected[d.key])
    const delta = a !== null && e !== null ? a - e : null
    return {
      label: d.label,
      actual: fmtRate(a),
      expected: fmtRate(e),
      delta: delta === null ? '—' : fmtDelta(delta),
      over: delta === null ? null : delta > 0,
    }
  })
}
