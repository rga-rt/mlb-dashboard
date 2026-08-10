import { describe, expect, it } from 'vitest'
import { teamLogo } from '~/utils/teamLogo'

describe('teamLogo', () => {
  it('builds the MLB static CDN url from a team id', () => {
    expect(teamLogo(143)).toBe('https://www.mlbstatic.com/team-logos/143.svg')
  })

  it('works for Mexican-league team ids the same way', () => {
    expect(teamLogo(562)).toBe('https://www.mlbstatic.com/team-logos/562.svg')
    expect(teamLogo(6483)).toBe('https://www.mlbstatic.com/team-logos/6483.svg')
  })
})
