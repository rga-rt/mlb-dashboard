<script setup lang="ts">
import type { PlayerResponse, RosterPlayer, RosterResponse } from '~/types/mlb'

const route = useRoute()
const teamId = computed(() => route.params.id as string)

const { data: roster, pending, error } = await useFetch<RosterResponse>(
  () => `/api/roster/${teamId.value}`,
)

// Group the roster into lineup-card sections by position type.
const GROUP_ORDER = ['Pitcher', 'Catcher', 'Infielder', 'Outfielder', 'Two-Way Player', 'Hitter']
const groups = computed(() => {
  const players = roster.value?.players ?? []
  const byType = new Map<string, RosterPlayer[]>()
  for (const p of players) {
    const key = p.positionType || 'Other'
    if (!byType.has(key)) byType.set(key, [])
    byType.get(key)!.push(p)
  }
  return [...byType.entries()]
    .sort((a, b) => {
      const ai = GROUP_ORDER.indexOf(a[0])
      const bi = GROUP_ORDER.indexOf(b[0])
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
    .map(([type, list]) => ({ type, list: list.sort((x, y) => x.name.localeCompare(y.name)) }))
})

// Selected player + their stats (fetched on demand).
const selectedId = ref<number | null>(null)
const player = ref<PlayerResponse | null>(null)
const playerPending = ref(false)
const playerError = ref(false)

async function selectPlayer(id: number) {
  selectedId.value = id
  playerPending.value = true
  playerError.value = false
  player.value = null
  try {
    player.value = await $fetch<PlayerResponse>(`/api/player/${id}`)
  } catch {
    playerError.value = true
  } finally {
    playerPending.value = false
  }
}
</script>

<template>
  <div>
    <NuxtLink
      to="/"
      class="nameplate mb-6 inline-flex items-center gap-2 text-xs tracking-wider text-chalk-dim transition-colors hover:text-bulb"
    >
      ← Back to the board
    </NuxtLink>

    <div v-if="error" class="border-l-4 border-clay border-y border-r border-y-seam border-r-seam bg-panel px-5 py-6">
      <h1 class="nameplate text-lg text-clay">Couldn’t load that roster</h1>
      <p class="mt-1 text-sm text-chalk-dim">The team id may be wrong, or the API is unreachable.</p>
    </div>

    <div v-else>
      <h1 class="nameplate mb-6 text-5xl leading-[0.85] text-chalk md:text-6xl">
        {{ roster?.teamName ?? 'Loading…' }}
      </h1>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <!-- Lineup card: grouped roster -->
        <div class="space-y-5">
          <div v-if="pending" class="space-y-3">
            <div v-for="n in 8" :key="n" class="h-10 animate-pulse border border-seam bg-panel/50" />
          </div>

          <section
            v-for="group in groups"
            v-else
            :key="group.type"
            class="border border-seam bg-panel"
          >
            <h2
              class="nameplate border-b-2 border-seam bg-field-deep px-4 py-2.5 text-xs tracking-widest text-chalk-dim"
            >
              {{ group.type }}
            </h2>
            <ul class="divide-y divide-seam">
              <li v-for="p in group.list" :key="p.personId">
                <button
                  class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-field-deep focus:bg-field-deep focus:outline-none"
                  :class="selectedId === p.personId ? 'bg-bulb/5' : ''"
                  @click="selectPlayer(p.personId)"
                >
                  <span
                    class="digit w-8 shrink-0 text-right text-sm"
                    :class="selectedId === p.personId ? 'lit' : 'text-chalk-dim'"
                  >
                    {{ p.jersey || '–' }}
                  </span>
                  <span class="nameplate flex-1 truncate text-[15px] tracking-wide text-chalk">
                    {{ p.name }}
                  </span>
                  <span
                    class="nameplate shrink-0 border border-line px-1.5 py-0.5 text-[10px] tracking-wider text-chalk-dim"
                  >
                    {{ p.positionAbbr }}
                  </span>
                </button>
              </li>
            </ul>
          </section>
        </div>

        <!-- Detail panel: selected player's stat lines -->
        <div class="lg:sticky lg:top-6 lg:self-start">
          <div
            v-if="!selectedId"
            class="flex h-full min-h-48 items-center justify-center border border-dashed border-line px-6 py-10 text-center"
          >
            <p class="text-sm text-chalk-dim">
              Pick a player from the lineup to light up their stat line.
            </p>
          </div>

          <div v-else>
            <div v-if="playerPending" class="space-y-4">
              <div class="h-8 w-2/3 animate-pulse border border-seam bg-panel/60" />
              <div class="h-32 animate-pulse border border-seam bg-panel/50" />
            </div>

            <div
              v-else-if="playerError"
              class="border-l-4 border-clay border-y border-r border-y-seam border-r-seam bg-panel px-5 py-6 text-sm text-chalk-dim"
            >
              Couldn’t load that player’s stats. Try another, or refresh.
            </div>

            <div v-else-if="player">
              <div class="mb-4 border-l-2 border-bulb pl-3">
                <h3 class="nameplate text-2xl leading-none text-chalk">{{ player.name }}</h3>
                <p class="mt-1 text-xs text-chalk-dim">
                  {{ player.position }}
                  <template v-if="player.bats || player.throws">
                    · B/T {{ player.bats ?? '–' }}/{{ player.throws ?? '–' }}
                  </template>
                  <template v-if="player.teamName"> · {{ player.teamName }}</template>
                </p>
              </div>
              <PlayerStatLine :player="player" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
