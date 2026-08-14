import type { RouterConfig } from '@nuxt/schema'

// Scroll behavior: the Nuxt defaults (restore on back/forward, honor hashes,
// top otherwise) plus one special case — deep-linking to a player on a team page
// on a narrow screen. There the detail panel sits below the roster, so the
// router's usual scroll-to-top would leave the just-requested player off-screen;
// land on the panel instead. Runs as part of navigation, so it isn't undone by
// the page's own scroll like an onMounted scroll would be.
export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, top: 16 }

    // Same page, only the query changed (selecting/closing a player, switching
    // season): leave the scroll where it is; the page scrolls itself if needed.
    if (to.path === from.path) return false

    // Arriving at a team page with a preselected player, on a phone/tablet.
    if (
      to.query.player
      && /\/team\//.test(to.path)
      && import.meta.client
      && window.innerWidth < 1024
    ) {
      return { el: '#player-detail', top: 12 }
    }

    return { top: 0 }
  },
}
