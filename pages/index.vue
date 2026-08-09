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
    </div>

    <p v-if="!error" class="mb-6 max-w-2xl text-sm text-chalk-dim">
      Tap any team to see its roster and player stat lines. The amber lamp marks
      each division leader.
    </p>

    <!-- Loading -->
    <div v-if="pending && !data" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="n in 6"
        :key="n"
        class="h-64 animate-pulse border border-seam bg-panel/50"
      />
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="border-l-4 border-clay border-y border-r border-y-seam border-r-seam bg-panel px-5 py-6"
    >
      <h2 class="nameplate text-lg text-clay">The board went dark</h2>
      <p class="mt-1 text-sm text-chalk-dim">
        Couldn’t reach the MLB API just now. Check your connection and try again.
      </p>
      <button
        class="nameplate mt-4 border border-seam bg-field-deep px-3 py-2 text-xs tracking-wider text-chalk transition-colors hover:border-bulb hover:text-bulb"
        @click="refresh()"
      >
        Try again
      </button>
    </div>

    <!-- The board, split into league sections -->
    <div v-else-if="data" class="space-y-10">
      <section v-for="section in sections" :key="section.key">
        <!-- Section banner: painted label with a metal divider rule -->
        <div class="mb-4 flex items-center gap-3">
          <span class="bulb inline-block h-2 w-2 shrink-0" aria-hidden="true" />
          <h2 class="nameplate shrink-0 text-xs tracking-[0.28em] text-chalk">
            {{ section.label }}
          </h2>
          <span class="h-0.5 flex-1 bg-seam" aria-hidden="true" />
        </div>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DivisionTable
            v-for="division in section.divisions"
            :key="division.divisionId"
            :division="division"
          />
        </div>
      </section>
    </div>
  </div>
</template>
