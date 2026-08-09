<script setup lang="ts">
import type { Division } from '~/types/mlb'

defineProps<{ division: Division }>()

// Hide the logo slot if a team's CDN logo ever fails to load.
function hideBrokenLogo(e: Event) {
  ;(e.target as HTMLImageElement).style.visibility = 'hidden'
}
</script>

<template>
  <section class="border border-seam bg-panel">
    <!-- Division nameplate: the painted label strip riveted to the panel top -->
    <div class="flex items-center justify-between border-b-2 border-seam bg-field-deep px-4 py-2.5">
      <h2 class="nameplate text-sm tracking-wider text-chalk">
        {{ division.divisionName }}
      </h2>
      <span
        class="nameplate border border-line px-1.5 py-0.5 text-[10px] tracking-widest text-chalk-dim"
      >
        {{ division.league }}
      </span>
    </div>

    <!-- Column headers, like the printed labels on a standings board -->
    <div
      class="nameplate grid grid-cols-[1.25rem_1fr_2.25rem_2rem_3rem_2.75rem] items-center gap-2 border-b border-line/50 px-4 py-1.5 text-[10px] tracking-wider text-chalk-dim"
    >
      <span class="text-center">#</span>
      <span>Team</span>
      <span class="text-right">W</span>
      <span class="text-right">L</span>
      <span class="text-right">PCT</span>
      <span class="text-right">GB</span>
    </div>

    <!-- Each team is a number-card slot, divided by dark metal channels -->
    <ul class="divide-y divide-seam">
      <li v-for="team in division.teams" :key="team.teamId">
        <NuxtLink
          :to="`/team/${team.teamId}`"
          class="grid grid-cols-[1.25rem_1fr_2.25rem_2rem_3rem_2.75rem] items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-field-deep focus:bg-field-deep focus:outline-none"
          :class="team.divisionLeader ? 'bg-bulb/5' : ''"
        >
          <!-- Rank cell doubles as the leader "lamp" -->
          <span class="flex justify-center">
            <span
              v-if="team.divisionLeader"
              class="bulb inline-block h-2.5 w-2.5"
              title="Division leader"
            />
            <span v-else class="digit text-xs text-chalk-dim">{{ team.divisionRank }}</span>
          </span>

          <span class="flex min-w-0 items-center gap-2">
            <img
              :src="teamLogo(team.teamId)"
              alt=""
              width="20"
              height="20"
              loading="lazy"
              class="h-5 w-5 shrink-0 object-contain"
              @error="hideBrokenLogo"
            >
            <span class="nameplate truncate text-[15px] tracking-wide text-chalk">{{ team.name }}</span>
          </span>

          <!-- Wins are the headline digit; the leader's total is lit -->
          <span
            class="digit text-right text-base leading-none"
            :class="team.divisionLeader ? 'lit' : 'text-chalk'"
          >{{ team.wins }}</span>
          <span class="digit text-right text-chalk-dim">{{ team.losses }}</span>
          <span class="digit text-right text-chalk">{{ team.pct }}</span>
          <span
            class="digit text-right"
            :class="team.gamesBack === '-' ? 'lit' : 'text-chalk-dim'"
          >
            {{ team.gamesBack }}
          </span>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
