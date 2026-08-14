<script setup lang="ts">
import type { ScoreboardGame } from '~/types/mlb'

// A ribbon board: today's games drift across as compact score chits (live first,
// as the feed already sorts them). Rendered in the board material — dark field,
// tabular numerals, the leading/live score lit amber.
const props = defineProps<{ games: ScoreboardGame[] }>()

const { t } = useI18n()

// First-pitch time is the viewer's local clock, so resolve it client-side only
// (the server's timezone would differ) — matches the game cards.
const mounted = ref(false)
onMounted(() => { mounted.value = true })
function timeLabel(g: ScoreboardGame): string {
  if (!mounted.value || !g.startTime) return ''
  return new Date(g.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function inning(g: ScoreboardGame): string {
  const s = g.live?.inningState ?? ''
  const arrow = /^top/i.test(s) ? '▲' : /^bottom/i.test(s) ? '▼' : '·'
  return `${arrow}${g.live?.inning ?? ''}`
}
function statusLabel(g: ScoreboardGame): string {
  if (g.status === 'live') return inning(g)
  if (g.status === 'final') return t('ticker.final')
  if (g.status === 'scheduled') return timeLabel(g)
  return g.statusDetail
}

// The team ahead gets the lit run total (amber while live, on the winner once
// final) — the one lit thing per chit.
function isLeading(g: ScoreboardGame, side: 'home' | 'away'): boolean {
  if (g.status !== 'live' && g.status !== 'final') return false
  const h = g.home.runs ?? -1
  const a = g.away.runs ?? -1
  return side === 'home' ? h > a : a > h
}
const hasScore = (g: ScoreboardGame) => g.away.runs != null || g.home.runs != null

// Doubled for a seamless loop (translateX(-50%) lands on the second copy).
const loop = computed(() => [...props.games, ...props.games])

function hideBrokenLogo(e: Event) {
  ;(e.target as HTMLImageElement).style.visibility = 'hidden'
}
</script>

<template>
  <section
    v-if="games.length"
    class="ticker overflow-hidden border-y-2 border-seam bg-field-deep"
    :aria-label="$t('ticker.label')"
  >
    <div class="ticker-track flex w-max items-stretch">
      <div
        v-for="(g, i) in loop"
        :key="`${g.gamePk}-${i}`"
        class="flex items-center gap-1.5 whitespace-nowrap border-r border-seam px-4 py-2"
        :aria-hidden="i >= games.length ? 'true' : undefined"
      >
        <img :src="teamLogo(g.away.teamId)" alt="" width="18" height="18" class="h-[18px] w-[18px] shrink-0 object-contain" @error="hideBrokenLogo">
        <template v-if="hasScore(g)">
          <span class="digit text-sm leading-none" :class="isLeading(g, 'away') ? 'lit' : 'text-chalk'">{{ g.away.runs }}</span>
          <span class="digit text-[11px] leading-none text-chalk-dim">–</span>
          <span class="digit text-sm leading-none" :class="isLeading(g, 'home') ? 'lit' : 'text-chalk'">{{ g.home.runs }}</span>
        </template>
        <img :src="teamLogo(g.home.teamId)" alt="" width="18" height="18" class="h-[18px] w-[18px] shrink-0 object-contain" @error="hideBrokenLogo">
        <span
          class="nameplate ml-1 text-[10px] tracking-widest"
          :class="g.status === 'live' ? 'text-bulb' : 'text-chalk-dim'"
        >{{ statusLabel(g) }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* A steady, readable drift — like the ribbon board circling a stadium. Pauses on
   hover; the global reduced-motion reset zeroes the duration so it holds still. */
.ticker-track {
  animation: ticker-drift 65s linear infinite;
}
.ticker:hover .ticker-track {
  animation-play-state: paused;
}
@keyframes ticker-drift {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
</style>
