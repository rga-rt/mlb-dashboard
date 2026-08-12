<script setup lang="ts">
import type { ScoreboardGame, ScoreboardResponse } from '~/types/mlb'

const { data, pending, error, refresh } = await useFetch<ScoreboardResponse>('/api/scoreboard')

// The board polls itself so scores tick over without a manual reload. It runs
// only in the browser, only while the tab is visible, and clears on unmount —
// a hidden tab shouldn't keep hammering the API.
const POLL_MS = 30_000
let pollTimer: ReturnType<typeof setInterval> | undefined

function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    // Don't stack a fetch on top of one already in flight.
    if (!pending.value) refresh()
  }, POLL_MS)
}
function stopPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = undefined
}
function onVisibility() {
  if (document.hidden) {
    stopPolling()
  }
  else {
    refresh() // catch up immediately on return, then resume the interval
    startPolling()
  }
}

onMounted(() => {
  startPolling()
  document.addEventListener('visibilitychange', onVisibility)
})
onBeforeUnmount(() => {
  stopPolling()
  document.removeEventListener('visibilitychange', onVisibility)
})

// "Posted HH:MM" freshness stamp, set client-side only so the time never
// mismatches between server and client render. Flashes amber when a poll lands.
const lastUpdated = ref<Date | null>(null)
const justUpdated = ref(false)
let flashTimer: ReturnType<typeof setTimeout> | undefined
function markUpdated() {
  if (error.value || !data.value) return
  lastUpdated.value = new Date()
  justUpdated.value = true
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (justUpdated.value = false), 1200)
}
onMounted(markUpdated)
watch(pending, (now: boolean, was: boolean) => {
  if (was && !now) markUpdated()
})
onBeforeUnmount(() => clearTimeout(flashTimer))

const postedLabel = computed(() =>
  lastUpdated.value
    ? lastUpdated.value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null,
)

// The day's games split into labeled sections, in reading order: what's on now,
// what's coming, what's done. A section only appears when it has games.
const sections = computed(() => {
  const games = data.value?.games ?? []
  const groups: { key: string; label: string; games: ScoreboardGame[] }[] = [
    { key: 'live', label: 'scoreboard.live', games: games.filter(g => g.status === 'live') },
    { key: 'upcoming', label: 'scoreboard.upcoming', games: games.filter(g => g.status === 'scheduled' || g.status === 'other') },
    { key: 'final', label: 'scoreboard.final', games: games.filter(g => g.status === 'final') },
  ]
  return groups.filter(s => s.games.length > 0)
})

useHead({ title: 'Live Today — MLB scoreboard' })
</script>

<template>
  <div>
    <!-- Hero: headline plus a manual refresh and the freshness stamp -->
    <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="nameplate flex items-center gap-2 text-xs tracking-[0.3em] text-chalk-dim">
          <span class="bulb inline-block h-2 w-2" aria-hidden="true" />
          {{ $t('scoreboard.eyebrow') }}
        </p>
        <h1 class="nameplate mt-2 text-5xl leading-[0.85] text-chalk md:text-6xl">
          {{ $t('scoreboard.title') }}
        </h1>
      </div>
      <div class="flex flex-col items-end gap-1.5">
        <button
          class="nameplate border border-seam bg-field-deep px-3 py-2 text-xs tracking-wider text-chalk-dim transition-colors hover:border-bulb hover:text-bulb focus:border-bulb focus:text-bulb focus:outline-none"
          :disabled="pending"
          @click="refresh()"
        >
          {{ pending ? $t('board.refreshing') : $t('board.refresh') }}
        </button>
        <p
          v-if="postedLabel"
          aria-live="polite"
          class="nameplate text-[11px] tracking-wider transition-colors duration-500"
          :class="justUpdated ? 'text-bulb' : 'text-chalk-dim'"
        >
          {{ $t('board.posted', { time: postedLabel }) }}
        </p>
      </div>
    </div>

    <p v-if="!error || data" class="mb-6 max-w-2xl text-sm text-chalk-dim">
      {{ $t('scoreboard.intro') }}
    </p>

    <!-- Poll/refresh failed but we still have a board: keep it, banner above. -->
    <div
      v-if="error && data"
      role="alert"
      class="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border border-clay/50 bg-panel px-4 py-3"
    >
      <span class="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-clay/80 ring-1 ring-clay" aria-hidden="true" />
      <p class="min-w-0 flex-1 text-sm text-chalk-dim">{{ $t('scoreboard.refreshFailed') }}</p>
      <button
        class="nameplate shrink-0 border border-seam bg-field-deep px-3 py-1.5 text-xs tracking-wider text-chalk transition-colors hover:border-bulb hover:text-bulb focus:border-bulb focus:text-bulb focus:outline-none"
        :disabled="pending"
        @click="refresh()"
      >
        {{ pending ? $t('board.refreshing') : $t('board.tryAgain') }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="pending && !data" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="n in 6" :key="n" class="h-40 animate-pulse border border-seam bg-panel/50" />
    </div>

    <!-- First-load error: no board to fall back to -->
    <div v-else-if="error && !data" role="alert" class="border border-clay/50 bg-panel px-5 py-6">
      <h2 class="nameplate flex items-center gap-2 text-lg text-clay">
        <span class="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-clay/80 ring-1 ring-clay" aria-hidden="true" />
        {{ $t('scoreboard.errTitle') }}
      </h2>
      <p class="mt-1 text-sm text-chalk-dim">{{ $t('scoreboard.errBody') }}</p>
      <button
        class="nameplate mt-4 border border-seam bg-field-deep px-3 py-2 text-xs tracking-wider text-chalk transition-colors hover:border-bulb hover:text-bulb focus:border-bulb focus:text-bulb focus:outline-none"
        @click="refresh()"
      >
        {{ $t('board.tryAgain') }}
      </button>
    </div>

    <!-- Loaded, but the schedule is empty (off-day, or too early) -->
    <div v-else-if="data && !sections.length" class="border border-seam bg-panel px-5 py-6">
      <h2 class="nameplate flex items-center gap-2 text-lg text-chalk">
        <span class="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-seam ring-1 ring-line" aria-hidden="true" />
        {{ $t('scoreboard.emptyTitle') }}
      </h2>
      <p class="mt-1 text-sm text-chalk-dim">{{ $t('scoreboard.emptyBody') }}</p>
    </div>

    <!-- The board, split into Live / Upcoming / Final sections -->
    <div v-else-if="data" class="space-y-10">
      <section v-for="section in sections" :key="section.key">
        <div class="mb-4 flex items-center gap-3">
          <span class="bulb inline-block h-2 w-2 shrink-0" aria-hidden="true" />
          <h2 class="nameplate shrink-0 text-xs tracking-[0.28em] text-chalk">{{ $t(section.label) }}</h2>
          <span class="h-0.5 flex-1 bg-seam" aria-hidden="true" />
        </div>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <GameCard v-for="game in section.games" :key="game.gamePk" :game="game" />
        </div>
      </section>
    </div>
  </div>
</template>
