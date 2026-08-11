// Persists the pinned-teams list to localStorage, client-side only. The read
// runs on `app:mounted` — after hydration — so seeding the list from storage is
// a normal reactive update (the board reorders) rather than a hydration
// mismatch against the server's unpinned markup.
const STORAGE_KEY = 'mlb-dashboard:pinned'

export default defineNuxtPlugin((nuxtApp) => {
  const pinned = useState<number[]>('pinnedTeams', () => [])

  nuxtApp.hook('app:mounted', () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          pinned.value = parsed.filter((n): n is number => typeof n === 'number')
        }
      }
    }
    catch {
      // Corrupt or unavailable storage — start from an empty list.
    }

    watch(pinned, (ids: number[]) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
      }
      catch {
        // Storage full or disabled (private mode) — pins just won't persist.
      }
    }, { deep: true })
  })
})
