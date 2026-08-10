import { describe, expect, it } from 'vitest'
import { SABER_HITTING, SABER_PITCHING, expectedRows, formatSaber } from '~/utils/advanced'

describe('formatSaber', () => {
  it('formats each stat to its own precision', () => {
    const byKey = Object.fromEntries([...SABER_HITTING, ...SABER_PITCHING].map(c => [c.key, c]))
    expect(formatSaber(219.784, byKey.wRcPlus)).toBe('220') // wRC+, whole
    expect(formatSaber(0.475734, byKey.woba)).toBe('.476') // wOBA, leading zero dropped
    expect(formatSaber(11.327, byKey.war)).toBe('11.3') // WAR, one decimal
    expect(formatSaber(3.6928, byKey.fip)).toBe('3.69') // FIP, two decimals
    expect(formatSaber(85.76, byKey.eraMinus)).toBe('86') // ERA−, whole
  })

  it('returns an em dash for missing values', () => {
    expect(formatSaber(null, SABER_HITTING[0])).toBe('—')
    expect(formatSaber('', SABER_HITTING[0])).toBe('—')
  })
})

describe('expectedRows', () => {
  const standard = { avg: '.322', slg: '.701' }
  const saber = { woba: 0.475734 }
  const expected = { avg: '.309', slg: '.721', woba: '.476' }

  it('pairs actual with expected and signs the delta', () => {
    const rows = expectedRows(standard, saber, expected)
    expect(rows.map(r => r.label)).toEqual(['AVG', 'SLG', 'wOBA'])
    const avg = rows[0]
    expect(avg).toMatchObject({ actual: '.322', expected: '.309', over: true })
    expect(avg.delta).toBe('+.013') // out-performing xBA
  })

  it('marks under-performance (actual below expected)', () => {
    const slg = expectedRows(standard, saber, expected)[1]
    expect(slg).toMatchObject({ actual: '.701', expected: '.721', over: false })
    expect(slg.delta).toBe('−.020')
  })

  it('pulls actual wOBA from sabermetrics, not the standard line', () => {
    const woba = expectedRows(standard, saber, expected)[2]
    expect(woba.actual).toBe('.476') // from saber.woba
  })

  it('returns nothing when there is no expected block', () => {
    expect(expectedRows(standard, saber, null)).toEqual([])
  })
})
