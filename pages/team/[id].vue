<script setup lang="ts">
import type { PlayerAdvancedResponse, PlayerResponse, RosterPlayer, RosterResponse, StatLine, TeamInfoResponse, TeamStatEntry, TeamStatsResponse } from '~/types/mlb'
import { HITTING_COMPARE, PITCHING_COMPARE, compareToTeam } from '~/utils/playerStats'
import { isActive } from '~/utils/roster'

const route = useRoute()
const router = useRouter()
const teamId = computed(() => route.params.id as string)

// Type-ahead over a ~40-name roster: match on name, jersey, or position.
const rosterFilter = ref('')
function matchesFilter(p: RosterPlayer): boolean {
  const q = rosterFilter.value.trim().toLowerCase()
  if (!q) return true
  return p.name.toLowerCase().includes(q)
    || String(p.jersey ?? '').includes(q)
    || (p.positionAbbr?.toLowerCase().includes(q) ?? false)
}

// Season carries over from the board link (?season=YYYY) and can be changed
// here. Clamp to the same last-five-years list the dropdown offers.
const seasons = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
const qSeason = Number(route.query.season)
const season = ref(seasons.includes(qSeason) ? qSeason : seasons[0])

// Season is in the URL itself so useFetch refetches whenever it changes.
const { data: roster, pending, error, refresh } = await useFetch<RosterResponse>(
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
// else (injured, optioned to the minors, traded away, ...). Both honor the
// type-ahead filter.
const activeGroups = computed(() => groupByPosition((roster.value?.players ?? []).filter((p: RosterPlayer) => isActive(p) && matchesFilter(p))))
const reserveGroups = computed(() => groupByPosition((roster.value?.players ?? []).filter((p: RosterPlayer) => !isActive(p) && matchesFilter(p))))
const hasFilterMatch = computed(() => activeGroups.value.length > 0 || reserveGroups.value.length > 0)

// Selected player + their stats (fetched on demand).
const selectedId = ref<number | null>(null)
const player = ref<PlayerResponse | null>(null)
const advanced = ref<PlayerAdvancedResponse | null>(null)
const playerPending = ref(false)
const playerError = ref(false)
// Advanced is a bonus panel: track its own pending/failed so a network error
// reads as "retry", never as a silently missing panel (vs. genuine no-data).
const advancedPending = ref(false)
const advancedError = ref(false)

// The detail column and a screen-reader status line: on mobile the panel
// updates below the fold, so we scroll it into view and announce the change.
const detailPanel = ref<HTMLElement | null>(null)
// Advanced · Rank · Forecast are grouped under one disclosure, open by default;
// collapsing is available but the analytics lead alongside the stat line.
const analyticsOpen = ref(true)
const selectedName = computed(() =>
  roster.value?.players.find((p: RosterPlayer) => p.personId === selectedId.value)?.name ?? '')
const statusMsg = computed(() => {
  if (playerPending.value) return `Loading ${selectedName.value || 'player'}…`
  if (playerError.value) return `Couldn’t load ${selectedName.value || 'that player'}`
  if (player.value) return `${player.value.name} — stats loaded`
  return ''
})

// Team-wide season stats for the "team rank" panel. Fetched once per
// group+season and cached, so switching players doesn't refetch the pool.
const teamStatsCache = ref<Record<string, TeamStatEntry[]>>({})
const teamStats = ref<TeamStatEntry[] | null>(null)
const teamStatsPending = ref(false)
const teamStatsError = ref(false)

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

// A monotonic token supersedes in-flight fetches: only the latest selection or
// season change commits its results, so a slow or stale-season response can't
// overwrite the current player's data. Manual retries pass no token and default
// to the current one, so they always commit.
let requestId = 0

async function loadTeamStats(rid = requestId) {
  const group = compareGroup.value
  teamStatsError.value = false
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
    teamStatsCache.value[key] = res.players // valid for this key regardless of supersession
    if (rid !== requestId) return
    teamStats.value = res.players
  } catch {
    if (rid !== requestId) return
    teamStats.value = null
    teamStatsError.value = true
  } finally {
    if (rid === requestId) teamStatsPending.value = false
  }
}

// Advanced sabermetrics + ZiPS for the open player. Rank/forecast use the same
// group, so key off compareGroup; a null result just hides the panel.
async function loadAdvanced(id: number, rid = requestId) {
  const group = compareGroup.value
  advancedError.value = false
  if (!group) {
    advanced.value = null
    return
  }
  advancedPending.value = true
  try {
    const res = await $fetch<PlayerAdvancedResponse>(`/api/player-advanced/${id}`, {
      query: { season: season.value, group, sportId: roster.value?.sportId ?? 1 },
    })
    if (rid === requestId) advanced.value = res
  } catch {
    if (rid === requestId) {
      advanced.value = null
      advancedError.value = true
    }
  } finally {
    if (rid === requestId) advancedPending.value = false
  }
}

// Hide the logo if the team's CDN logo ever fails to load.
function hideBrokenLogo(e: Event) {
  ;(e.target as HTMLImageElement).style.visibility = 'hidden'
}

async function selectPlayer(id: number, opts: { fromUrl?: boolean } = {}) {
  const rid = ++requestId
  selectedId.value = id
  playerPending.value = true
  playerError.value = false
  player.value = null
  advanced.value = null
  advancedError.value = false
  teamStats.value = null
  teamStatsError.value = false
  // Mirror the pick into the URL so it survives reload and is shareable, and
  // bring the (mobile) detail panel into view — its skeleton is the feedback.
  if (!opts.fromUrl) syncUrl('push')
  revealDetail()
  try {
    const res = await $fetch<PlayerResponse>(`/api/player/${id}`, {
      query: { season: season.value, sportId: roster.value?.sportId ?? 1 },
    })
    if (rid !== requestId) return // a newer selection/season change superseded this one
    player.value = res
    // compareGroup now reflects the loaded player; pull the pool to rank against.
    await loadTeamStats(rid)
    // Advanced metrics + ZiPS are a bonus panel — a failure here shouldn't
    // knock out the whole player view, so load them separately and swallow.
    loadAdvanced(id, rid)
  } catch {
    if (rid === requestId) playerError.value = true
  } finally {
    if (rid === requestId) playerPending.value = false
  }
}

function deselect(opts: { fromUrl?: boolean } = {}) {
  requestId++ // invalidate any in-flight selection so it can't commit after deselect
  selectedId.value = null
  player.value = null
  advanced.value = null
  advancedError.value = false
  teamStats.value = null
  teamStatsError.value = false
  playerError.value = false
  if (!opts.fromUrl) syncUrl('push')
}

// The lg:sticky panel stays visible on desktop; only the stacked mobile layout
// hides the update below the fold, so scroll to it there (honoring reduced-motion).
function revealDetail() {
  if (!import.meta.client) return
  if (window.matchMedia('(min-width: 1024px)').matches) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  nextTick(() => detailPanel.value?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }))
}

// Whole view state (season + open player) lives in the query string so links
// are shareable and the browser back button steps through selections.
function buildQuery(): Record<string, string> {
  const q: Record<string, string> = { season: String(season.value) }
  if (selectedId.value != null) q.player = String(selectedId.value)
  return q
}
function syncUrl(mode: 'push' | 'replace') {
  router[mode]({ query: buildQuery() })
}

// Changing the season refetches the roster (via useFetch) — reload the open
// player's stats for that season too, keeping the selection. Season swaps
// replace (not push) so they don't stack history entries.
watch(season, () => {
  if (selectedId.value !== null) selectPlayer(selectedId.value, { fromUrl: true })
  syncUrl('replace')
})

// Reconcile browser back/forward: the URL is the source of truth for selection.
watch(() => route.query.player, (val: unknown) => {
  const id = Number(val)
  if (val && Number.isFinite(id)) {
    if (id !== selectedId.value) selectPlayer(id, { fromUrl: true })
  } else if (selectedId.value !== null) {
    deselect({ fromUrl: true })
  }
})
watch(() => route.query.season, (val: unknown) => {
  const n = Number(val)
  if (val && seasons.includes(n) && n !== season.value) season.value = n
})

// Hydrate a shared/bookmarked selection once mounted (player stats are
// client-fetched, so this stays out of SSR).
onMounted(() => {
  const id = Number(route.query.player)
  if (route.query.player && Number.isFinite(id)) selectPlayer(id, { fromUrl: true })
})

function onAnalyticsToggle(e: Event) {
  analyticsOpen.value = (e.target as HTMLDetailsElement).open
}
</script>

<template>
  <div>
    <NuxtLinkLocale
      to="/standings"
      class="nameplate mb-6 inline-flex items-center gap-2 text-xs tracking-wider text-chalk-dim transition-colors hover:text-bulb"
    >
      ← {{ $t('team.back') }}
    </NuxtLinkLocale>

    <div v-if="error" class="border border-clay/50 bg-panel px-5 py-6">
      <h1 class="nameplate text-lg text-clay">{{ $t('team.rosterErrTitle') }}</h1>
      <p class="mt-1 text-sm text-chalk-dim">{{ $t('team.rosterErrBody') }}</p>
      <button
        type="button"
        class="nameplate mt-4 border border-line px-3 py-1.5 text-xs tracking-wider text-chalk-dim transition-colors hover:border-bulb hover:text-bulb focus-visible:border-bulb focus-visible:text-bulb focus:outline-none"
        @click="refresh()"
      >
        {{ $t('team.retry') }}
      </button>
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
            {{ roster?.teamName ?? $t('team.loading') }}
          </h1>
        </div>
        <div class="flex items-stretch gap-2">
          <label class="sr-only" for="season">{{ $t('board.season') }}</label>
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

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <!-- Lineup card: grouped roster -->
        <div class="space-y-6">
          <div v-if="pending" class="space-y-3">
            <div v-for="n in 8" :key="n" class="h-10 animate-pulse border border-seam bg-panel/50" />
          </div>

          <template v-else>
            <div class="relative">
              <label class="sr-only" for="roster-filter">{{ $t('team.filterLabel') }}</label>
              <input
                id="roster-filter"
                v-model="rosterFilter"
                type="search"
                inputmode="search"
                :placeholder="$t('team.filterPlaceholder')"
                class="nameplate w-full border border-seam bg-field-deep px-3 py-2.5 text-xs tracking-wider text-chalk placeholder:text-chalk-dim/70 placeholder:tracking-normal placeholder:normal-case transition-colors hover:border-line focus:border-bulb focus:outline-none"
              >
            </div>

            <p
              v-if="rosterFilter.trim() && !hasFilterMatch"
              class="border border-dashed border-line px-4 py-6 text-center text-sm text-chalk-dim"
            >
              {{ $t('team.noMatch', { q: rosterFilter.trim() }) }}
            </p>

            <!-- Active roster: the regular players -->
            <div v-if="activeGroups.length" class="space-y-5">
              <div class="flex items-center gap-3">
                <span class="bulb inline-block h-1.5 w-1.5" aria-hidden="true" />
                <h2 class="nameplate text-xs tracking-[0.25em] text-chalk-dim">{{ $t('team.activeRoster') }}</h2>
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
                <h2 class="nameplate text-xs tracking-[0.25em] text-chalk-dim">{{ $t('team.reserves') }}</h2>
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

        <!-- Detail panel: selected player's stat lines. Pinned and independently
             scrollable on wide screens so it doesn't run past the viewport. -->
        <div
          ref="detailPanel"
          class="scroll-mt-4 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-1"
        >
          <p class="sr-only" role="status" aria-live="polite">{{ statusMsg }}</p>
          <div
            v-if="!selectedId"
            class="flex h-full min-h-48 items-center justify-center border border-dashed border-line px-6 py-10 text-center"
          >
            <p class="text-sm text-chalk-dim">
              {{ $t('team.emptyPrompt') }}
            </p>
          </div>

          <div v-else>
            <div v-if="playerPending" class="space-y-4">
              <div class="h-8 w-2/3 animate-pulse border border-seam bg-panel/60" />
              <div class="h-32 animate-pulse border border-seam bg-panel/50" />
            </div>

            <div
              v-else-if="playerError"
              class="border border-clay/50 bg-panel px-5 py-6"
            >
              <p class="text-sm text-chalk-dim">{{ $t('team.playerErr') }}</p>
              <button
                type="button"
                class="nameplate mt-4 border border-line px-3 py-1.5 text-xs tracking-wider text-chalk-dim transition-colors hover:border-bulb hover:text-bulb focus-visible:border-bulb focus-visible:text-bulb focus:outline-none"
                @click="selectedId && selectPlayer(selectedId, { fromUrl: true })"
              >
                {{ $t('team.retry') }}
              </button>
            </div>

            <div v-else-if="player">
              <div class="mb-5 flex items-start justify-between gap-4 border-b border-line pb-3">
                <div class="min-w-0">
                  <h3 class="nameplate text-3xl leading-[0.95] text-chalk">{{ player.name }}</h3>
                  <p class="mt-1.5 text-xs text-chalk-dim">
                    {{ player.position }}
                    <template v-if="player.bats || player.throws">
                      · {{ $t('team.bt') }} {{ player.bats ?? '–' }}/{{ player.throws ?? '–' }}
                    </template>
                    <template v-if="player.teamName"> · {{ player.teamName }}</template>
                  </p>
                </div>
                <button
                  type="button"
                  :aria-label="$t('team.closeLabel')"
                  class="nameplate tap-target relative shrink-0 border border-line px-2.5 py-1 text-[11px] tracking-wider text-chalk-dim transition-colors hover:border-bulb hover:text-bulb focus-visible:border-bulb focus-visible:text-bulb focus:outline-none"
                  @click="deselect()"
                >
                  {{ $t('team.close') }}
                </button>
              </div>

              <PlayerStatLine :key="player.personId" :player="player" />

              <!-- Advanced · Rank · Forecast grouped under one disclosure, open by
                   default; collapsible so a scanner can trim the column, and the
                   open state persists across picks. -->
              <details
                v-if="compareGroup"
                class="group/analytics mt-6"
                :open="analyticsOpen"
                @toggle="onAnalyticsToggle"
              >
                <summary
                  class="nameplate flex cursor-pointer list-none items-center gap-2 border-b border-seam pb-2 text-[11px] tracking-[0.25em] text-chalk-dim transition-colors hover:text-chalk focus-visible:text-chalk focus-visible:outline-none"
                >
                  <span class="text-[9px] leading-none transition-transform group-open/analytics:rotate-90" aria-hidden="true">▸</span>
                  {{ $t('team.analytics') }}
                </summary>

                <div class="mt-4 space-y-6">
                  <div v-if="advancedPending" class="h-40 animate-pulse border border-seam bg-panel/50" />
                  <PanelRetry
                    v-else-if="advancedError"
                    :label="$t('team.advancedFailed')"
                    @retry="loadAdvanced(player.personId)"
                  />
                  <AdvancedPanel
                    v-else-if="advanced"
                    :group="advanced.group"
                    :year="advanced.year"
                    :sabermetrics="advanced.sabermetrics"
                    :standard="advanced.standard"
                    :expected="advanced.expected"
                  />

                  <div v-if="teamStatsPending" class="h-40 animate-pulse border border-seam bg-panel/50" />
                  <PanelRetry
                    v-else-if="teamStatsError"
                    :label="$t('team.ranksFailed')"
                    @retry="loadTeamStats()"
                  />
                  <TeamRankPanel
                    v-else-if="compareRows.length"
                    :rows="compareRows"
                    :team-name="roster?.teamName ?? 'team'"
                    :group="compareGroup ?? ''"
                  />

                  <ForecastSection
                    :key="`${player.personId}-${compareGroup}`"
                    :person-id="player.personId"
                    :group="compareGroup"
                    :sport-id="roster?.sportId ?? 1"
                    :projection="advanced?.projection"
                  />
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
