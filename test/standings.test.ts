import { describe, expect, it } from 'vitest'
import { flattenStandings, orderDivisions } from '~/server/utils/mlb'

// A minimal shape of the raw MLB /standings records array.
const rawRecords = [
  {
    division: { id: 201 }, // AL East
    league: { id: 103 },
    teamRecords: [
      { team: { id: 147, name: 'Yankees' }, wins: 90, losses: 60, winningPercentage: '.600', gamesBack: '2.0', divisionRank: '2', divisionLeader: false, streak: { streakCode: 'W1' } },
      { team: { id: 141, name: 'Blue Jays' }, wins: 92, losses: 58, winningPercentage: '.613', gamesBack: '-', divisionRank: '1', divisionLeader: true },
    ],
  },
  {
    // LMP: divisionless — division id is absent, so it keys off the league id.
    league: { id: 132 },
    teamRecords: [
      { team: { id: 6483, name: 'Nayarit' }, wins: 30, losses: 20 },
    ],
  },
]

describe('flattenStandings', () => {
  const divisions = flattenStandings(rawRecords)

  it('maps division metadata from the id', () => {
    expect(divisions[0].divisionName).toBe('AL East')
    expect(divisions[0].league).toBe('AL')
  })

  it('orders teams within a division by rank so the leader is first', () => {
    expect(divisions[0].teams.map(t => t.name)).toEqual(['Blue Jays', 'Yankees'])
    expect(divisions[0].teams[0].divisionLeader).toBe(true)
  })

  it('fills defaults for missing team fields instead of throwing', () => {
    const nayarit = divisions[1].teams[0]
    expect(nayarit).toMatchObject({
      name: 'Nayarit',
      pct: '.000', // winningPercentage missing -> default
      gamesBack: '-', // missing -> default
      streak: '-', // missing -> default
      divisionRank: '-', // missing -> default
      divisionLeader: false, // missing -> default
    })
  })

  it('keys a divisionless league (LMP) off its league id', () => {
    expect(divisions[1].divisionId).toBe(132)
    expect(divisions[1].league).toBe('LMP')
    expect(divisions[1].divisionName).toBe('Liga Mexicana del Pacífico')
  })
})

describe('orderDivisions', () => {
  it('puts Mexican leagues (222, 223, 132) ahead of MLB divisions', () => {
    const input = [201, 132, 205, 222].map(id => ({ divisionId: id, divisionName: '', league: 'AL', teams: [] }))
    // @ts-expect-error minimal Division shape is enough for ordering
    const ordered = orderDivisions(input).map(d => d.divisionId)
    expect(ordered).toEqual([222, 132, 201, 205])
  })

  it('does not mutate the input array', () => {
    const input = [{ divisionId: 201 }, { divisionId: 222 }]
    // @ts-expect-error minimal Division shape is enough for ordering
    orderDivisions(input)
    expect(input.map(d => d.divisionId)).toEqual([201, 222])
  })
})
