import { describe, expect, it } from 'vitest'
import type { TeamRecord } from '~/types/mlb'
import {
  DEFAULT_SORT,
  nextSort,
  orderTeams,
  partitionPinned,
  sortTeams,
} from '~/utils/teamOrder'

// A compact division: standings order is Jays, Yanks, Sox, Rays.
function team(over: Partial<TeamRecord> & { teamId: number }): TeamRecord {
  return {
    name: `Team ${over.teamId}`,
    wins: 0,
    losses: 0,
    pct: '.000',
    gamesBack: '-',
    streak: 'W1',
    divisionRank: '1',
    divisionLeader: false,
    ...over,
  }
}

const jays = team({ teamId: 141, name: 'Blue Jays', wins: 92, losses: 58, pct: '.613', gamesBack: '-', divisionRank: '1', divisionLeader: true })
const yanks = team({ teamId: 147, name: 'Yankees', wins: 90, losses: 60, pct: '.600', gamesBack: '2.0', divisionRank: '2' })
const sox = team({ teamId: 111, name: 'Red Sox', wins: 84, losses: 66, pct: '.560', gamesBack: '8.0', divisionRank: '3' })
const rays = team({ teamId: 139, name: 'Rays', wins: 84, losses: 66, pct: '.560', gamesBack: '8.0', divisionRank: '4' })

const division = [yanks, jays, rays, sox] // deliberately unsorted input

const ids = (teams: TeamRecord[]) => teams.map(t => t.teamId)

describe('sortTeams', () => {
  it('defaults to standings order (rank ascending)', () => {
    expect(ids(sortTeams(division, DEFAULT_SORT))).toEqual([141, 147, 111, 139])
  })

  it('sorts wins descending / ascending', () => {
    expect(ids(sortTeams(division, { key: 'wins', dir: 'desc' }))).toEqual([141, 147, 111, 139])
    expect(ids(sortTeams(division, { key: 'wins', dir: 'asc' }))).toEqual([111, 139, 147, 141])
  })

  it('parses the string pct column numerically', () => {
    expect(ids(sortTeams(division, { key: 'pct', dir: 'desc' }))).toEqual([141, 147, 111, 139])
  })

  it("treats the leader's gamesBack '-' as zero", () => {
    // Ascending GB puts the leader (—) first.
    expect(ids(sortTeams(division, { key: 'gamesBack', dir: 'asc' }))[0]).toBe(141)
  })

  it('breaks ties on standings rank, ascending regardless of direction', () => {
    // Sox and Rays are tied at 84 wins; rank keeps Sox (3) before Rays (4).
    expect(ids(sortTeams([rays, sox], { key: 'wins', dir: 'desc' }))).toEqual([111, 139])
    expect(ids(sortTeams([rays, sox], { key: 'wins', dir: 'asc' }))).toEqual([111, 139])
  })

  it('sorts team name alphabetically', () => {
    expect(ids(sortTeams(division, { key: 'name', dir: 'asc' }))).toEqual([141, 139, 111, 147])
  })

  it('does not mutate its input', () => {
    const input = [...division]
    sortTeams(input, { key: 'wins', dir: 'asc' })
    expect(ids(input)).toEqual([147, 141, 139, 111])
  })
})

describe('partitionPinned', () => {
  const sorted = sortTeams(division, DEFAULT_SORT) // [141, 147, 111, 139]

  it('floats pinned teams to the top, preserving order within each group', () => {
    const pinned = new Set([111, 139])
    expect(ids(partitionPinned(sorted, id => pinned.has(id)))).toEqual([111, 139, 141, 147])
  })

  it('is a no-op when nothing is pinned', () => {
    expect(ids(partitionPinned(sorted, () => false))).toEqual([141, 147, 111, 139])
  })
})

describe('orderTeams', () => {
  it('sorts first, then floats pins on top of that order', () => {
    const pinned = new Set([139]) // Rays, last by wins
    expect(ids(orderTeams(division, { key: 'wins', dir: 'desc' }, id => pinned.has(id))))
      .toEqual([139, 141, 147, 111])
  })
})

describe('nextSort', () => {
  it('flips direction when the same column is clicked again', () => {
    expect(nextSort({ key: 'wins', dir: 'desc' }, 'wins')).toEqual({ key: 'wins', dir: 'asc' })
    expect(nextSort({ key: 'wins', dir: 'asc' }, 'wins')).toEqual({ key: 'wins', dir: 'desc' })
  })

  it('adopts a new column at its natural default direction', () => {
    expect(nextSort({ key: 'rank', dir: 'asc' }, 'wins')).toEqual({ key: 'wins', dir: 'desc' })
    expect(nextSort({ key: 'wins', dir: 'desc' }, 'losses')).toEqual({ key: 'losses', dir: 'asc' })
    expect(nextSort({ key: 'wins', dir: 'desc' }, 'rank')).toEqual({ key: 'rank', dir: 'asc' })
  })
})
