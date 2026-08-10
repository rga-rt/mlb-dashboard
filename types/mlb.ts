// Flattened shapes returned by our own /api routes (NOT the raw MLB JSON).
// The server routes do the "flatten nested JSON" step so the client stays simple.

export interface TeamRecord {
  teamId: number
  name: string
  wins: number
  losses: number
  pct: string // winningPercentage, e.g. ".612"
  gamesBack: string // "-" for the leader
  streak: string // e.g. "W3"
  divisionRank: string
  divisionLeader: boolean
}

// AL/NL are the two MLB leagues; LMB (Mexican League) and LMP (Liga
// Mexicana del Pacífico, a winter league) are proxied from the same feed.
export type League = 'AL' | 'NL' | 'LMB' | 'LMP'

export interface Division {
  divisionId: number
  divisionName: string
  league: League
  teams: TeamRecord[]
}

export interface StandingsResponse {
  season: number
  divisions: Division[]
}

export interface RosterPlayer {
  personId: number
  name: string
  jersey: string
  position: string // e.g. "Shortstop"
  positionAbbr: string // e.g. "SS"
  positionType: string // "Pitcher" | "Infielder" | "Outfielder" | "Catcher" ...
  status: string // "Active"
}

export interface RosterResponse {
  teamId: number
  teamName: string
  // MLB=1, Mexican League (LMB)=23, LMP=17. Needed to fetch a player's stats
  // from the right sport — season stats default to MLB otherwise.
  sportId: number
  players: RosterPlayer[]
}

// A single stat line (one row of numbers) for hitting or pitching.
export interface StatLine {
  group: 'hitting' | 'pitching' | 'fielding'
  season: string
  stats: Record<string, string | number>
}

export interface PlayerResponse {
  personId: number
  name: string
  position: string
  positionAbbr: string
  teamName: string | null
  bats: string | null
  throws: string | null
  lines: StatLine[]
}

// One player's season stats for a group, as returned by /api/team-stats —
// the pool a selected player is ranked against.
export interface TeamStatEntry {
  personId: number
  name: string
  stats: Record<string, string | number>
}

export interface TeamStatsResponse {
  teamId: number
  season: number
  group: 'hitting' | 'pitching'
  players: TeamStatEntry[]
}
