<script setup lang="ts">
import type { Division, ScoreboardGame, ScoreboardResponse, StandingsResponse, TeamRecord } from '~/types/mlb'

// The landing is the front door: it renders bare (its own nav + footer),
// outside the app masthead/footer shell that wraps the board and team pages.
definePageMeta({ layout: false })

// Real, live standings power the hero preview (a genuine product mini-view,
// not a mocked screenshot) and the club marquee. Fails soft: the hero shows a
// "board's dark" panel and the marquee simply hides.
const { data: standings } = await useFetch<StandingsResponse>('/api/standings')

const heroDivision = computed<Division | null>(() => {
  const divs = standings.value?.divisions ?? []
  return divs.find(d => d.league === 'AL' && /East/i.test(d.divisionName)) ?? divs[0] ?? null
})

// Every distinct club across all divisions, for the logo marquee.
const allTeams = computed<TeamRecord[]>(() => {
  const seen = new Set<number>()
  const out: TeamRecord[] = []
  for (const d of standings.value?.divisions ?? []) {
    for (const t of d.teams) {
      if (!seen.has(t.teamId)) {
        seen.add(t.teamId)
        out.push(t)
      }
    }
  }
  return out
})
const marqueeTeams = computed(() => [...allTeams.value, ...allTeams.value]) // doubled for a seamless loop
const feedLogos = computed(() => allTeams.value.slice(0, 5))
const sampleTeamId = computed(() => heroDivision.value?.teams[0]?.teamId ?? 147)

// Today's live games power the "on the field right now" strip. Same fail-soft
// contract as the hero board: if the feed is unreachable, `scoreboard` stays
// null and the section hides itself entirely. When the feed answers but nothing
// is in progress, the section shows a quiet line pointing to the full board.
const { data: scoreboard } = await useFetch<ScoreboardResponse>('/api/scoreboard')
const liveGames = computed<ScoreboardGame[]>(
  () => (scoreboard.value?.games ?? []).filter(g => g.status === 'live'),
)
// Keep the landing tight: show at most three live cards, link out for the rest.
const livePreview = computed(() => liveGames.value.slice(0, 3))

useHead({
  title: 'Scoreboard - Live MLB standings & player stats',
  meta: [
    {
      name: 'description',
      content: 'Live MLB standings and deep player stats, painted like a hand-operated ballpark scoreboard. Sort the board, follow your club, and read the forecast.',
    },
  ],
})
</script>

<template>
  <div>
    <!-- Same masthead as every other page, so the header never mismatches -->
    <SiteMasthead />

    <!-- Hero: asymmetric split, copy left, live board right -->
    <section class="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:px-6 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14 lg:py-0">
      <div class="reveal">
        <h1 class="nameplate text-4xl leading-[0.92] text-chalk md:text-5xl lg:text-6xl">
          {{ $t('landing.heroTitle1') }}
          <span class="lit flicker-on">{{ $t('landing.heroTitleLit') }}</span>
          {{ $t('landing.heroTitle2') }}
        </h1>
        <p class="mt-6 max-w-[46ch] text-base leading-relaxed text-chalk-dim">
          {{ $t('landing.heroSubtext') }}
        </p>
        <div class="mt-9 flex flex-wrap items-center gap-3">
          <NuxtLinkLocale
            to="/standings"
            class="nameplate border border-bulb bg-bulb px-6 py-3 text-xs tracking-widest text-field-deep transition-colors hover:bg-bulb-core"
          >
            {{ $t('nav.openBoard') }}
          </NuxtLinkLocale>
          <NuxtLinkLocale
            :to="`/team/${sampleTeamId}`"
            class="nameplate border border-line px-6 py-3 text-xs tracking-widest text-chalk transition-colors hover:border-bulb hover:text-bulb"
          >
            {{ $t('nav.exploreTeam') }}
          </NuxtLinkLocale>
        </div>
      </div>

      <!-- Live mini-board: real /api/standings data -->
      <div class="reveal">
        <div class="border border-seam bg-panel shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)]">
          <div class="flex items-baseline justify-between border-b-2 border-seam bg-field-deep px-4 py-2.5">
            <h2 class="nameplate flex items-center gap-2 text-xs tracking-widest text-chalk">
              <span class="bulb inline-block h-1.5 w-1.5" aria-hidden="true" />
              {{ heroDivision?.divisionName ?? 'The board' }}
            </h2>
            <span class="nameplate text-[10px] tracking-[0.2em] text-chalk-dim">
              {{ standings?.season ?? '' }} · {{ $t('landing.boardLive') }}
            </span>
          </div>

          <div v-if="heroDivision" class="divide-y divide-seam">
            <div
              v-for="t in heroDivision.teams"
              :key="t.teamId"
              class="grid grid-cols-[1.5rem_1.75rem_1fr_2.25rem_2.25rem_2.5rem] items-center gap-3 px-4 py-2.5"
              :class="t.divisionLeader ? 'bg-panel-lit' : ''"
            >
              <span class="digit text-right text-xs" :class="t.divisionLeader ? 'lit' : 'text-chalk-dim'">
                {{ t.divisionRank }}
              </span>
              <img :src="teamLogo(t.teamId)" alt="" width="28" height="28" class="h-7 w-7 object-contain">
              <span class="nameplate truncate text-[13px] tracking-wide text-chalk">{{ t.name }}</span>
              <span class="digit text-right text-sm text-chalk">{{ t.wins }}</span>
              <span class="digit text-right text-sm" :class="t.divisionLeader ? 'text-chalk' : 'text-chalk-dim'">{{ t.losses }}</span>
              <span class="digit text-right text-sm" :class="t.gamesBack === '-' ? 'lit' : 'text-chalk-dim'">{{ t.gamesBack }}</span>
            </div>
          </div>

          <div v-else class="px-4 py-12 text-center">
            <p class="text-sm text-chalk-dim">{{ $t('landing.boardDark') }}</p>
          </div>

          <div class="flex items-center justify-between border-t border-seam bg-field-deep/50 px-4 py-2">
            <span class="nameplate text-[10px] tracking-[0.3em] text-chalk-dim">{{ $t('landing.boardLegend') }}</span>
            <NuxtLinkLocale to="/standings" class="nameplate text-[10px] tracking-[0.2em] text-bulb transition-opacity hover:opacity-80">
              {{ $t('landing.boardSeeAll') }}
            </NuxtLinkLocale>
          </div>
        </div>
      </div>
    </section>

    <!-- Live now: today's in-progress games, straight from /api/scoreboard.
         Fails soft — hidden entirely if the feed never answered. When it did
         answer but nothing's live, a quiet line points at the full board. -->
    <section v-if="scoreboard" class="border-t border-seam bg-field-deep/40">
      <div class="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20">
        <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="nameplate flex items-center gap-2 text-xs tracking-[0.3em] text-chalk-dim">
              <span class="bulb inline-block h-2 w-2" aria-hidden="true" />
              {{ $t('landing.liveEyebrow') }}
            </p>
            <h2 class="nameplate mt-2 text-3xl leading-none text-chalk md:text-4xl">
              {{ $t('landing.liveHeading') }}
            </h2>
          </div>
          <NuxtLinkLocale
            to="/scoreboard"
            class="nameplate border border-line px-5 py-2.5 text-[11px] tracking-widest text-chalk transition-colors hover:border-bulb hover:text-bulb"
          >
            {{ $t('landing.liveSeeAll') }}
          </NuxtLinkLocale>
        </div>

        <!-- Games in progress: reuse the scoreboard card, capped at three -->
        <div v-if="livePreview.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <GameCard v-for="game in livePreview" :key="game.gamePk" :game="game" from="scoreboard" />
        </div>

        <!-- Nothing live this minute: a quiet plate, not an empty hole -->
        <div v-else class="flex flex-wrap items-center justify-between gap-4 border border-seam bg-panel px-6 py-8">
          <p class="max-w-xl text-sm leading-relaxed text-chalk-dim">
            {{ $t('landing.liveQuiet') }}
          </p>
          <NuxtLinkLocale
            to="/scoreboard"
            class="nameplate text-[11px] tracking-[0.2em] text-bulb transition-opacity hover:opacity-80"
          >
            {{ $t('landing.liveSeeSlate') }}
          </NuxtLinkLocale>
        </div>
      </div>
    </section>

    <!-- Form guide: hot/cold + division races, from the same standings feed -->
    <section v-if="standings?.divisions?.length" class="border-t border-seam bg-field">
      <div class="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20">
        <div class="mb-8">
          <p class="nameplate flex items-center gap-2 text-xs tracking-[0.3em] text-chalk-dim">
            <span class="bulb inline-block h-2 w-2" aria-hidden="true" />
            {{ $t('landing.formEyebrow') }}
          </p>
          <h2 class="nameplate mt-2 text-3xl leading-none text-chalk md:text-4xl">
            {{ $t('landing.formHeading') }}
          </h2>
        </div>
        <div class="space-y-6">
          <HotColdPanel :divisions="standings.divisions" :count="4" />
          <DivisionMatchups :divisions="standings.divisions" />
        </div>
      </div>
    </section>

    <!-- Features: asymmetric bento, four cells, no empty slots -->
    <section class="border-t border-seam bg-field-deep/40">
      <div class="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
        <h2 class="reveal nameplate max-w-2xl text-3xl leading-tight text-chalk md:text-4xl">
          {{ $t('landing.featuresHeading') }}
        </h2>

        <div class="reveal mt-12 grid gap-4 md:grid-cols-3">
          <!-- A: wide -->
          <article class="relative overflow-hidden border border-seam bg-panel p-7 md:col-span-2">
            <div class="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(240,182,78,0.16),transparent_65%)]" aria-hidden="true" />
            <h3 class="nameplate text-xl tracking-wide text-chalk">{{ $t('landing.sortTitle') }}</h3>
            <p class="mt-3 max-w-md text-sm leading-relaxed text-chalk-dim">
              {{ $t('landing.sortBody') }}
            </p>
            <div class="mt-6 flex flex-wrap gap-2" aria-hidden="true">
              <span class="nameplate inline-flex items-center gap-1 border border-line px-2.5 py-1 text-[10px] tracking-widest text-bulb">W <span class="text-[8px]">▾</span></span>
              <span class="nameplate border border-line px-2.5 py-1 text-[10px] tracking-widest text-chalk-dim">PCT</span>
              <span class="nameplate border border-line px-2.5 py-1 text-[10px] tracking-widest text-chalk-dim">GB</span>
              <span class="nameplate border border-line px-2.5 py-1 text-[10px] tracking-widest text-chalk-dim">STRK</span>
            </div>
          </article>

          <!-- B: narrow, amber-tinted -->
          <article class="relative overflow-hidden border border-seam bg-panel p-7">
            <span class="bulb mb-5 inline-block h-4 w-4" aria-hidden="true" />
            <h3 class="nameplate text-xl tracking-wide text-chalk">{{ $t('landing.followTitle') }}</h3>
            <p class="mt-3 text-sm leading-relaxed text-chalk-dim">
              {{ $t('landing.followBody') }}
            </p>
          </article>

          <!-- C: narrow -->
          <article class="border border-seam bg-panel p-7">
            <h3 class="nameplate text-xl tracking-wide text-chalk">{{ $t('landing.deepTitle') }}</h3>
            <p class="mt-3 text-sm leading-relaxed text-chalk-dim">
              {{ $t('landing.deepBody') }}
            </p>
          </article>

          <!-- D: wide, real logo cluster -->
          <article class="flex flex-col justify-between gap-6 border border-seam bg-panel p-7 md:col-span-2">
            <div>
              <h3 class="nameplate text-xl tracking-wide text-chalk">{{ $t('landing.feedTitle') }}</h3>
              <p class="mt-3 max-w-md text-sm leading-relaxed text-chalk-dim">
                {{ $t('landing.feedBody') }}
              </p>
            </div>
            <ul v-if="feedLogos.length" class="flex items-center gap-5">
              <li v-for="t in feedLogos" :key="t.teamId">
                <img :src="teamLogo(t.teamId)" :alt="t.name" width="34" height="34" class="h-8 w-8 object-contain opacity-90" loading="lazy">
              </li>
            </ul>
          </article>
        </div>
      </div>
    </section>

    <!-- Club marquee: real logos, logo-only, one marquee per page -->
    <section v-if="allTeams.length" class="overflow-hidden border-y border-seam bg-field py-8">
      <div class="marquee mx-auto max-w-none">
        <ul class="marquee-track flex w-max items-center gap-12 pr-12">
          <li v-for="(t, i) in marqueeTeams" :key="`${t.teamId}-${i}`" class="shrink-0">
            <img :src="teamLogo(t.teamId)" :alt="i < allTeams.length ? t.name : ''" width="40" height="40" class="h-9 w-9 object-contain opacity-70 transition-opacity hover:opacity-100" loading="lazy">
          </li>
        </ul>
      </div>
    </section>

    <!-- Deep-dive: full-width editorial band -->
    <section class="border-b border-seam bg-panel">
      <div class="mx-auto max-w-4xl px-4 py-24 text-center md:px-6 md:py-32">
        <p class="reveal nameplate text-4xl leading-tight text-chalk md:text-5xl">
          {{ $t('landing.deepDiveTitle1') }}
          <span class="lit">{{ $t('landing.deepDiveTitleLit') }}</span>
        </p>
        <p class="reveal mx-auto mt-6 max-w-xl text-base leading-relaxed text-chalk-dim">
          {{ $t('landing.deepDiveBody') }}
        </p>
        <NuxtLinkLocale
          :to="`/team/${sampleTeamId}`"
          class="reveal nameplate mt-9 inline-block border border-line px-6 py-3 text-xs tracking-widest text-chalk transition-colors hover:border-bulb hover:text-bulb"
        >
          {{ $t('nav.exploreTeam') }}
        </NuxtLinkLocale>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="bg-field-deep">
      <div class="mx-auto max-w-3xl px-4 py-24 text-center md:px-6 md:py-32">
        <span class="bulb mx-auto mb-8 block h-5 w-5" aria-hidden="true" />
        <h2 class="reveal nameplate text-4xl leading-none text-chalk md:text-6xl">{{ $t('landing.ctaTitle') }}</h2>
        <p class="reveal mx-auto mt-5 max-w-md text-base text-chalk-dim">
          {{ $t('landing.ctaBody') }}
        </p>
        <NuxtLinkLocale
          to="/standings"
          class="reveal nameplate mt-10 inline-block border border-bulb bg-bulb px-8 py-4 text-sm tracking-widest text-field-deep transition-colors hover:bg-bulb-core"
        >
          {{ $t('nav.openBoard') }}
        </NuxtLinkLocale>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-seam bg-field">
      <div class="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-10 md:flex-row md:items-center md:px-6">
        <div class="flex items-center gap-2.5">
          <span class="bulb inline-block h-2.5 w-2.5" aria-hidden="true" />
          <span class="nameplate text-xs tracking-[0.2em] text-chalk-dim">Scoreboard</span>
        </div>
        <p class="text-[11px] leading-relaxed text-chalk-dim/80">
          {{ $t('footer.landing') }}
        </p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* Scroll reveals: only hide-then-reveal where the browser supports scroll
   timelines AND the visitor allows motion. Everywhere else content is visible
   by default, so nothing is ever stuck hidden. */
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .reveal {
      opacity: 0;
      transform: translateY(22px);
      animation: reveal-in linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 42%;
    }
  }

  /* Hero bulb warming up like a filament finding its current. */
  .flicker-on {
    animation: flicker 1.1s ease-out both;
  }
}

@keyframes reveal-in {
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes flicker {
  0% { opacity: 0.15; }
  35% { opacity: 0.5; }
  42% { opacity: 0.12; }
  55% { opacity: 0.85; }
  62% { opacity: 0.25; }
  100% { opacity: 1; }
}

/* Club marquee: a slow, seamless horizontal drift. Pauses on hover and stops
   entirely under reduced motion (the global reset zeroes its duration). */
.marquee-track {
  animation: marquee 48s linear infinite;
}
.marquee:hover .marquee-track {
  animation-play-state: paused;
}
@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
</style>
