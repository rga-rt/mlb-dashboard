import { describe, expect, it } from 'vitest'
import { flattenTransaction } from '~/server/utils/mlb'
import { isInjuryTransaction } from '~/utils/transactions'

describe('flattenTransaction', () => {
  it('flattens a signing, pulling player + destination team ids', () => {
    const tx = flattenTransaction({
      id: 100,
      date: '2024-07-30',
      typeCode: 'SFA',
      typeDesc: 'Signed as Free Agent',
      description: 'Boston Red Sox signed LHP Devin Futrell.',
      person: { id: 690001, fullName: 'Devin Futrell' },
      toTeam: { id: 111, name: 'Boston Red Sox' },
    })
    expect(tx).toEqual({
      id: 100,
      date: '2024-07-30',
      type: 'Signed as Free Agent',
      typeCode: 'SFA',
      description: 'Boston Red Sox signed LHP Devin Futrell.',
      playerName: 'Devin Futrell',
      playerId: 690001,
      teamName: 'Boston Red Sox',
      teamId: 111,
    })
  })

  it('leaves player/team ids null when the feed omits them', () => {
    const tx = flattenTransaction({ id: 1, date: '2024-07-30', typeCode: 'SC', typeDesc: 'Status Change', description: 'x' })
    expect(tx.playerId).toBeNull()
    expect(tx.teamId).toBeNull()
    expect(tx.playerName).toBeNull()
  })
})

describe('isInjuryTransaction', () => {
  it('flags injured-list status changes', () => {
    expect(isInjuryTransaction('SC', 'Arizona placed 1B Christian Walker on the 10-day injured list.')).toBe(true)
    expect(isInjuryTransaction('SC', 'Boston activated RHP Yohan Ramírez from the 15-day injured list.')).toBe(true)
  })

  it('does not flag non-injury status changes or other move types', () => {
    expect(isInjuryTransaction('SC', 'Seattle Mariners activated LF Cade Marlowe.')).toBe(false)
    expect(isInjuryTransaction('TR', 'Team traded a player to the injured list of names.')).toBe(false) // not SC
    expect(isInjuryTransaction('OPT', 'Optioned RHP to Triple-A.')).toBe(false)
  })
})
