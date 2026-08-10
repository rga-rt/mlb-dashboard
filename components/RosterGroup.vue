<script setup lang="ts">
import type { RosterPlayer } from '~/types/mlb'
import { rosterStatusLabel } from '~/utils/roster'

defineProps<{
  group: { type: string, list: RosterPlayer[] }
  selectedId: number | null
}>()

defineEmits<{ select: [id: number] }>()
</script>

<template>
  <section class="border border-seam bg-panel">
    <h3
      class="nameplate border-b-2 border-seam bg-field-deep px-4 py-2.5 text-xs tracking-widest text-chalk-dim"
    >
      {{ group.type }}
    </h3>
    <ul class="divide-y divide-seam">
      <li v-for="p in group.list" :key="p.personId">
        <button
          class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-field-deep focus:bg-field-deep focus:outline-none"
          :class="selectedId === p.personId ? 'bg-bulb/5' : ''"
          @click="$emit('select', p.personId)"
        >
          <span
            class="digit w-8 shrink-0 text-right text-sm"
            :class="selectedId === p.personId ? 'lit' : 'text-chalk-dim'"
          >
            {{ p.jersey || '–' }}
          </span>
          <span class="nameplate flex-1 truncate text-[15px] tracking-wide text-chalk">
            {{ p.name }}
          </span>
          <span
            v-if="p.status !== 'Active'"
            class="nameplate shrink-0 border border-line/50 px-1.5 py-0.5 text-[10px] tracking-wider text-clay/80"
          >
            {{ rosterStatusLabel(p.status) }}
          </span>
          <span
            class="nameplate shrink-0 border border-line px-1.5 py-0.5 text-[10px] tracking-wider text-chalk-dim"
          >
            {{ p.positionAbbr }}
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>
