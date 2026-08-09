// Team logos come straight from MLB's static CDN, keyed by team id — one
// pattern covers MLB and the Mexican leagues (LMB, LMP) alike. Images load
// fine cross-origin in an <img>, so unlike the JSON API we don't proxy these
// through the server. Auto-imported by Nuxt (~/utils).
export function teamLogo(teamId: number): string {
  return `https://www.mlbstatic.com/team-logos/${teamId}.svg`
}
