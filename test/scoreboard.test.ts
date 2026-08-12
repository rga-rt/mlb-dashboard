import { describe, expect, it } from 'vitest'
import { flattenScoreboardGame, gameStatus, sortScoreboard } from '~/server/utils/mlb'
import type { ScoreboardGame } from '~/types/mlb'

describe('gameStatus', () => {
  it('maps the feed\'s abstractGameState to our enum', () => {
    expect(gameStatus('Live')).toBe('live')
    expect(gameStatus('Final')).toBe('final')
    expect(gameStatus('Preview')).toBe('scheduled')
  })

  it('falls back to "other" for anything unexpected or missing', () => {
    expect(gameStatus('Suspended')).toBe('other')
    expect(gameStatus('')).toBe('other')
    expect(gameStatus(null)).toBe('other')
  })
})

describe('flattenScoreboardGame', () => {
  // A raw in-progress game with a full linescore, as /schedule returns it under
  // hydrate=linescore,team,probablePitcher.
  const liveRaw = {
    gamePk: 745,
    gameDate: '2026-08-12T23:05:00Z',
    status: { abstractGameState: 'Live', detailedState: 'In Progress' },
    teams: {
      away: { team: { id: 147, name: 'New York Yankees', abbreviation: 'NYY' }, score: 4 },
      home: { team: { id: 111, name: 'Boston Red Sox', abbreviation: 'BOS' }, score: 3 },
    },
    linescore: {
      currentInning: 7,
      inningState: 'Top',
      balls: 2,
      strikes: 1,
      outs: 2,
      offense: { batter: { fullName: 'Rafael Devers' }, first: { id: 1 }, third: { id: 2 } },
      defense: { pitcher: { fullName: 'Gerrit Cole' } },
    },
  }

  it('builds the live quick-state, deriving on-base from offense corners', () => {
    const g = flattenScoreboardGame(liveRaw, 'MLB')
    expect(g.status).toBe('live')
    expect(g.away).toMatchObject({ teamId: 147, abbr: 'NYY', runs: 4 })
    expect(g.home).toMatchObject({ teamId: 111, abbr: 'BOS', runs: 3 })
    expect(g.live).toMatchObject({
      inning: 7,
      inningState: 'Top',
      balls: 2,
      strikes: 1,
      outs: 2,
      onFirst: true,
      onSecond: false, // second base absent from offense ⇒ empty
      onThird: true,
      currentPitcher: 'Gerrit Cole',
      currentBatter: 'Rafael Devers',
    })
  })

  it('leaves live null and runs null for a scheduled game, keeping probables', () => {
    const g = flattenScoreboardGame({
      gamePk: 800,
      gameDate: '2026-08-12T23:05:00Z',
      status: { abstractGameState: 'Preview', detailedState: 'Scheduled' },
      teams: {
        away: { team: { id: 147, name: 'New York Yankees', abbreviation: 'NYY' }, probablePitcher: { fullName: 'Carlos Rodón' } },
        home: { team: { id: 111, name: 'Boston Red Sox', abbreviation: 'BOS' } },
      },
    }, 'MLB')
    expect(g.status).toBe('scheduled')
    expect(g.live).toBeNull()
    expect(g.away.runs).toBeNull()
    expect(g.away.probablePitcher).toBe('Carlos Rodón')
    expect(g.home.probablePitcher).toBeNull()
  })

  it('falls back to the full name when a club has no abbreviation', () => {
    const g = flattenScoreboardGame({
      gamePk: 900,
      status: { abstractGameState: 'Preview', detailedState: 'Scheduled' },
      teams: {
        away: { team: { id: 5000, name: 'Sultanes de Monterrey' } },
        home: { team: { id: 5001, name: 'Diablos Rojos' } },
      },
    }, 'LMB')
    expect(g.away.abbr).toBe('Sultanes de Monterrey')
    expect(g.sport).toBe('LMB')
  })
})

describe('sortScoreboard', () => {
  const mk = (gamePk: number, status: ScoreboardGame['status'], startTime: string | null): ScoreboardGame => ({
    gamePk,
    status,
    statusDetail: '',
    startTime,
    sport: 'MLB',
    home: { teamId: 0, name: '', abbr: '', runs: null, probablePitcher: null },
    away: { teamId: 0, name: '', abbr: '', runs: null, probablePitcher: null },
    live: null,
  })

  it('orders live first, then scheduled by start time, then finals', () => {
    const out = sortScoreboard([
      mk(1, 'final', '2026-08-12T18:00:00Z'),
      mk(2, 'scheduled', '2026-08-12T23:00:00Z'),
      mk(3, 'live', '2026-08-12T20:00:00Z'),
      mk(4, 'scheduled', '2026-08-12T19:00:00Z'),
    ])
    expect(out.map(g => g.gamePk)).toEqual([3, 4, 2, 1])
  })
})
