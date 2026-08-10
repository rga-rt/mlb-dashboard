import { describe, expect, it } from 'vitest'
import type { SeasonStat } from '~/types/mlb'
import { formatForecast, linearRegression, seriesFor } from '~/utils/forecast'

describe('linearRegression', () => {
  it('recovers slope, intercept, and R²=1 from a perfect line', () => {
    // y = 2x + 1
    const m = linearRegression([{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }])
    expect(m.slope).toBeCloseTo(2)
    expect(m.intercept).toBeCloseTo(1)
    expect(m.r2).toBeCloseTo(1)
    expect(m.predict(3)).toBeCloseTo(7) // forecast next point
  })

  it('fits a best line through noisy points with R² below 1', () => {
    const m = linearRegression([{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 1.5 }])
    expect(m.slope).toBeCloseTo(0.25)
    expect(m.r2).toBeGreaterThan(0)
    expect(m.r2).toBeLessThan(1)
  })

  it('degrades safely with too few points', () => {
    expect(linearRegression([]).predict(2026)).toBe(0)
    const one = linearRegression([{ x: 2025, y: 0.9 }])
    expect(one.slope).toBe(0)
    expect(one.predict(2027)).toBeCloseTo(0.9) // flat carry-forward
  })
})

describe('seriesFor', () => {
  const seasons: SeasonStat[] = [
    { season: 2023, stats: { ops: '1.019', homeRuns: 37 } },
    { season: 2024, stats: { ops: '1.159', homeRuns: 58 } },
    { season: 2025, stats: { homeRuns: 53 } }, // no ops
  ]

  it('parses string rate values and pairs them with the season', () => {
    expect(seriesFor(seasons, 'ops')).toEqual([{ x: 2023, y: 1.019 }, { x: 2024, y: 1.159 }])
  })

  it('drops seasons missing the stat', () => {
    expect(seriesFor(seasons, 'ops')).toHaveLength(2) // 2025 has no ops
    expect(seriesFor(seasons, 'homeRuns')).toHaveLength(3)
  })
})

describe('formatForecast', () => {
  it('rounds counting stats to whole numbers', () => {
    expect(formatForecast(41.6, { key: 'homeRuns', label: 'HR' })).toBe('42')
  })
  it('drops the leading zero on 3-decimal rates', () => {
    expect(formatForecast(0.291, { key: 'avg', label: 'AVG', rate: true, decimals: 3 })).toBe('.291')
    expect(formatForecast(1.104, { key: 'ops', label: 'OPS', rate: true, decimals: 3 })).toBe('1.104')
  })
  it('keeps the leading digit on 2-decimal rates like ERA', () => {
    expect(formatForecast(3.4, { key: 'era', label: 'ERA', rate: true, decimals: 2 })).toBe('3.40')
  })
})
