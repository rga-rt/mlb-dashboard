<script setup lang="ts">
import type { Division } from '~/types/mlb'

defineProps<{ division: Division }>()
</script>

<template>
  <section class="overflow-hidden rounded-sm border border-line bg-panel">
    <!-- Division nameplate -->
    <div class="flex items-center justify-between border-b border-line bg-field-deep px-4 py-2">
      <h2 class="nameplate text-sm tracking-wider text-chalk">
        {{ division.divisionName }}
      </h2>
      <span
        class="nameplate rounded-sm border border-line px-1.5 py-0.5 text-[10px] tracking-widest text-chalk-dim"
      >
        {{ division.league }}
      </span>
    </div>

    <!-- Column headers, like the printed labels on a standings board -->
    <div
      class="nameplate grid grid-cols-[1.25rem_1fr_2rem_2rem_3rem_2.75rem] items-center gap-2 border-b border-line/60 px-4 py-1.5 text-[10px] tracking-wider text-chalk-dim"
    >
      <span class="text-center">#</span>
      <span>Team</span>
      <span class="text-right">W</span>
      <span class="text-right">L</span>
      <span class="text-right">PCT</span>
      <span class="text-right">GB</span>
    </div>

    <ul>
      <li v-for="team in division.teams" :key="team.teamId">
        <NuxtLink
          :to="`/team/${team.teamId}`"
          class="grid grid-cols-[1.25rem_1fr_2rem_2rem_3rem_2.75rem] items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-field-deep/70 focus:bg-field-deep focus:outline-none"
        >
          <!-- Rank cell doubles as the leader "lamp" -->
          <span class="flex justify-center">
            <span
              v-if="team.divisionLeader"
              class="inline-block h-2 w-2 rounded-full bg-bulb shadow-[0_0_8px_1px_rgba(232,176,75,0.7)]"
              title="Division leader"
            />
            <span v-else class="tabular-nums text-xs text-chalk-dim">{{ team.divisionRank }}</span>
          </span>

          <span class="truncate">
            <span class="nameplate text-[15px] tracking-wide text-chalk">{{ team.name }}</span>
          </span>

          <span class="text-right tabular-nums text-chalk">{{ team.wins }}</span>
          <span class="text-right tabular-nums text-chalk-dim">{{ team.losses }}</span>
          <span class="text-right tabular-nums text-chalk">{{ team.pct }}</span>
          <span
            class="text-right tabular-nums"
            :class="team.gamesBack === '-' ? 'text-bulb' : 'text-chalk-dim'"
          >
            {{ team.gamesBack }}
          </span>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
