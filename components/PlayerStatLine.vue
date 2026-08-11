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
      {{ $t('statline.empty', { name: player.name.split(' ')[0] }) }}
    </div>

    <div
      v-for="line in player.lines"
      :key="line.group"
      class="border border-seam bg-panel"
    >
      <div class="flex items-center justify-between border-b-2 border-seam bg-field-deep px-4 py-2.5">
        <h4 class="nameplate flex items-center gap-2 text-xs tracking-widest text-chalk">
          <span class="bulb inline-block h-1.5 w-1.5" aria-hidden="true" />
          {{ $t(`groups.${line.group}`) }} · {{ line.season }}
        </h4>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-max">
          <thead>
            <tr class="nameplate text-[10px] tracking-wider text-chalk-dim">
              <th
                v-for="col in columnsFor(line)"
                :key="col.key"
                :title="col.description"
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

      <!-- Box-score key: what each abbreviation means. Shown by default (it's
           the legend for a jargon-dense line); collapsible to trim the scroll. -->
      <details open class="group/key border-t border-seam bg-field-deep/40">
        <summary
          class="nameplate flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-[10px] tracking-[0.25em] text-chalk-dim transition-colors hover:text-chalk focus-visible:text-chalk focus-visible:outline-none"
        >
          <span class="text-[8px] leading-none transition-transform group-open/key:rotate-90" aria-hidden="true">▸</span>
          {{ $t('statline.key') }}
        </summary>
        <dl class="flex flex-wrap gap-x-5 gap-y-1.5 px-4 pb-3">
          <div v-for="col in columnsFor(line)" :key="col.key" class="flex items-baseline gap-1.5">
            <dt class="nameplate text-[10px] tracking-wider text-chalk">{{ col.label }}</dt>
            <dd class="text-[11px] leading-none text-chalk-dim">{{ col.description }}</dd>
          </div>
        </dl>
      </details>
    </div>
  </div>
</template>
