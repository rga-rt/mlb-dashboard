<script setup lang="ts">
import type { StandingsResponse } from '~/types/mlb'

// The current season plus the four prior years. `season` is a ref, so passing
// it in `query` makes useFetch re-run whenever the dropdown changes.
const seasons = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
const season = ref(seasons[0])

const { data, pending, error, refresh } = await useFetch<StandingsResponse>(
  '/api/standings',
  { query: { season } },
)

// "Posted HH:MM" freshness stamp. On a board reading a live API, freshness IS
// the status — this is how a user knows a Refresh actually did something.
// Set client-side only (onMounted + the pending true→false edge) so the time
// string never mismatches between server and client render.
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

// Split the board into labeled sections — the Mexican leagues, then MLB — each
// with its own divider. A section only appears when it has divisions for the
// requested season (LMP, a winter league, is often absent).
const MEXICAN = new Set(['LMB', 'LMP'])
const sections = computed(() => {
  const divisions = data.value?.divisions ?? []
  return [
    { key: 'mex', label: 'Ligas Mexicanas', divisions: divisions.filter(d => MEXICAN.has(d.league)) },
    { key: 'mlb', label: 'Major League Baseball', divisions: divisions.filter(d => !MEXICAN.has(d.league)) },
  ].filter(s => s.divisions.length > 0)
})

// Key to the standings column abbreviations.
const LEGEND = [
  { abbr: 'W', label: 'Wins' },
  { abbr: 'L', label: 'Losses' },
  { abbr: 'PCT', label: 'Winning percentage' },
  { abbr: 'GB', label: 'Games behind the leader' },
]
</script>

<template>
  <div>
    <!-- Hero: the board's headline, plus season + a manual refresh -->
    <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="nameplate flex items-center gap-2 text-xs tracking-[0.3em] text-chalk-dim">
          <span class="bulb inline-block h-2 w-2" aria-hidden="true" />
          Regular Season
        </p>
        <h1 class="nameplate mt-2 flex items-baseline gap-3 text-5xl leading-[0.85] text-chalk md:text-6xl">
          Standings
          <span v-if="data" class="lit digit text-3xl md:text-4xl">’{{ String(data.season).slice(2) }}</span>
        </h1>
      </div>
      <div class="flex flex-col items-end gap-1.5">
        <div class="flex items-stretch gap-2">
          <label class="sr-only" for="season">Season</label>
          <select
            id="season"
            v-model.number="season"
            class="nameplate border border-seam bg-field-deep px-3 py-2 text-xs tracking-wider text-chalk transition-colors hover:border-bulb focus:border-bulb focus:outline-none"
          >
            <option v-for="yr in seasons" :key="yr" :value="yr">{{ yr }}</option>
          </select>
          <button
            class="nameplate border border-seam bg-field-deep px-3 py-2 text-xs tracking-wider text-chalk-dim transition-colors hover:border-bulb hover:text-bulb focus:border-bulb focus:text-bulb focus:outline-none"
            :disabled="pending"
            @click="refresh()"
          >
            {{ pending ? 'Refreshing…' : 'Refresh' }}
          </button>
        </div>
        <!-- Freshness stamp: names when the board last posted, and flashes amber
             for a beat when a refresh lands so a Refresh confirms it did work. -->
        <p
          v-if="postedLabel"
          aria-live="polite"
          class="nameplate text-[10px] tracking-wider transition-colors duration-500"
          :class="justUpdated ? 'text-bulb' : 'text-chalk-dim'"
        >
          Posted {{ postedLabel }}
        </p>
      </div>
    </div>

    <p v-if="!error || data" class="mb-4 max-w-2xl text-sm text-chalk-dim">
      Tap any team for its roster and stat lines, a column heading to sort, or the
      star to follow a team and float it to the top. The amber lamp marks each
      division leader.
    </p>

    <!-- Column legend: what each standings abbreviation means -->
    <dl
      v-if="!error || data"
      class="mb-6 flex flex-wrap gap-x-5 gap-y-1.5 border-l-2 border-seam pl-3 text-xs"
    >
      <div v-for="item in LEGEND" :key="item.abbr" class="flex items-baseline gap-1.5">
        <dt class="nameplate tracking-wider text-chalk">{{ item.abbr }}</dt>
        <dd class="text-chalk-dim">{{ item.label }}</dd>
      </div>
    </dl>

    <!--
      Refresh failed but we still have a board to show — never throw away good
      standings for a transient error. A dismissible-feeling banner sits above
      the still-visible board instead of replacing it.
    -->
    <div
      v-if="error && data"
      role="alert"
      class="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border border-clay/50 bg-panel px-4 py-3"
    >
      <span class="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-clay/80 ring-1 ring-clay" aria-hidden="true" />
      <p class="min-w-0 flex-1 text-sm text-chalk-dim">
        Couldn’t refresh just now — showing the {{ data.season }} board as last loaded.
      </p>
      <button
        class="nameplate shrink-0 border border-seam bg-field-deep px-3 py-1.5 text-xs tracking-wider text-chalk transition-colors hover:border-bulb hover:text-bulb focus:border-bulb focus:text-bulb focus:outline-none"
        :disabled="pending"
        @click="refresh()"
      >
        {{ pending ? 'Refreshing…' : 'Try again' }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="pending && !data" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="n in 6"
        :key="n"
        class="h-64 animate-pulse border border-seam bg-panel/50"
      />
    </div>

    <!-- Error on first load: no board to fall back to -->
    <div
      v-else-if="error && !data"
      role="alert"
      class="border border-clay/50 bg-panel px-5 py-6"
    >
      <h2 class="nameplate flex items-center gap-2 text-lg text-clay">
        <span class="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-clay/80 ring-1 ring-clay" aria-hidden="true" />
        The board went dark
      </h2>
      <p class="mt-1 text-sm text-chalk-dim">
        Couldn’t reach the MLB API just now. Check your connection and try again.
      </p>
      <button
        class="nameplate mt-4 border border-seam bg-field-deep px-3 py-2 text-xs tracking-wider text-chalk transition-colors hover:border-bulb hover:text-bulb focus:border-bulb focus:text-bulb focus:outline-none"
        @click="refresh()"
      >
        Try again
      </button>
    </div>

    <!-- Data loaded, but no divisions posted for this season -->
    <div
      v-else-if="data && !sections.length"
      class="border border-seam bg-panel px-5 py-6"
    >
      <h2 class="nameplate flex items-center gap-2 text-lg text-chalk">
        <span class="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-seam ring-1 ring-line" aria-hidden="true" />
        The board’s not lit yet
      </h2>
      <p class="mt-1 text-sm text-chalk-dim">
        No standings are posted for the {{ data.season }} season yet. Pick another
        year from the dropdown above.
      </p>
    </div>

    <!-- The board, split into league sections -->
    <div v-else-if="data" class="space-y-10">
      <section v-for="section in sections" :key="section.key">
        <!-- Section banner: painted label with a metal divider rule -->
        <div class="mb-4 flex items-center gap-3">
          <span class="bulb inline-block h-2 w-2 shrink-0" aria-hidden="true" />
          <h2
            class="nameplate shrink-0 text-xs tracking-[0.28em] text-chalk"
            :lang="section.key === 'mex' ? 'es' : undefined"
          >
            {{ section.label }}
          </h2>
          <span class="h-0.5 flex-1 bg-seam" aria-hidden="true" />
        </div>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DivisionTable
            v-for="division in section.divisions"
            :key="division.divisionId"
            :division="division"
            :season="data.season"
          />
        </div>
      </section>
    </div>
  </div>
</template>
