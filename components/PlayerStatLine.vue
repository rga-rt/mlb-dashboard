<script setup lang="ts">
import type { PlayerResponse, StatLine } from '~/types/mlb'

defineProps<{ player: PlayerResponse }>()

// The stats worth surfacing per group, in scoreboard order.
// key = field in the MLB stat object, label = column header shown.
const HITTING: { key: string; label: string }[] = [
  { key: 'gamesPlayed', label: 'G' },
  { key: 'atBats', label: 'AB' },
  { key: 'runs', label: 'R' },
  { key: 'hits', label: 'H' },
  { key: 'homeRuns', label: 'HR' },
  { key: 'rbi', label: 'RBI' },
  { key: 'baseOnBalls', label: 'BB' },
  { key: 'strikeOuts', label: 'SO' },
  { key: 'stolenBases', label: 'SB' },
  { key: 'avg', label: 'AVG' },
  { key: 'obp', label: 'OBP' },
  { key: 'slg', label: 'SLG' },
  { key: 'ops', label: 'OPS' },
]

const PITCHING: { key: string; label: string }[] = [
  { key: 'wins', label: 'W' },
  { key: 'losses', label: 'L' },
  { key: 'era', label: 'ERA' },
  { key: 'gamesPlayed', label: 'G' },
  { key: 'gamesStarted', label: 'GS' },
  { key: 'saves', label: 'SV' },
  { key: 'inningsPitched', label: 'IP' },
  { key: 'strikeOuts', label: 'SO' },
  { key: 'baseOnBalls', label: 'BB' },
  { key: 'whip', label: 'WHIP' },
  { key: 'strikeoutsPer9Inn', label: 'K/9' },
]

function columnsFor(line: StatLine) {
  return line.group === 'pitching' ? PITCHING : HITTING
}

function value(line: StatLine, key: string): string {
  const v = line.stats[key]
  return v === undefined || v === null || v === '' ? '—' : String(v)
}
</script>

<template>
  <div class="space-y-5">
    <div
      v-if="player.lines.length === 0"
      class="rounded-sm border border-dashed border-line px-4 py-6 text-center text-sm text-chalk-dim"
    >
      No {{ player.name.split(' ')[0] }} stat lines for this season yet.
    </div>

    <div
      v-for="line in player.lines"
      :key="line.group"
      class="overflow-hidden rounded-sm border border-line bg-panel"
    >
      <div class="flex items-center justify-between border-b border-line bg-field-deep px-4 py-2">
        <h4 class="nameplate text-xs tracking-widest text-bulb">
          {{ line.group }} · {{ line.season }}
        </h4>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-max">
          <thead>
            <tr class="nameplate text-[10px] tracking-wider text-chalk-dim">
              <th
                v-for="col in columnsFor(line)"
                :key="col.key"
                class="px-3 py-1.5 text-right font-medium first:pl-4 last:pr-4"
              >
                {{ col.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-t border-line/50">
              <td
                v-for="col in columnsFor(line)"
                :key="col.key"
                class="px-3 py-2.5 text-right tabular-nums text-sm text-chalk first:pl-4 last:pr-4"
                :class="['avg', 'obp', 'slg', 'ops', 'era', 'whip'].includes(col.key) ? 'text-bulb' : ''"
              >
                {{ value(line, col.key) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
