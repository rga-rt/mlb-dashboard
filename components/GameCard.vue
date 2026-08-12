<script setup lang="ts">
import type { ScoreboardGame } from '~/types/mlb'

const props = defineProps<{ game: ScoreboardGame }>()

const { t } = useI18n()

// A game's start time, shown for scheduled games as the reader's local clock.
const startLabel = computed(() =>
  props.game.startTime
    ? new Date(props.game.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : t('scoreboard.tbd'),
)

// Half-inning arrow: ▲ top, ▼ bottom; middle/end fall back to a dash so the
// slot never renders a misleading arrow between halves.
const inningArrow = computed(() => {
  const s = props.game.live?.inningState ?? ''
  if (/^top/i.test(s)) return '▲'
  if (/^bottom/i.test(s)) return '▼'
  return '·'
})

// Final games bold the winner's run total; a tie (or pre-game) bolds neither.
function isWinner(side: 'home' | 'away'): boolean {
  if (props.game.status !== 'final') return false
  const h = props.game.home.runs ?? -1
  const a = props.game.away.runs ?? -1
  return side === 'home' ? h > a : a > h
}

// A plain-language summary of the live count, for screen readers — the diamond
// and pips are decorative (aria-hidden), so this carries the state non-visually.
const liveSummary = computed(() => {
  const l = props.game.live
  if (!l) return ''
  const runners = [l.onFirst && 'first', l.onSecond && 'second', l.onThird && 'third'].filter(Boolean)
  return t('scoreboard.liveSummary', {
    balls: l.balls,
    strikes: l.strikes,
    outs: l.outs,
    bases: runners.length ? runners.join(', ') : t('scoreboard.basesEmpty'),
  })
})

function hideBrokenLogo(e: Event) {
  ;(e.target as HTMLImageElement).style.visibility = 'hidden'
}
</script>

<template>
  <section class="border border-seam bg-panel">
    <!-- Top strip: league tag left, status readout right -->
    <div class="flex items-center justify-between border-b-2 border-seam bg-field-deep px-3 py-2">
      <span class="nameplate border border-line px-1.5 py-0.5 text-[10px] tracking-widest text-chalk-dim">
        {{ game.sport }}
      </span>

      <!-- Live: lit lamp + LIVE + half-inning; else FINAL / start time / detail -->
      <span v-if="game.status === 'live'" class="nameplate flex items-center gap-2 text-[11px] tracking-widest">
        <span class="flex items-center gap-1.5 text-bulb">
          <span class="bulb inline-block h-1.5 w-1.5" aria-hidden="true" />
          {{ $t('scoreboard.liveTag') }}
        </span>
        <span class="text-chalk">
          <span aria-hidden="true">{{ inningArrow }}</span>
          {{ game.live?.inning }}
        </span>
      </span>
      <span v-else-if="game.status === 'final'" class="nameplate text-[11px] tracking-widest text-chalk-dim">
        {{ $t('scoreboard.finalTag') }}
      </span>
      <span v-else-if="game.status === 'scheduled'" class="nameplate digit text-[11px] tracking-wider text-chalk-dim">
        {{ startLabel }}
      </span>
      <span v-else class="nameplate text-[11px] tracking-wider text-chalk-dim">
        {{ game.statusDetail }}
      </span>
    </div>

    <!-- Team rows: away over home, ballpark convention. Logo, abbr, run total. -->
    <div class="divide-y divide-seam">
      <div
        v-for="side in (['away', 'home'] as const)"
        :key="side"
        class="grid grid-cols-[1.75rem_1fr_2rem] items-center gap-2.5 px-3 py-2.5"
      >
        <img
          :src="teamLogo(game[side].teamId)"
          alt=""
          width="28"
          height="28"
          loading="lazy"
          class="h-7 w-7 object-contain"
          @error="hideBrokenLogo"
        >
        <span class="nameplate truncate text-[13px] tracking-wide text-chalk">{{ game[side].abbr }}</span>
        <span
          class="digit text-right text-lg leading-none"
          :class="game[side].runs == null ? 'text-chalk-dim' : (isWinner(side) ? 'lit' : 'text-chalk')"
        >{{ game[side].runs ?? '–' }}</span>
      </div>
    </div>

    <!-- Live quick-state: bases diamond, B/S/O pips, current pitcher & batter -->
    <div v-if="game.status === 'live' && game.live" class="border-t border-seam bg-field-deep/50 px-3 py-2.5">
      <p class="sr-only">{{ liveSummary }}</p>

      <div class="flex items-center justify-between gap-3" aria-hidden="true">
        <!-- Bases diamond: filled corner = runner on. Second top, third left,
             first right — the diamond as seen from behind the plate. -->
        <div class="relative h-8 w-8 shrink-0">
          <span
            class="absolute left-3 top-0 h-3 w-3 rotate-45 border border-line"
            :class="game.live.onSecond ? 'bg-bulb border-bulb' : ''"
          />
          <span
            class="absolute left-0 top-3 h-3 w-3 rotate-45 border border-line"
            :class="game.live.onThird ? 'bg-bulb border-bulb' : ''"
          />
          <span
            class="absolute left-6 top-3 h-3 w-3 rotate-45 border border-line"
            :class="game.live.onFirst ? 'bg-bulb border-bulb' : ''"
          />
        </div>

        <!-- Count: balls (of 3), strikes (of 2), outs (of 2) as lit pips -->
        <dl class="flex items-center gap-3 text-[10px]">
          <div class="flex items-center gap-1">
            <dt class="nameplate tracking-widest text-chalk-dim">B</dt>
            <dd class="flex gap-0.5">
              <span v-for="n in 3" :key="n" class="h-1.5 w-1.5 rounded-full" :class="n <= game.live.balls ? 'bg-bulb' : 'bg-seam'" />
            </dd>
          </div>
          <div class="flex items-center gap-1">
            <dt class="nameplate tracking-widest text-chalk-dim">S</dt>
            <dd class="flex gap-0.5">
              <span v-for="n in 2" :key="n" class="h-1.5 w-1.5 rounded-full" :class="n <= game.live.strikes ? 'bg-bulb' : 'bg-seam'" />
            </dd>
          </div>
          <div class="flex items-center gap-1">
            <dt class="nameplate tracking-widest text-chalk-dim">O</dt>
            <dd class="flex gap-0.5">
              <span v-for="n in 2" :key="n" class="h-1.5 w-1.5 rounded-full" :class="n <= game.live.outs ? 'bg-bulb' : 'bg-seam'" />
            </dd>
          </div>
        </dl>
      </div>

      <!-- Current matchup: pitcher on the mound, batter at the plate -->
      <div v-if="game.live.currentPitcher || game.live.currentBatter" class="mt-2.5 space-y-0.5 text-[11px] leading-snug">
        <p v-if="game.live.currentPitcher" class="truncate text-chalk-dim">
          <span class="nameplate tracking-wider text-chalk">{{ $t('scoreboard.pitcher') }}</span>
          {{ game.live.currentPitcher }}
        </p>
        <p v-if="game.live.currentBatter" class="truncate text-chalk-dim">
          <span class="nameplate tracking-wider text-chalk">{{ $t('scoreboard.batter') }}</span>
          {{ game.live.currentBatter }}
        </p>
      </div>
    </div>

    <!-- Scheduled: probable pitchers when the feed lists them -->
    <div
      v-else-if="game.status === 'scheduled' && (game.away.probablePitcher || game.home.probablePitcher)"
      class="border-t border-seam bg-field-deep/50 px-3 py-2.5 text-[11px] leading-snug text-chalk-dim"
    >
      <p class="nameplate mb-1 text-[9px] tracking-widest text-chalk-dim">{{ $t('scoreboard.probable') }}</p>
      <p class="truncate">{{ game.away.abbr }} · {{ game.away.probablePitcher ?? $t('scoreboard.tbd') }}</p>
      <p class="truncate">{{ game.home.abbr }} · {{ game.home.probablePitcher ?? $t('scoreboard.tbd') }}</p>
    </div>
  </section>
</template>
