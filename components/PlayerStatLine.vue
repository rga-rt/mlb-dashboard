<script setup lang="ts">
import type { PlayerResponse } from '~/types/mlb'
import { RATE_STATS, columnsFor, statValue } from '~/utils/playerStats'

defineProps<{ player: PlayerResponse }>()
</script>

<template>
  <div class="space-y-5">
    <div
      v-if="player.lines.length === 0"
      class="border border-dashed border-line px-4 py-6 text-center text-sm text-chalk-dim"
    >
      No {{ player.name.split(' ')[0] }} stat lines for this season yet.
    </div>

    <div
      v-for="line in player.lines"
      :key="line.group"
      class="border border-seam bg-panel"
    >
      <div class="flex items-center justify-between border-b-2 border-seam bg-field-deep px-4 py-2.5">
        <h4 class="nameplate flex items-center gap-2 text-xs tracking-widest text-chalk">
          <span class="bulb inline-block h-1.5 w-1.5" aria-hidden="true" />
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
                class="digit px-3 py-2.5 text-right text-sm first:pl-4 last:pr-4"
                :class="RATE_STATS.includes(col.key) ? 'lit' : 'text-chalk'"
              >
                {{ statValue(line, col.key) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
