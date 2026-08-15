<script setup lang="ts">
import type { NextFiveGame, NextFiveResponse } from '~/types/mlb'

// A personalized micro-view of one pinned club's next five games. The caller
// passes the club via `teamId` (rendering one panel per pinned team); it falls
// back to the first pin when omitted. The pin is client-only state, so this
// fetches in the browser and refetches if the tracked club changes.
const props = defineProps<{ teamId?: number }>()
const { t } = useI18n()
const { pinned } = usePinnedTeams()
const teamId = computed<number | null>(() => props.teamId ?? pinned.value[0] ?? null)

const { data, pending, error, refresh } = useLazyFetch<NextFiveResponse>(
  () => `/api/next-five/${teamId.value}`,
  { immediate: false, watch: false },
)
// Refetch when the tracked team changes (e.g. the pin), and once on mount.
watch(teamId, (id: number | null) => { if (id != null) refresh() })

// Dates/times are the viewer's local clock, so resolve them client-side only
// (the server's timezone would differ) — matches the game cards.
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
  if (teamId.value != null) refresh()
})
function dayLabel(iso: string | null): string {
  if (!mounted.value || !iso) return ''
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' })
}
function timeLabel(iso: string | null): string {
  if (!mounted.value || !iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

// "Schlittler vs Cease" — shown only once at least one side is announced (MLB
// posts probables ~2 days out, so the back half of the five often has none).
function probables(g: NextFiveGame): string | null {
  if (!g.myProbable && !g.oppProbable) return null
  const tbd = t('scoreboard.tbd')
  return t('nextfive.probable', { a: g.myProbable ?? tbd, b: g.oppProbable ?? tbd })
}

const winPct = (g: NextFiveGame): number | null => (g.winProb == null ? null : Math.round(g.winProb * 100))
const favored = (g: NextFiveGame): boolean => g.winProb != null && g.winProb > 0.5

function hideBrokenLogo(e: Event) {
  ;(e.target as HTMLImageElement).style.visibility = 'hidden'
}
</script>

<template>
  <section class="min-w-0 border border-seam bg-panel">
    <!-- Header: eyebrow, then the pinned club + record (once loaded) -->
    <div class="border-b-2 border-seam bg-field-deep px-3 py-2.5">
      <p class="nameplate flex items-center gap-2 text-[10px] tracking-[0.28em] text-chalk-dim">
        <span class="bulb inline-block h-1.5 w-1.5" aria-hidden="true" />
        {{ $t('nextfive.eyebrow') }}
      </p>
      <div v-if="data?.team" class="mt-2 flex items-center gap-2.5">
        <img
          :src="teamLogo(data.team.teamId)"
          alt=""
          width="24"
          height="24"
          class="h-6 w-6 shrink-0 object-contain"
          @error="hideBrokenLogo"
        >
        <span class="nameplate min-w-0 truncate text-sm tracking-wide text-chalk">{{ data.team.name }}</span>
        <span class="nameplate ml-auto shrink-0 text-[11px] tracking-wider text-chalk-dim">
          {{ data.team.wins }}–{{ data.team.losses }} · <span class="digit">{{ data.team.pct }}</span>
        </span>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="pending && !data" class="divide-y divide-seam">
      <div v-for="n in 5" :key="n" class="h-11 animate-pulse bg-panel/60" />
    </div>

    <!-- Loaded with games -->
    <ol v-else-if="data && data.games.length" class="divide-y divide-seam">
      <li
        v-for="g in data.games"
        :key="g.gamePk"
        class="flex items-center gap-2.5 px-3 py-2"
      >
        <div class="w-12 shrink-0 leading-tight">
          <div class="nameplate text-[11px] tracking-wide text-chalk">{{ dayLabel(g.date) }}</div>
          <div class="digit text-[10px] text-chalk-dim">{{ timeLabel(g.date) }}</div>
        </div>
        <span class="nameplate w-5 shrink-0 text-[10px] tracking-wider text-chalk-dim">{{ g.home ? 'vs' : '@' }}</span>
        <img
          :src="teamLogo(g.opponent.teamId)"
          alt=""
          width="20"
          height="20"
          class="h-5 w-5 shrink-0 object-contain"
          @error="hideBrokenLogo"
        >
        <span class="nameplate shrink-0 text-[12px] tracking-wide text-chalk">{{ g.opponent.abbr }}</span>
        <span class="min-w-0 flex-1 truncate text-[11px] text-chalk-dim">{{ probables(g) }}</span>
        <span
          v-if="winPct(g) != null"
          class="nameplate digit shrink-0 border px-1.5 py-0.5 text-[10px] leading-none tracking-wider"
          :class="favored(g) ? 'border-bulb/50 bg-bulb/10 text-bulb' : 'border-line/50 text-chalk-dim'"
          :aria-label="$t('nextfive.winAria', { pct: winPct(g) })"
        >{{ winPct(g) }}%</span>
      </li>
    </ol>

    <!-- Loaded, but nothing scheduled (season over, or a long break) -->
    <div v-else-if="data" class="px-3 py-5 text-center text-[12px] text-chalk-dim">
      {{ $t('nextfive.noGames') }}
    </div>

    <!-- Fetch failed -->
    <div v-else-if="error" class="px-3 py-5 text-center text-[12px] text-chalk-dim">
      {{ $t('nextfive.failed') }}
    </div>

    <!-- Legend, one line per case: the header record (.557) and the per-game
         chip (57%) look alike, so each is spelled out on its own. -->
    <dl
      v-if="data && data.games.length"
      class="space-y-1 border-t border-seam px-3 py-2 text-[10px] leading-snug text-chalk-dim"
    >
      <div class="flex gap-1.5">
        <dt class="nameplate shrink-0 tracking-wider text-chalk">{{ $t('nextfive.legendRecordLabel') }}</dt>
        <dd>{{ $t('nextfive.legendRecord') }}</dd>
      </div>
      <div class="flex gap-1.5">
        <dt class="nameplate shrink-0 tracking-wider text-chalk">%</dt>
        <dd>{{ $t('nextfive.legendWin') }}</dd>
      </div>
    </dl>
  </section>
</template>
