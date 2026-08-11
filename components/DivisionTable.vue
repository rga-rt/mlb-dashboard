<script setup lang="ts">
import type { Division } from '~/types/mlb'

// `season` is carried into the team link so a team opens on the same season
// the board is showing.
defineProps<{ division: Division; season: number }>()

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

    <!--
      A real standings table: the number slots are still visually a scoreboard,
      but the semantics (caption, column headers, row headers) let a screen
      reader announce "New York, wins 92" instead of a bare run of numbers.
      table-fixed + <colgroup> pins the same column widths the grid used to.
    -->
    <table class="w-full table-fixed border-collapse">
      <caption class="sr-only">
        {{ division.divisionName }} standings — wins, losses, winning percentage, and games behind the leader
      </caption>
      <colgroup>
        <col style="width: 1.75rem">
        <col>
        <col style="width: 2.5rem">
        <col style="width: 2.25rem">
        <col style="width: 3.25rem">
        <col style="width: 3rem">
      </colgroup>

      <!-- Column headers, like the printed labels on a standings board -->
      <thead>
        <tr class="nameplate border-b border-line/50 text-[10px] tracking-wider text-chalk-dim">
          <th scope="col" class="py-1.5 pl-4 text-center font-medium">#</th>
          <th scope="col" class="py-1.5 text-left font-medium">Team</th>
          <th scope="col" class="py-1.5 pr-1 text-right font-medium">W</th>
          <th scope="col" class="py-1.5 pr-1 text-right font-medium">L</th>
          <th scope="col" class="py-1.5 pr-1 text-right font-medium">PCT</th>
          <th scope="col" class="py-1.5 pr-4 text-right font-medium">GB</th>
        </tr>
      </thead>

      <!-- Each team is a number-card slot, divided by dark metal channels -->
      <tbody>
        <tr
          v-for="team in division.teams"
          :key="team.teamId"
          class="relative border-b border-seam text-sm transition-colors last:border-b-0 hover:bg-field-deep focus-within:bg-field-deep"
          :class="team.divisionLeader ? 'bg-panel-lit' : ''"
        >
          <!-- Rank cell doubles as the leader "lamp" -->
          <td class="py-2.5 pl-4 text-center align-middle">
            <span v-if="team.divisionLeader" class="inline-flex items-center justify-center">
              <span class="bulb inline-block h-2.5 w-2.5" aria-hidden="true" />
              <span class="sr-only">Division leader</span>
            </span>
            <span v-else class="digit text-xs text-chalk-dim">{{ team.divisionRank }}</span>
          </td>

          <!-- Team name is the row's header. The visible name truncates on its
               own element; a separate transparent link is stretched over the
               whole row so the row stays click-anywhere while keeping one real,
               keyboard-focusable target with a visible focus ring. -->
          <th scope="row" class="py-2.5 text-left align-middle font-normal">
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
              <span
                :title="team.name"
                class="nameplate min-w-0 truncate text-[15px] tracking-wide text-chalk"
              >{{ team.name }}</span>
            </span>
            <NuxtLink
              :to="`/team/${team.teamId}?season=${season}`"
              :aria-label="`View ${team.name}`"
              class="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bulb"
            />
          </th>

          <!-- Wins are the headline digit; the leader's total is lit -->
          <td
            class="digit py-2.5 pr-1 text-right align-middle text-base leading-none"
            :class="team.divisionLeader ? 'lit' : 'text-chalk'"
          >{{ team.wins }}</td>
          <!-- On the lit leader slot every readout reads a step brighter, so the
               leader's loss count is full chalk (also keeps AA contrast on panel-lit) -->
          <td
            class="digit py-2.5 pr-1 text-right align-middle"
            :class="team.divisionLeader ? 'text-chalk' : 'text-chalk-dim'"
          >{{ team.losses }}</td>
          <td class="digit py-2.5 pr-1 text-right align-middle text-chalk">{{ team.pct }}</td>
          <td
            class="digit py-2.5 pr-4 text-right align-middle"
            :class="team.gamesBack === '-' ? 'lit' : 'text-chalk-dim'"
          >{{ team.gamesBack }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
