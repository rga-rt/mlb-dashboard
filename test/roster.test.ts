import { describe, expect, it } from 'vitest'
import type { RosterPlayer } from '~/types/mlb'
import { isActive, rosterStatusLabel } from '~/utils/roster'

function player(status: string): RosterPlayer {
  return { personId: 1, name: 'X', jersey: '1', position: '', positionAbbr: '', positionType: '', status }
}

describe('isActive', () => {
  it('is true only for the active roster status', () => {
    expect(isActive(player('Active'))).toBe(true)
    expect(isActive(player('Injured 10-Day'))).toBe(false)
    expect(isActive(player('Reassigned to Minors'))).toBe(false)
  })
})

describe('rosterStatusLabel', () => {
  it('shortens the feed descriptions to a badge', () => {
    expect(rosterStatusLabel('Injured 60-Day')).toBe('IL')
    expect(rosterStatusLabel('Injured 10-Day')).toBe('IL')
    expect(rosterStatusLabel('Reassigned to Minors')).toBe('Minors')
    expect(rosterStatusLabel('Designated for Assignment')).toBe('DFA')
    expect(rosterStatusLabel('Traded')).toBe('Traded')
    expect(rosterStatusLabel('Free Agent')).toBe('FA')
  })

  it('falls back to the raw description when unmapped', () => {
    expect(rosterStatusLabel('Paternity Leave')).toBe('Paternity Leave')
  })
})
