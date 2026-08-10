<script setup lang="ts">
import type { PlayerResponse, RosterPlayer, RosterResponse, StatLine, TeamInfoResponse, TeamStatEntry, TeamStatsResponse } from '~/types/mlb'
import { HITTING_COMPARE, PITCHING_COMPARE, compareToTeam } from '~/utils/playerStats'
import { isActive } from '~/utils/roster'

const route = useRoute()
const teamId = computed(() => route.params.id as string)

// Season carries over from the board link (?season=YYYY) and can be changed
// here. Clamp to the same last-five-years list the dropdown offers.
const seasons = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
const qSeason = Number(route.query.season)
const season = ref(seasons.includes(qSeason) ? qSeason : seasons[0])

// Season is in the URL itself so useFetch refetches whenever it changes.
const { data: roster, pending, error } = await useFetch<RosterResponse>(
  () => `/api/roster/${teamId.value}?season=${season.value}`,
)

// Club + ballpark info for the header panel. Independent of the roster, so a
// failure here just hides the panel rather than blocking the page.
const { data: teamInfo } = await useFetch<TeamInfoResponse>(
  () => `/api/team/${teamId.value}?season=${season.value}`,
)

// Group a set of players into lineup-card sections by position type.
const GROUP_ORDER = ['Pitcher', 'Catcher', 'Infielder', 'Outfielder', 'Two-Way Player', 'Hitter']
function groupByPosition(players: RosterPlayer[]) {
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
}

// Split the full-season roster: the active 26 ("regular players") vs everyone
// else (injured, optioned to the minors, traded away, ...).
const activeGroups = computed(() => groupByPosition((roster.value?.players ?? []).filter(isActive)))
const reserveGroups = computed(() => groupByPosition((roster.value?.players ?? []).filter((p: RosterPlayer) => !isActive(p))))

// Selected player + their stats (fetched on demand).
const selectedId = ref<number | null>(null)
const player = ref<PlayerResponse | null>(null)
const playerPending = ref(false)
const playerError = ref(false)

// Team-wide season stats for the "team rank" panel. Fetched once per
// group+season and cached, so switching players doesn't refetch the pool.
const teamStatsCache = ref<Record<string, TeamStatEntry[]>>({})
const teamStats = ref<TeamStatEntry[] | null>(null)
const teamStatsPending = ref(false)

// Rank a pitcher on pitching, everyone else on hitting — whichever line they
// actually have.
const compareGroup = computed<'hitting' | 'pitching' | null>(() => {
  const groups = player.value?.lines.map((l: StatLine) => l.group) ?? []
  if (player.value?.positionAbbr === 'P' && groups.includes('pitching')) return 'pitching'
  if (groups.includes('hitting')) return 'hitting'
  if (groups.includes('pitching')) return 'pitching'
  return null
})

// The pool to rank against: the fetched team, plus the selected player folded
// in from their own line if the team-stats call happened to omit them.
const comparePool = computed<TeamStatEntry[]>(() => {
  const pool = teamStats.value ?? []
  const id = selectedId.value
  const group = compareGroup.value
  if (!id || !group) return pool
  if (pool.some((p: TeamStatEntry) => p.personId === id)) return pool
  const line = player.value?.lines.find((l: StatLine) => l.group === group)
  return line ? [...pool, { personId: id, name: player.value!.name, stats: line.stats }] : pool
})

const compareRows = computed(() => {
  const group = compareGroup.value
  if (!group || !selectedId.value || comparePool.value.length === 0) return []
  return compareToTeam(comparePool.value, selectedId.value, group === 'pitching' ? PITCHING_COMPARE : HITTING_COMPARE)
})

async function loadTeamStats() {
  const group = compareGroup.value
  if (!group) {
    teamStats.value = null
    return
  }
  const sportId = roster.value?.sportId ?? 1
  const key = `${group}:${season.value}:${sportId}`
  if (teamStatsCache.value[key]) {
    teamStats.value = teamStatsCache.value[key]
    return
  }
  teamStatsPending.value = true
  try {
    const res = await $fetch<TeamStatsResponse>(`/api/team-stats/${teamId.value}`, {
      query: { season: season.value, group, sportId },
    })
    teamStatsCache.value[key] = res.players
    teamStats.value = res.players
  } catch {
    teamStats.value = null
  } finally {
    teamStatsPending.value = false
  }
}

// Hide the logo if the team's CDN logo ever fails to load.
function hideBrokenLogo(e: Event) {
  ;(e.target as HTMLImageElement).style.visibility = 'hidden'
}

async function selectPlayer(id: number) {
  selectedId.value = id
  playerPending.value = true
  playerError.value = false
  player.value = null
  teamStats.value = null
  try {
    player.value = await $fetch<PlayerResponse>(`/api/player/${id}`, {
      query: { season: season.value, sportId: roster.value?.sportId ?? 1 },
    })
    // compareGroup now reflects the loaded player; pull the pool to rank against.
    await loadTeamStats()
  } catch {
    playerError.value = true
  } finally {
    playerPending.value = false
  }
}

// Changing the season refetches the roster (via useFetch) — reload the open
// player's stats for that season too, keeping the selection.
watch(season, () => {
  if (selectedId.value !== null) selectPlayer(selectedId.value)
})
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
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <img
            v-if="roster?.teamId"
            :src="teamLogo(roster.teamId)"
            alt=""
            width="64"
            height="64"
            class="h-14 w-14 shrink-0 object-contain md:h-16 md:w-16"
            @error="hideBrokenLogo"
          >
          <h1 class="nameplate text-5xl leading-[0.85] text-chalk md:text-6xl">
            {{ roster?.teamName ?? 'Loading…' }}
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
        </div>
      </div>

      <BallparkPanel v-if="teamInfo" :info="teamInfo" class="mb-6" />

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <!-- Lineup card: grouped roster -->
        <div class="space-y-6">
          <div v-if="pending" class="space-y-3">
            <div v-for="n in 8" :key="n" class="h-10 animate-pulse border border-seam bg-panel/50" />
          </div>

          <template v-else>
            <!-- Active roster: the regular players -->
            <div class="space-y-5">
              <div class="flex items-center gap-3">
                <span class="bulb inline-block h-1.5 w-1.5" aria-hidden="true" />
                <h2 class="nameplate text-xs tracking-[0.25em] text-chalk-dim">Active Roster</h2>
                <span class="h-px flex-1 bg-seam" aria-hidden="true" />
              </div>
              <RosterGroup
                v-for="group in activeGroups"
                :key="`a-${group.type}`"
                :group="group"
                :selected-id="selectedId"
                @select="selectPlayer"
              />
            </div>

            <!-- Everyone else on the season roster -->
            <div v-if="reserveGroups.length" class="space-y-5">
              <div class="flex items-center gap-3">
                <span class="inline-block h-1.5 w-1.5 bg-chalk-dim/50" aria-hidden="true" />
                <h2 class="nameplate text-xs tracking-[0.25em] text-chalk-dim">Reserves &amp; Inactive</h2>
                <span class="h-px flex-1 bg-seam" aria-hidden="true" />
              </div>
              <RosterGroup
                v-for="group in reserveGroups"
                :key="`r-${group.type}`"
                :group="group"
                :selected-id="selectedId"
                @select="selectPlayer"
              />
            </div>
          </template>
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

              <div v-if="teamStatsPending" class="mt-6 h-40 animate-pulse border border-seam bg-panel/50" />
              <TeamRankPanel
                v-else-if="compareRows.length"
                class="mt-6"
                :rows="compareRows"
                :team-name="roster?.teamName ?? 'team'"
                :group="compareGroup ?? ''"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
