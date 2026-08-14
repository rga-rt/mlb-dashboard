<script setup lang="ts">
import type { Division, TeamRecord } from '~/types/mlb'
import { divisionMatchup } from '~/utils/teamForm'

// A card per MLB division: the leader vs the runner-up, with the games-back gap
// as the headline. Takes the standings divisions like the Hot/Cold panel.
const props = defineProps<{ divisions: Division[] }>()

type Matchup = { name: string, pair: { leader: TeamRecord, runnerUp: TeamRecord } }
const matchups = computed<Matchup[]>(() =>
  props.divisions
    .filter(d => d.league === 'AL' || d.league === 'NL')
    .map(d => ({ name: d.divisionName, pair: divisionMatchup(d) }))
    .filter((x): x is Matchup => x.pair !== null),
)

function l10(t: TeamRecord): string {
  return `${t.lastTenWins}-${t.lastTenLosses}`
}
function hideBrokenLogo(e: Event) {
  ;(e.target as HTMLImageElement).style.visibility = 'hidden'
}
</script>

<template>
  <section v-if="matchups.length">
    <div class="mb-4 flex items-center gap-3">
      <span class="bulb inline-block h-2 w-2 shrink-0" aria-hidden="true" />
      <h2 class="nameplate shrink-0 text-xs tracking-[0.28em] text-chalk">{{ $t('form.matchupsTitle') }}</h2>
      <span class="h-0.5 flex-1 bg-seam" aria-hidden="true" />
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article v-for="m in matchups" :key="m.name" class="border border-seam bg-panel">
        <div class="flex items-center justify-between border-b-2 border-seam bg-field-deep px-3 py-2">
          <h3 class="nameplate text-xs tracking-wider text-chalk-dim">{{ m.name }}</h3>
          <span class="nameplate flex gap-2.5 text-[9px] tracking-widest text-chalk-dim/70">
            <span class="w-10 text-right">{{ $t('form.record') }}</span>
            <span class="w-8 text-right">{{ $t('form.last10') }}</span>
            <span class="w-6 text-right">{{ $t('form.streak') }}</span>
          </span>
        </div>

        <div class="divide-y divide-seam">
          <NuxtLinkLocale
            v-for="(t, i) in [m.pair.leader, m.pair.runnerUp]"
            :key="t.teamId"
            :to="{ path: `/team/${t.teamId}`, query: { from: 'standings' } }"
            class="grid grid-cols-[1.5rem_minmax(0,1fr)_2.5rem_2rem_1.5rem] items-center gap-2 px-3 py-2 transition-colors hover:bg-field-deep focus-visible:bg-field-deep focus:outline-none"
            :class="i === 0 ? 'bg-panel-lit' : ''"
          >
            <img :src="teamLogo(t.teamId)" alt="" width="20" height="20" class="h-5 w-5 object-contain" @error="hideBrokenLogo">
            <span class="nameplate truncate text-[13px] tracking-wide text-chalk">{{ t.name }}</span>
            <span class="digit w-10 text-right text-xs text-chalk">{{ t.wins }}-{{ t.losses }}</span>
            <span class="digit w-8 text-right text-xs text-chalk-dim">{{ l10(t) }}</span>
            <span class="digit w-6 text-right text-xs" :class="i === 0 ? 'lit' : 'text-chalk-dim'">{{ t.streak }}</span>
          </NuxtLinkLocale>
        </div>

        <!-- The gap: the point of the comparison -->
        <div class="border-t border-seam bg-field-deep/50 px-3 py-1.5 text-center">
          <span class="nameplate text-[10px] tracking-widest text-chalk-dim">
            <template v-if="m.pair.runnerUp.gamesBack === '-'">{{ $t('form.tied') }}</template>
            <template v-else>{{ m.pair.runnerUp.gamesBack }} {{ $t('form.gamesBack') }}</template>
          </span>
        </div>
      </article>
    </div>
  </section>
</template>
