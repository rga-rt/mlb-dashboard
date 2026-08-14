import { describe, expect, it } from 'vitest'
import type { Division, TeamRecord } from '~/types/mlb'
import { divisionMatchup, hotColdTeams, lastTenPct, streakValue } from '~/utils/teamForm'

// Minimal team factory — only the fields the form helpers read.
function team(p: Partial<TeamRecord> & { teamId: number }): TeamRecord {
  return {
    teamId: p.teamId,
    name: p.name ?? `Team ${p.teamId}`,
    wins: p.wins ?? 0,
    losses: p.losses ?? 0,
    pct: p.pct ?? '.000',
    gamesBack: p.gamesBack ?? '-',
    streak: p.streak ?? '-',
    divisionRank: p.divisionRank ?? '1',
    divisionLeader: p.divisionLeader ?? false,
    lastTenWins: p.lastTenWins ?? 0,
    lastTenLosses: p.lastTenLosses ?? 0,
  }
}

describe('lastTenPct', () => {
  it('is wins / games, and 0 with no games', () => {
    expect(lastTenPct(team({ teamId: 1, lastTenWins: 7, lastTenLosses: 3 }))).toBeCloseTo(0.7)
    expect(lastTenPct(team({ teamId: 2, lastTenWins: 0, lastTenLosses: 0 }))).toBe(0)
  })
})

describe('streakValue', () => {
  it('is signed by streak direction', () => {
    expect(streakValue('W6')).toBe(6)
    expect(streakValue('L3')).toBe(-3)
    expect(streakValue('-')).toBe(0)
  })
})

describe('hotColdTeams', () => {
  const teams = [
    team({ teamId: 1, lastTenWins: 9, lastTenLosses: 1, streak: 'W6' }),
    team({ teamId: 2, lastTenWins: 8, lastTenLosses: 2, streak: 'W4' }),
    team({ teamId: 3, lastTenWins: 8, lastTenLosses: 2, streak: 'W2' }), // ties #2 on L10, colder streak
    team({ teamId: 4, lastTenWins: 5, lastTenLosses: 5, streak: 'L1' }),
    team({ teamId: 5, lastTenWins: 2, lastTenLosses: 8, streak: 'L3' }),
    team({ teamId: 6, lastTenWins: 1, lastTenLosses: 9, streak: 'L5' }),
  ]

  it('ranks hot by L10 then streak, and cold worst-first', () => {
    const { hot, cold } = hotColdTeams(teams, 2)
    expect(hot.map(t => t.teamId)).toEqual([1, 2]) // #2 beats #3 on the streak tiebreak
    expect(cold.map(t => t.teamId)).toEqual([6, 5]) // worst first
  })

  it('never repeats a team across hot and cold when the field is small', () => {
    const { hot, cold } = hotColdTeams(teams.slice(0, 3), 2)
    const ids = new Set([...hot, ...cold].map(t => t.teamId))
    expect(ids.size).toBe(hot.length + cold.length) // no overlap
    expect(hot.length + cold.length).toBeLessThanOrEqual(3)
  })
})

describe('divisionMatchup', () => {
  it('returns rank 1 vs rank 2 regardless of array order', () => {
    const division = {
      teams: [
        team({ teamId: 2, name: 'Yankees', divisionRank: '2' }),
        team({ teamId: 1, name: 'Rays', divisionRank: '1' }),
        team({ teamId: 3, name: 'Jays', divisionRank: '3' }),
      ],
    } as Division
    const m = divisionMatchup(division)
    expect(m?.leader.name).toBe('Rays')
    expect(m?.runnerUp.name).toBe('Yankees')
  })

  it('returns null for a one-team division', () => {
    expect(divisionMatchup({ teams: [team({ teamId: 1 })] } as Division)).toBeNull()
  })
})
