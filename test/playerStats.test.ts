import { describe, expect, it } from 'vitest'
import type { StatLine } from '~/types/mlb'
import { HITTING_COLUMNS, PITCHING_COLUMNS, columnsFor, statValue } from '~/utils/playerStats'

function line(group: StatLine['group'], stats: Record<string, string | number>): StatLine {
  return { group, season: '2025', stats }
}

describe('columnsFor', () => {
  it('uses the pitching columns for a pitching line', () => {
    expect(columnsFor(line('pitching', {}))).toBe(PITCHING_COLUMNS)
  })

  it('uses the hitting columns for hitting (and anything non-pitching)', () => {
    expect(columnsFor(line('hitting', {}))).toBe(HITTING_COLUMNS)
    expect(columnsFor(line('fielding', {}))).toBe(HITTING_COLUMNS)
  })
})

describe('column definitions', () => {
  it('every column has a label and a non-empty description for the key', () => {
    for (const col of [...HITTING_COLUMNS, ...PITCHING_COLUMNS]) {
      expect(col.label).toBeTruthy()
      expect(col.description.length).toBeGreaterThan(0)
    }
  })
})

describe('statValue', () => {
  const l = line('hitting', { homeRuns: 15, avg: '.291', rbi: 0, empty: '' })

  it('stringifies present values, including zero', () => {
    expect(statValue(l, 'homeRuns')).toBe('15')
    expect(statValue(l, 'avg')).toBe('.291')
    expect(statValue(l, 'rbi')).toBe('0')
  })

  it('returns an em dash for missing or empty values', () => {
    expect(statValue(l, 'stolenBases')).toBe('—') // absent key
    expect(statValue(l, 'empty')).toBe('—') // empty string
  })
})
