<script setup lang="ts">
import type { ScoreboardGame } from '~/types/mlb'

// `from` tags the probable-pitcher links so the team page's back button can
// return to the page the card was shown on (scoreboard / upcoming).
const props = defineProps<{ game: ScoreboardGame, from?: string }>()

const { t } = useI18n()

// A game's start time is the viewer's local clock, so it can only be resolved in
// the browser — the server's timezone would differ. We hold off until mounted so
// SSR and the first client render agree (both empty), then fill in the localized
// time with a short zone label (e.g. "1:40 PM CDT") once we're on the client.
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
const startLabel = computed(() => {
  if (!props.game.startTime) return t('scoreboard.tbd')
  if (!mounted.value) return '' // filled in after mount; avoids a TZ hydration mismatch
  return new Date(props.game.startTime).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
})

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

// Broadcasts split into TV and radio for display. National TV sorts ahead of
// local, and identical names collapse — so a card reads "ESPN · Bally Sports
// West" rather than repeating a shared carrier.
const tvBroadcasts = computed(() => {
  const names = props.game.broadcasts
    .filter(b => b.medium === 'TV')
    .sort((a, b) => Number(b.national) - Number(a.national))
    .map(b => b.name)
  return [...new Set(names)]
})
const radioBroadcasts = computed(() =>
  [...new Set(props.game.broadcasts.filter(b => b.medium === 'radio').map(b => b.name))],
)

// Per-game links. Gameday resolves off the MLB gamePk (a bare id 301-redirects
// to the canonical page), so it's offered for MLB games only — the Mexican
// leagues aren't on mlb.com/gameday. The free-game badge points at the MLB.TV
// watch page and shows only when the feed flags the game as free to stream.
const gamedayUrl = computed(() =>
  props.game.sport === 'MLB' ? `https://www.mlb.com/gameday/${props.game.gamePk}` : null,
)
const mlbtvUrl = computed(() => `https://www.mlb.com/tv/g${props.game.gamePk}`)
const matchup = computed(() => `${props.game.away.abbr} @ ${props.game.home.abbr}`)

function hideBrokenLogo(e: Event) {
  ;(e.target as HTMLImageElement).style.visibility = 'hidden'
}
</script>

<template>
  <!-- min-w-0 lets the card shrink to its grid column: without it, a nowrap
       line (a long probable name, or an LMB club whose abbr is its full name)
       sets a min-width wider than a phone and scrolls the page sideways. The
       inner truncate rules then clip cleanly. -->
  <section class="min-w-0 border border-seam bg-panel">
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

      <!-- Current matchup: pitcher on the mound, batter at the plate. Each name
           links to that player's stats (on their own club's page) when the feed
           gives us both the personId and their team. -->
      <div v-if="game.live.currentPitcher || game.live.currentBatter" class="mt-2.5 space-y-0.5 text-[11px] leading-snug">
        <p v-if="game.live.currentPitcher" class="truncate text-chalk-dim">
          <span class="nameplate tracking-wider text-chalk">{{ $t('scoreboard.pitcher') }}</span>
          <NuxtLinkLocale
            v-if="game.live.currentPitcherId != null && game.live.currentPitcherTeamId != null"
            :to="{ path: `/team/${game.live.currentPitcherTeamId}`, query: { player: String(game.live.currentPitcherId), ...(from ? { from } : {}) } }"
            class="underline decoration-dotted decoration-chalk-dim/50 underline-offset-2 transition-colors hover:text-bulb hover:decoration-bulb focus-visible:text-bulb focus:outline-none"
            :aria-label="$t('scoreboard.viewPlayer', { name: game.live.currentPitcher })"
          >{{ game.live.currentPitcher }}</NuxtLinkLocale>
          <template v-else>{{ game.live.currentPitcher }}</template>
        </p>
        <p v-if="game.live.currentBatter" class="truncate text-chalk-dim">
          <span class="nameplate tracking-wider text-chalk">{{ $t('scoreboard.batter') }}</span>
          <NuxtLinkLocale
            v-if="game.live.currentBatterId != null && game.live.currentBatterTeamId != null"
            :to="{ path: `/team/${game.live.currentBatterTeamId}`, query: { player: String(game.live.currentBatterId), ...(from ? { from } : {}) } }"
            class="underline decoration-dotted decoration-chalk-dim/50 underline-offset-2 transition-colors hover:text-bulb hover:decoration-bulb focus-visible:text-bulb focus:outline-none"
            :aria-label="$t('scoreboard.viewPlayer', { name: game.live.currentBatter })"
          >{{ game.live.currentBatter }}</NuxtLinkLocale>
          <template v-else>{{ game.live.currentBatter }}</template>
        </p>
      </div>
    </div>

    <!-- Scheduled: probable pitchers when the feed lists them -->
    <div
      v-else-if="game.status === 'scheduled' && (game.away.probablePitcher || game.home.probablePitcher)"
      class="border-t border-seam bg-field-deep/50 px-3 py-2.5 text-[11px] leading-snug text-chalk-dim"
    >
      <p class="nameplate mb-1 text-[9px] tracking-widest text-chalk-dim">{{ $t('scoreboard.probable') }}</p>
      <p v-for="side in (['away', 'home'] as const)" :key="side" class="truncate">
        {{ game[side].abbr }} ·
        <!-- Link the probable to their stats on the team page (deep-linked via
             ?player=id) when we have their personId; plain text otherwise. -->
        <NuxtLinkLocale
          v-if="game[side].probablePitcher && game[side].probablePitcherId != null"
          :to="{ path: `/team/${game[side].teamId}`, query: { player: String(game[side].probablePitcherId), ...(from ? { from } : {}) } }"
          class="underline decoration-dotted decoration-chalk-dim/50 underline-offset-2 transition-colors hover:text-bulb hover:decoration-bulb focus-visible:text-bulb focus:outline-none"
          :aria-label="$t('scoreboard.viewPlayer', { name: game[side].probablePitcher })"
        >{{ game[side].probablePitcher }}</NuxtLinkLocale>
        <template v-else>{{ game[side].probablePitcher ?? $t('scoreboard.tbd') }}</template>
      </p>
    </div>

    <!-- Where to watch/listen: its own strip so it shows for any game that has
         carriers, including ones with no probables (e.g. LMP). Omitted entirely
         when the feed lists none (e.g. LMB). -->
    <div
      v-if="tvBroadcasts.length || radioBroadcasts.length"
      class="border-t border-seam bg-field-deep/30 px-3 py-2 text-[11px] leading-snug"
    >
      <dl class="space-y-0.5">
        <div v-if="tvBroadcasts.length" class="flex gap-2">
          <dt class="nameplate shrink-0 tracking-widest text-chalk-dim">{{ $t('scoreboard.tv') }}</dt>
          <dd class="min-w-0 truncate text-chalk">{{ tvBroadcasts.join(' · ') }}</dd>
        </div>
        <div v-if="radioBroadcasts.length" class="flex gap-2">
          <dt class="nameplate shrink-0 tracking-widest text-chalk-dim">{{ $t('scoreboard.radio') }}</dt>
          <dd class="min-w-0 truncate text-chalk-dim">{{ radioBroadcasts.join(' · ') }}</dd>
        </div>
      </dl>
    </div>

    <!-- Watch links: a Gameday link for MLB games, and a lit "free on MLB.TV"
         badge on the feed's free game of the day. Both open on mlb.com. -->
    <div
      v-if="gamedayUrl || game.freeGame"
      class="flex flex-wrap items-center gap-2 border-t border-seam px-3 py-2"
    >
      <a
        v-if="game.freeGame"
        :href="mlbtvUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="nameplate inline-flex items-center gap-1.5 border border-bulb bg-bulb/10 px-2 py-1 text-[10px] tracking-widest text-bulb transition-colors hover:bg-bulb hover:text-field-deep focus:outline-none focus-visible:bg-bulb focus-visible:text-field-deep"
        :aria-label="$t('scoreboard.watchFreeLabel', { matchup })"
      >
        <span class="bulb inline-block h-1.5 w-1.5" aria-hidden="true" />
        {{ $t('scoreboard.watchFree') }}
      </a>
      <a
        v-if="gamedayUrl"
        :href="gamedayUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="nameplate inline-flex items-center gap-1 px-2 py-1 text-[10px] tracking-widest text-chalk-dim transition-colors hover:text-bulb focus:outline-none focus-visible:text-bulb"
        :aria-label="$t('scoreboard.gamedayLabel', { matchup })"
      >
        {{ $t('scoreboard.gameday') }}
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  </section>
</template>
