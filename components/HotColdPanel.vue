<script setup lang="ts">
import type { Division, TeamRecord } from '~/types/mlb'
import { hotColdTeams } from '~/utils/teamForm'

// Ranks the MLB field by recent form and shows the hottest and coldest clubs.
// Takes the standings divisions so it drops onto any page that already has them.
const props = withDefaults(defineProps<{ divisions: Division[], count?: number }>(), { count: 5 })

const mlbTeams = computed<TeamRecord[]>(() =>
  props.divisions.filter(d => d.league === 'AL' || d.league === 'NL').flatMap(d => d.teams),
)
const form = computed(() => hotColdTeams(mlbTeams.value, props.count))

function l10(t: TeamRecord): string {
  return `${t.lastTenWins}-${t.lastTenLosses}`
}
function hideBrokenLogo(e: Event) {
  ;(e.target as HTMLImageElement).style.visibility = 'hidden'
}
</script>

<template>
  <section v-if="mlbTeams.length" class="border border-seam bg-panel">
    <div class="flex items-center justify-between border-b-2 border-seam bg-field-deep px-4 py-2.5">
      <h2 class="nameplate flex items-center gap-2 text-sm tracking-wider text-chalk">
        <span class="bulb inline-block h-1.5 w-1.5" aria-hidden="true" />
        {{ $t('form.hotColdTitle') }}
      </h2>
      <span class="nameplate text-[10px] tracking-[0.2em] text-chalk-dim">{{ $t('form.last10') }} · {{ $t('form.streak') }}</span>
    </div>

    <div class="grid gap-px bg-seam sm:grid-cols-2">
      <div v-for="col in (['hot', 'cold'] as const)" :key="col" class="bg-panel">
        <h3
          class="nameplate px-4 py-2 text-[11px] tracking-widest"
          :class="col === 'hot' ? 'text-bulb' : 'text-clay'"
        >
          {{ col === 'hot' ? $t('form.hot') : $t('form.cold') }}
        </h3>
        <ul class="divide-y divide-seam">
          <li v-for="t in form[col]" :key="t.teamId">
            <NuxtLinkLocale
              :to="{ path: `/team/${t.teamId}`, query: { from: 'standings' } }"
              class="grid grid-cols-[1.5rem_minmax(0,1fr)_2.75rem_2rem] items-center gap-2.5 px-4 py-2 transition-colors hover:bg-field-deep focus-visible:bg-field-deep focus:outline-none"
            >
              <img :src="teamLogo(t.teamId)" alt="" width="24" height="24" class="h-6 w-6 object-contain" @error="hideBrokenLogo">
              <span class="nameplate truncate text-[13px] tracking-wide text-chalk">{{ t.name }}</span>
              <span class="digit text-right text-xs text-chalk-dim">{{ l10(t) }}</span>
              <span
                class="digit text-right text-xs"
                :class="col === 'hot' ? 'text-bulb' : 'text-clay'"
              >{{ t.streak }}</span>
            </NuxtLinkLocale>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
