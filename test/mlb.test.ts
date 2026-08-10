import { describe, expect, it } from 'vitest'
import { DIVISIONS, LEAGUES, currentSeason, pick } from '~/server/utils/mlb'

describe('pick', () => {
  it('returns the value when the key is present and non-null', () => {
    expect(pick({ id: 42 }, 'id')).toBe(42)
    expect(pick({ name: 'Sultanes' }, 'name')).toBe('Sultanes')
    expect(pick({ ok: false }, 'ok')).toBe(false) // falsy but present
    expect(pick({ n: 0 }, 'n')).toBe(0)
  })

  it('falls back when the key is missing, null, or the object is not an object', () => {
    expect(pick({}, 'id')).toBeNull()
    expect(pick({ id: null }, 'id')).toBeNull()
    expect(pick({ id: undefined }, 'id')).toBeNull()
    expect(pick(null, 'id')).toBeNull()
    expect(pick(undefined, 'id')).toBeNull()
    expect(pick('not-an-object', 'id')).toBeNull()
  })

  it('uses a provided fallback instead of null', () => {
    expect(pick({}, 'wins', 0)).toBe(0)
    expect(pick(null, 'name', 'Team')).toBe('Team')
    expect(pick({ teamRecords: undefined }, 'teamRecords', [])).toEqual([])
  })
})

describe('currentSeason', () => {
  it('returns the current calendar year as a number', () => {
    expect(currentSeason()).toBe(new Date().getFullYear())
    expect(typeof currentSeason()).toBe('number')
  })
})

describe('DIVISIONS / LEAGUES maps', () => {
  it('maps the six MLB divisions to AL/NL', () => {
    expect(DIVISIONS[201]).toEqual({ name: 'AL East', league: 'AL' })
    expect(DIVISIONS[203]).toEqual({ name: 'NL West', league: 'NL' })
    expect(Object.keys(DIVISIONS).filter(id => DIVISIONS[Number(id)].league === 'AL')).toHaveLength(3)
    expect(Object.keys(DIVISIONS).filter(id => DIVISIONS[Number(id)].league === 'NL')).toHaveLength(3)
  })

  it('maps the two Mexican League (LMB) zones', () => {
    expect(DIVISIONS[222]).toEqual({ name: 'Mexican League Norte', league: 'LMB' })
    expect(DIVISIONS[223]).toEqual({ name: 'Mexican League Sur', league: 'LMB' })
  })

  it('maps the divisionless LMP by league id', () => {
    expect(LEAGUES[132].league).toBe('LMP')
  })
})
