<script setup lang="ts">
import type { CompareRow } from '~/utils/playerStats'
import { ordinal } from '~/utils/playerStats'

defineProps<{
  rows: CompareRow[]
  teamName: string
  // "hitting" | "pitching" — labels the strip so it's clear what's ranked.
  group: string
}>()
</script>

<template>
  <section class="border border-seam bg-panel">
    <div class="flex items-baseline justify-between border-b-2 border-seam bg-field-deep px-4 py-2.5">
      <h4 class="nameplate flex items-center gap-2 text-xs tracking-widest text-chalk">
        <span class="bulb inline-block h-1.5 w-1.5" aria-hidden="true" />
        {{ $t('rank.onThe', { team: teamName }) }}
      </h4>
      <span class="nameplate text-[10px] tracking-[0.2em] text-chalk-dim">{{ $t('rank.rank', { group: $t(`groups.${group}`) }) }}</span>
    </div>

    <ul class="divide-y divide-seam">
      <li
        v-for="row in rows"
        :key="row.key"
        class="grid grid-cols-[2.5rem_3rem_1fr_auto] items-center gap-3 px-4 py-2.5"
      >
        <span class="nameplate text-[11px] tracking-wider text-chalk-dim">{{ row.label }}</span>
        <span
          class="digit text-sm"
          :class="row.isLeader ? 'lit' : 'text-chalk'"
        >
          {{ row.value }}
        </span>

        <!-- Gauge: fill relative to the team's best on this stat -->
        <span class="block h-2 overflow-hidden border border-seam bg-field-deep" aria-hidden="true">
          <span
            class="block h-full transition-[width] duration-500"
            :class="row.isLeader ? 'bg-bulb' : 'bg-bulb/35'"
            :style="{ width: `${Math.round(row.fill * 100)}%` }"
          />
        </span>

        <span class="nameplate text-right text-[11px] tracking-wider tabular-nums">
          <template v-if="row.rank">
            <span :class="row.isLeader ? 'lit' : 'text-chalk'">{{ ordinal(row.rank) }}</span>
            <span class="text-chalk-dim"> / {{ row.total }}</span>
          </template>
          <span v-else class="text-chalk-dim">—</span>
        </span>
      </li>
    </ul>
  </section>
</template>
