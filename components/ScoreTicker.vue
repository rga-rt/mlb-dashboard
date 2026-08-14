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

// Hover peek: a chit is a terse summary, so a tooltip fills in the rest — the
// live count and who's up, or the probables and where to watch. Teleported to
// <body> and fixed-positioned from the chit's rect, since the ticker itself is
// overflow-hidden and its track is transform-animated (both would clip/shift a
// tooltip nested inside).
const active = ref<ScoreboardGame | null>(null)
const tip = reactive({ left: 0, top: 0 })
const TIP_W = 244
function showTip(e: MouseEvent, g: ScoreboardGame) {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  tip.left = Math.min(Math.max(8, r.left), window.innerWidth - TIP_W - 8)
  tip.top = r.bottom + 6
  active.value = g
}
function hideTip() {
  active.value = null
}

// The status line inside the tooltip, spelled out more than the chit's glyph.
function tipStatus(g: ScoreboardGame): string {
  if (g.status === 'live') return `${t('scoreboard.liveTag')} · ${inning(g)}`
  if (g.status === 'final') return t('scoreboard.finalTag')
  if (g.status === 'scheduled') return timeLabel(g)
  return g.statusDetail
}
// Distinct TV carriers, in feed order — "where to watch" at a glance.
function tvNetworks(g: ScoreboardGame): string {
  return [...new Set(g.broadcasts.filter(b => b.medium === 'TV').map(b => b.name))].join(', ')
}
</script>

<template>
  <section
    v-if="games.length"
    class="ticker overflow-hidden border-b-2 border-seam bg-field-deep"
    :aria-label="$t('ticker.label')"
  >
    <div class="ticker-track flex w-max items-stretch">
      <div
        v-for="(g, i) in loop"
        :key="`${g.gamePk}-${i}`"
        class="flex cursor-default items-center gap-1.5 whitespace-nowrap border-r border-seam px-4 py-2"
        :aria-hidden="i >= games.length ? 'true' : undefined"
        @mouseenter="showTip($event, g)"
        @mouseleave="hideTip"
      >
        <span class="logo-tile"><img :src="teamLogo(g.away.teamId)" alt="" width="16" height="16" class="h-4 w-4 object-contain" @error="hideBrokenLogo"></span>
        <template v-if="hasScore(g)">
          <span class="digit text-sm leading-none" :class="isLeading(g, 'away') ? 'lit' : 'text-chalk'">{{ g.away.runs }}</span>
          <span class="digit text-[11px] leading-none text-chalk-dim">–</span>
          <span class="digit text-sm leading-none" :class="isLeading(g, 'home') ? 'lit' : 'text-chalk'">{{ g.home.runs }}</span>
        </template>
        <span class="logo-tile"><img :src="teamLogo(g.home.teamId)" alt="" width="16" height="16" class="h-4 w-4 object-contain" @error="hideBrokenLogo"></span>
        <span
          class="nameplate ml-1 text-[10px] tracking-widest"
          :class="g.status === 'live' ? 'text-bulb' : 'text-chalk-dim'"
        >{{ statusLabel(g) }}</span>
      </div>
    </div>

    <!-- Hover peek, at <body> level so the ticker's overflow/transform can't clip
         or drag it. Non-interactive: it never steals the hover off the chit. -->
    <Teleport to="body">
      <div
        v-if="active"
        class="ticker-tip"
        role="tooltip"
        :style="{ left: `${tip.left}px`, top: `${tip.top}px` }"
      >
        <p class="tip-teams">
          {{ active.away.name }}<span class="tip-at"> @ </span>{{ active.home.name }}
        </p>
        <p v-if="hasScore(active)" class="tip-score">
          <span class="digit" :class="isLeading(active, 'away') ? 'lit' : 'text-chalk'">{{ active.away.runs }}</span>
          <span class="digit text-chalk-dim"> – </span>
          <span class="digit" :class="isLeading(active, 'home') ? 'lit' : 'text-chalk'">{{ active.home.runs }}</span>
          <span class="tip-status">{{ tipStatus(active) }}</span>
        </p>
        <p v-else class="tip-status tip-status--solo">{{ tipStatus(active) }}</p>

        <template v-if="active.status === 'live' && active.live">
          <p class="tip-count">{{ t('ticker.count', { b: active.live.balls, s: active.live.strikes, o: active.live.outs }) }}</p>
          <p v-if="active.live.currentPitcher" class="tip-line">
            <span class="tip-label">{{ t('scoreboard.pitcher') }}</span>{{ active.live.currentPitcher }}
          </p>
          <p v-if="active.live.currentBatter" class="tip-line">
            <span class="tip-label">{{ t('scoreboard.batter') }}</span>{{ active.live.currentBatter }}
          </p>
        </template>

        <template v-else-if="active.status === 'scheduled'">
          <p class="tip-line">
            <span class="tip-label">{{ active.away.abbr }}</span>{{ active.away.probablePitcher || t('scoreboard.tbd') }}
          </p>
          <p class="tip-line">
            <span class="tip-label">{{ active.home.abbr }}</span>{{ active.home.probablePitcher || t('scoreboard.tbd') }}
          </p>
        </template>

        <p v-if="tvNetworks(active)" class="tip-line">
          <span class="tip-label">{{ t('scoreboard.tv') }}</span>{{ tvNetworks(active) }}
        </p>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
/* Hover peek. Teleported to <body>, but Vue keeps the scoped attribute on the
   node, so these styles still reach it. */
.ticker-tip {
  position: fixed;
  z-index: 60;
  width: 244px;
  max-width: calc(100vw - 16px);
  padding: 0.6rem 0.7rem;
  pointer-events: none;
  border: 1px solid var(--color-seam);
  background: var(--color-panel);
  box-shadow: 0 10px 26px rgb(0 0 0 / 0.5);
}
.tip-teams {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 12px;
  line-height: 1.25;
  color: var(--color-chalk);
}
.tip-at { color: var(--color-chalk-dim); }
.tip-score {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  margin-top: 0.35rem;
  font-size: 15px;
}
.tip-status {
  margin-left: auto;
  align-self: center;
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 9px;
  color: var(--color-chalk-dim);
}
.tip-status--solo { margin-top: 0.35rem; margin-left: 0; }
.tip-count {
  margin-top: 0.4rem;
  font-family: var(--font-display);
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  color: var(--color-chalk);
}
.tip-line {
  margin-top: 0.3rem;
  font-size: 11px;
  line-height: 1.3;
  color: var(--color-chalk-dim);
}
.tip-label {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 9px;
  color: var(--color-bulb);
  margin-right: 0.4rem;
}

/* Each logo rides a small light enamel tile. Many MLB marks are navy or black
   and vanish against the dark ribbon; the tile gives every one a consistent,
   readable backing — like a painted panel on the board. */
.logo-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  height: 22px;
  width: 22px;
  border-radius: 3px;
  background: var(--color-chalk);
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.08);
}

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
