<script setup lang="ts">
// The shared app masthead. Used by the default layout AND the layout-less
// landing page, so every page's header is identical — one source of truth.
// Desktop shows the nav inline; mobile collapses it behind a burger button that
// expands a stacked menu.
const open = ref(false)

// The nav links, defined once and rendered in both the desktop bar and the
// mobile menu so the two can't drift.
const links = [
  { to: '/standings', key: 'nav.board', bulb: false },
  { to: '/scoreboard', key: 'nav.liveToday', bulb: true },
  { to: '/upcoming', key: 'nav.upcoming', bulb: false },
  { to: '/news', key: 'nav.news', bulb: false },
]

// Close the menu whenever we navigate (a tapped link changes the route), and on
// Escape while it's open.
const route = useRoute()
watch(() => route.fullPath, () => { open.value = false })

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))

// Close the menu on the NEXT frame after a link tap, not synchronously:
// collapsing it mid-tap moves the tapped link out from under the finger and can
// cancel the navigation on touch. (Cross-page taps also get closed by the route
// watcher above; this also covers tapping a link to the current page.)
function closeAfterTap() {
  requestAnimationFrame(() => { open.value = false })
}
</script>

<template>
  <!-- Masthead: the metal header channel bolted across the top of the board -->
  <header class="border-b-2 border-seam bg-field-deep">
    <div class="mx-auto flex max-w-6xl items-center gap-x-4 px-4 py-4 md:px-6">
      <NuxtLinkLocale to="/" class="group mr-auto flex items-center gap-3">
        <!-- The lit bulb: the one amber accent the whole design leans on -->
        <span class="bulb inline-block h-3.5 w-3.5" aria-hidden="true" />
        <span class="nameplate text-xl leading-none text-chalk sm:text-2xl md:text-3xl">
          The Scoreboard
        </span>
      </NuxtLinkLocale>

      <!-- Desktop: inline nav -->
      <nav class="hidden items-center gap-1 sm:flex" :aria-label="$t('nav.primary')">
        <NuxtLinkLocale
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="nameplate flex items-center gap-1.5 whitespace-nowrap px-2.5 py-2 text-[11px] tracking-widest text-chalk-dim transition-colors hover:text-bulb"
          active-class="text-bulb"
        >
          <span v-if="l.bulb" class="bulb inline-block h-1.5 w-1.5" aria-hidden="true" />
          {{ $t(l.key) }}
        </NuxtLinkLocale>
      </nav>

      <LangSwitch />

      <!-- Mobile: burger toggle -->
      <button
        type="button"
        class="tap-target -mr-1.5 flex items-center p-1.5 text-chalk transition-colors hover:text-bulb focus-visible:text-bulb focus:outline-none sm:hidden"
        :aria-expanded="open"
        aria-controls="mobile-nav"
        :aria-label="$t('nav.menu')"
        @click="open = !open"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
          <template v-if="!open">
            <line x1="3" y1="6.5" x2="19" y2="6.5" />
            <line x1="3" y1="11" x2="19" y2="11" />
            <line x1="3" y1="15.5" x2="19" y2="15.5" />
          </template>
          <template v-else>
            <line x1="5" y1="5" x2="17" y2="17" />
            <line x1="17" y1="5" x2="5" y2="17" />
          </template>
        </svg>
      </button>
    </div>

    <!-- Mobile: expandable menu. max-height 0->80 slides it open (it settles at
         its content height); overflow-hidden clips it (and its top border) when
         collapsed. -->
    <nav
      id="mobile-nav"
      class="overflow-hidden transition-[max-height] duration-200 ease-out sm:hidden"
      :class="open ? 'max-h-80' : 'max-h-0'"
      :aria-label="$t('nav.primary')"
    >
      <ul class="mx-auto max-w-6xl divide-y divide-seam border-t border-seam px-4 md:px-6">
        <li v-for="l in links" :key="l.to">
          <NuxtLinkLocale
            :to="l.to"
            class="nameplate flex items-center gap-2 py-3.5 text-xs tracking-widest text-chalk-dim transition-colors hover:text-bulb"
            active-class="text-bulb"
            @click="closeAfterTap"
          >
            <span v-if="l.bulb" class="bulb inline-block h-1.5 w-1.5" aria-hidden="true" />
            {{ $t(l.key) }}
          </NuxtLinkLocale>
        </li>
      </ul>
    </nav>
  </header>
</template>
