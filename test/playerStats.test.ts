import { describe, expect, it } from 'vitest'
import type { StatLine, TeamStatEntry } from '~/types/mlb'
import { HITTING_COLUMNS, PITCHING_COLUMNS, columnsFor, compareToTeam, ordinal, statValue } from '~/utils/playerStats'

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

describe('compareToTeam', () => {
  const team: TeamStatEntry[] = [
    { personId: 1, name: 'Ace', stats: { homeRuns: 30, era: '2.00' } },
    { personId: 2, name: 'Mid', stats: { homeRuns: 20, era: '3.50' } },
    { personId: 3, name: 'Low', stats: { homeRuns: 10, era: '5.00' } },
  ]

  it('ranks a higher-is-better stat and fills the gauge against the team best', () => {
    const [hr] = compareToTeam(team, 2, [{ key: 'homeRuns', label: 'HR' }])
    expect(hr).toMatchObject({ value: '20', rank: 2, total: 3, isLeader: false })
    expect(hr.fill).toBeCloseTo(20 / 30) // relative to the 30-HR leader
  })

  it('flips ranking and gauge for a lower-is-better stat', () => {
    const [era] = compareToTeam(team, 1, [{ key: 'era', label: 'ERA', lowerBetter: true }])
    expect(era).toMatchObject({ rank: 1, isLeader: true }) // 2.00 is best
    expect(era.fill).toBeCloseTo(1) // leader gets a full bar
    const [eraLow] = compareToTeam(team, 3, [{ key: 'era', label: 'ERA', lowerBetter: true }])
    expect(eraLow.rank).toBe(3)
    expect(eraLow.fill).toBeCloseTo(2 / 5) // best (2.00) over own (5.00)
  })

  it('marks a player absent from the pool without a rank', () => {
    const [row] = compareToTeam(team, 99, [{ key: 'homeRuns', label: 'HR' }])
    expect(row).toMatchObject({ value: '—', rank: null, total: 3, fill: 0 })
  })

  it('counts only teammates who have the stat toward the total', () => {
    const sparse: TeamStatEntry[] = [...team, { personId: 4, name: 'None', stats: {} }]
    const [hr] = compareToTeam(sparse, 1, [{ key: 'homeRuns', label: 'HR' }])
    expect(hr.total).toBe(3) // player 4 has no HR value
    expect(hr.rank).toBe(1)
  })
})

describe('ordinal', () => {
  it('suffixes ones normally', () => {
    expect([1, 2, 3, 4].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th'])
  })
  it('handles the 11–13 exceptions', () => {
    expect([11, 12, 13, 21].map(ordinal)).toEqual(['11th', '12th', '13th', '21st'])
  })
})
