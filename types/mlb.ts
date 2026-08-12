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

// Outfield wall distances, in feet. Any may be null — the feed details them
// for MLB parks but often not for Mexican-league venues.
export interface FieldDimensions {
  leftLine: number | null
  leftCenter: number | null
  center: number | null
  rightCenter: number | null
  rightLine: number | null
}

export interface Venue {
  name: string | null
  city: string | null
  state: string | null // state abbreviation when available
  capacity: number | null
  turf: string | null // e.g. "Grass"
  roof: string | null // e.g. "Open"
  dimensions: FieldDimensions
}

// One season of a player's stats, for the year-by-year forecast series.
export interface SeasonStat {
  season: number
  stats: Record<string, string | number>
}

export interface PlayerHistoryResponse {
  personId: number
  group: 'hitting' | 'pitching'
  seasons: SeasonStat[]
}

// A ZiPS full-season projection (projected_Zips) for the season it names.
export interface ZipsProjection {
  season: number
  stats: Record<string, string | number>
}

// Advanced context for the selected player + season: sabermetrics (WAR, wRC+,
// FIP…), the actual standard line and Statcast expected line (for the luck
// read), and the ZiPS projection. Any block may be null when the feed omits it.
export interface PlayerAdvancedResponse {
  personId: number
  group: 'hitting' | 'pitching'
  year: number
  sabermetrics: Record<string, string | number> | null
  standard: Record<string, string | number> | null
  expected: Record<string, string | number> | null
  projection: ZipsProjection | null
}

// --- Live Today (scoreboard) ---------------------------------------------
// Flattened per-game state for the day's board. `live` is only populated for
// games in progress; scheduled games carry probable pitchers, finals carry the
// line score.
export type GameStatus = 'live' | 'final' | 'scheduled' | 'other'

export interface GameSide {
  teamId: number
  name: string
  abbr: string // e.g. "NYY" (falls back to name when the feed omits it)
  runs: number | null // null before first pitch
  probablePitcher: string | null // scheduled games only
  probablePitcherId: number | null // personId, for linking to the player's stats
}

// A single TV / radio / streaming broadcast for a game. `medium` normalizes the
// feed's raw types (TV / AM / FM) down to what a viewer cares about; `side` is
// which club's feed it is (or 'national'). Mexican-league games often carry no
// broadcasts at all — the card simply omits the line then.
export interface Broadcast {
  name: string // e.g. "ESPN", "Bally Sports West", "MLB.TV", "104.3 The Score"
  medium: 'TV' | 'radio'
  national: boolean
  side: 'home' | 'away' | 'national'
}

export interface LiveState {
  inning: number
  inningState: string // "Top" | "Bottom" | "Middle" | "End"
  balls: number
  strikes: number
  outs: number
  onFirst: boolean
  onSecond: boolean
  onThird: boolean
  currentPitcher: string | null
  currentPitcherId: number | null // personId, for linking to the pitcher's stats
  currentPitcherTeamId: number | null // the defending team (pitcher's club)
  currentBatter: string | null
  currentBatterId: number | null // personId, for linking to the batter's stats
  currentBatterTeamId: number | null // the batting team (batter's club)
}

export interface ScoreboardGame {
  gamePk: number
  status: GameStatus
  statusDetail: string // e.g. "In Progress", "Final", "Warmup"
  startTime: string | null // ISO start, for scheduled games
  sport: 'MLB' | 'LMB' | 'LMP'
  home: GameSide
  away: GameSide
  live: LiveState | null // present only when status === 'live'
  broadcasts: Broadcast[] // TV / radio carriers; empty when the feed lists none
  freeGame: boolean // streams free on MLB.TV without a subscription/login
}

export interface ScoreboardResponse {
  date: string // YYYY-MM-DD
  games: ScoreboardGame[]
}

// A single day of the upcoming feed: its date and that day's games (finals
// filtered out — it's a look-ahead).
export interface UpcomingDay {
  date: string // YYYY-MM-DD
  games: ScoreboardGame[]
}

export interface UpcomingResponse {
  start: string // YYYY-MM-DD (inclusive)
  end: string // YYYY-MM-DD (inclusive)
  days: UpcomingDay[] // only days that have games, in date order
}

// --- News (transactions) --------------------------------------------------
// One roster move from MLB's /transactions feed, flattened for the News tab.
// `description` is the feed's ready-made sentence; the player/team ids let the
// move link to the player's stats.
export interface Transaction {
  id: number
  date: string // YYYY-MM-DD
  type: string // typeDesc, e.g. "Trade", "Signed", "Status Change"
  typeCode: string // e.g. "TR", "SC", "OPT"
  description: string
  playerName: string | null
  playerId: number | null
  teamName: string | null
  teamId: number | null // the acting / destination club (toTeam)
}

export interface NewsDay {
  date: string // YYYY-MM-DD
  transactions: Transaction[]
}

export interface NewsResponse {
  start: string // YYYY-MM-DD (inclusive)
  end: string // YYYY-MM-DD (inclusive)
  days: NewsDay[] // newest day first
}

// Club + ballpark info shown on the team page header.
export interface TeamInfoResponse {
  teamId: number
  name: string
  abbreviation: string | null
  location: string | null // e.g. "Bronx"
  firstYearOfPlay: string | null
  league: string | null // e.g. "American League"
  division: string | null // e.g. "American League East"
  venue: Venue
}
