<script setup lang="ts">
import type { Division } from '~/types/mlb'
import type { SortKey, SortState } from '~/utils/teamOrder'
import { DEFAULT_DIR, DEFAULT_SORT, nextSort, orderTeams } from '~/utils/teamOrder'

// `season` is carried into the team link so a team opens on the same season
// the board is showing.
const props = defineProps<{ division: Division; season: number }>()

const { isPinned, toggle } = usePinnedTeams()

// Sort is a per-division, in-session concern — it resets on reload. Pins float
// on top of whatever sort is active (see orderTeams).
const sort = ref<SortState>({ ...DEFAULT_SORT })
const rows = computed(() => orderTeams(props.division.teams, sort.value, isPinned))

// The printed column labels, doubling as sort buttons. Widths still come from
// the <colgroup>; these classes only set padding + alignment per column.
const COLUMNS: { key: SortKey; label: string; th: string; justify: string }[] = [
  { key: 'rank', label: '#', th: 'pl-4 text-center', justify: 'justify-center' },
  { key: 'name', label: 'Team', th: 'text-left', justify: 'justify-start' },
  { key: 'wins', label: 'W', th: 'pr-1 text-right', justify: 'justify-end' },
  { key: 'losses', label: 'L', th: 'pr-1 text-right', justify: 'justify-end' },
  { key: 'pct', label: 'PCT', th: 'pr-1 text-right', justify: 'justify-end' },
  { key: 'gamesBack', label: 'GB', th: 'pr-4 text-right', justify: 'justify-end' },
]

function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
  if (sort.value.key !== key) return 'none'
  return sort.value.dir === 'asc' ? 'ascending' : 'descending'
}

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
      <!--
        Number columns tighten on phones so the team name — the thing a fan
        actually scans for — keeps the width it deserves; desktop widths are
        unchanged. table-fixed reads these col widths.
      -->
      <colgroup>
        <col class="w-7">
        <col>
        <col class="w-8 sm:w-10">
        <col class="w-8 sm:w-9">
        <col class="w-11 sm:w-[3.25rem]">
        <col class="w-9 sm:w-12">
      </colgroup>

      <!--
        Column headers double as sort buttons. Each <th> carries aria-sort so a
        screen reader announces the active column + direction; the amber caret is
        the sighted cue. Clicking the active column flips it; the # column
        (standings rank) is the reset.
      -->
      <thead>
        <tr class="nameplate border-b border-line/50 text-[10px] tracking-wider text-chalk-dim">
          <th
            v-for="col in COLUMNS"
            :key="col.key"
            scope="col"
            :aria-sort="ariaSort(col.key)"
            class="py-1.5 font-medium"
            :class="col.th"
          >
            <button
              type="button"
              class="group/sort flex w-full cursor-pointer items-center gap-1 tracking-wider transition-colors hover:text-chalk focus-visible:text-bulb focus:outline-none"
              :class="[col.justify, sort.key === col.key ? 'text-bulb' : '']"
              @click="sort = nextSort(sort, col.key)"
            >
              <span>{{ col.label }}</span>
              <!-- Active column shows its live direction; inactive columns
                   reveal a faint caret on hover/focus so it's clear they sort. -->
              <span
                v-if="sort.key === col.key"
                aria-hidden="true"
                class="text-[8px] leading-none"
              >{{ sort.dir === 'asc' ? '▲' : '▼' }}</span>
              <span
                v-else
                aria-hidden="true"
                class="text-[8px] leading-none opacity-0 transition-opacity group-hover/sort:opacity-60 group-focus-visible/sort:opacity-60"
              >{{ DEFAULT_DIR[col.key] === 'asc' ? '▲' : '▼' }}</span>
            </button>
          </th>
        </tr>
      </thead>

      <!-- Each team is a number-card slot, divided by dark metal channels -->
      <tbody>
        <tr
          v-for="team in rows"
          :key="team.teamId"
          class="group relative border-b border-seam text-sm transition-colors last:border-b-0 hover:bg-field-deep focus-within:bg-field-deep"
          :class="team.divisionLeader ? 'bg-panel-lit' : ''"
        >
          <!-- Rank number, shown for every row so the column stays uniform and
               screen readers announce the leader's rank too. -->
          <td class="py-2.5 pl-3 text-center align-middle sm:pl-4">
            <span class="digit text-xs text-chalk-dim">{{ team.divisionRank }}</span>
          </td>

          <!-- Team name is the row's header. The visible name truncates on its
               own element; a separate transparent link is stretched over the
               whole row so the row stays click-anywhere while keeping one real,
               keyboard-focusable target with a visible focus ring. -->
          <th scope="row" class="py-2.5 text-left align-middle font-normal">
            <span class="flex min-w-0 items-center gap-2">
              <!-- The leader's plate is lit: one lamp, the board's sole glowing
                   accent, marks the division leader (with panel-lit behind it). -->
              <span
                v-if="team.divisionLeader"
                class="inline-flex shrink-0 items-center"
                title="Division leader"
              >
                <span class="bulb inline-block h-2 w-2" aria-hidden="true" />
                <span class="sr-only">Division leader</span>
              </span>
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
                class="nameplate min-w-0 flex-1 truncate text-[15px] tracking-wide text-chalk"
              >{{ team.name }}</span>
              <!--
                Follow toggle: sits above the stretched row link (z-10) so a tap
                toggles the follow instead of navigating. Amber when followed; on
                hover-capable pointers it rests hidden and appears on row
                hover/focus, but on touch (no hover) it keeps a faint resting
                state and a 44px tap target so the feature stays discoverable.
              -->
              <button
                type="button"
                class="relative z-10 -my-1 inline-flex shrink-0 cursor-pointer items-center justify-center px-1.5 py-1 text-sm leading-none transition-opacity duration-150 focus:outline-none focus-visible:opacity-100 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
                :class="isPinned(team.teamId)
                  ? 'text-bulb opacity-100'
                  : 'text-chalk-dim opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-50'"
                :aria-pressed="isPinned(team.teamId)"
                :aria-label="`${isPinned(team.teamId) ? 'Unfollow' : 'Follow'} the ${team.name}`"
                @click="toggle(team.teamId)"
              >{{ isPinned(team.teamId) ? '★' : '☆' }}</button>
            </span>
            <NuxtLink
              :to="`/team/${team.teamId}?season=${season}`"
              :aria-label="`View ${team.name}`"
              class="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bulb"
            />
          </th>

          <!-- Wins are the headline digit. No glow: the lamp is the only lit
               thing now, so its scarcity carries the leader cue. -->
          <td class="digit py-2.5 pr-1 text-right align-middle text-base leading-none text-chalk">{{ team.wins }}</td>
          <!-- On the lit leader slot every readout reads a step brighter, so the
               leader's loss count is full chalk (also keeps AA contrast on panel-lit) -->
          <td
            class="digit py-2.5 pr-1 text-right align-middle"
            :class="team.divisionLeader ? 'text-chalk' : 'text-chalk-dim'"
          >{{ team.losses }}</td>
          <td class="digit py-2.5 pr-1 text-right align-middle text-chalk">{{ team.pct }}</td>
          <td
            class="digit py-2.5 pr-3 text-right align-middle sm:pr-4"
            :class="team.gamesBack === '-' ? 'text-chalk' : 'text-chalk-dim'"
          >{{ team.gamesBack }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
