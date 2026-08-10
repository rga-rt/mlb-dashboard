import type { RosterPlayer } from '~/types/mlb'

/** A player is "regular" when they're on the active roster. */
export function isActive(p: RosterPlayer): boolean {
  return p.status === 'Active'
}

/**
 * A short badge for a non-active roster status — the MLB feed's descriptions
 * ("Injured 60-Day", "Reassigned to Minors", "Traded", ...) are too long to
 * sit next to a name.
 */
export function rosterStatusLabel(status: string): string {
  const s = status.toLowerCase()
  if (s.includes('injur')) return 'IL'
  if (s.includes('minor')) return 'Minors'
  if (s.includes('assignment')) return 'DFA'
  if (s.includes('traded')) return 'Traded'
  if (s.includes('free agent')) return 'FA'
  if (s.includes('restricted')) return 'Restricted'
  if (s.includes('suspend')) return 'Suspended'
  return status
}
