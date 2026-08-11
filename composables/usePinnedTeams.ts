// Shared "teams I follow" state. The list is SSR-safe shared state (empty on
// the server) via useState; the localStorage read/write lives in the
// pinnedTeams.client plugin so it happens once, after hydration. Because a
// teamId is season-stable, pins carry across season changes.
export function usePinnedTeams() {
  const pinned = useState<number[]>('pinnedTeams', () => [])

  const isPinned = (teamId: number): boolean => pinned.value.includes(teamId)

  function toggle(teamId: number): void {
    pinned.value = isPinned(teamId)
      ? pinned.value.filter(id => id !== teamId)
      : [...pinned.value, teamId]
  }

  return { pinned, isPinned, toggle }
}
