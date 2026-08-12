<script setup lang="ts">
import type { RosterPlayer } from '~/types/mlb'

defineProps<{
  group: { type: string, list: RosterPlayer[] }
  selectedId: number | null
}>()

defineEmits<{ select: [id: number] }>()

const { t, te } = useI18n()

// Localize the position-group header, falling back to the raw MLB value when the
// feed sends something we don't have a translation for.
function posLabel(type: string): string {
  const key = `positions.${type}`
  return te(key) ? t(key) : type
}
</script>

<template>
  <section class="border border-seam bg-panel">
    <h3
      class="nameplate border-b-2 border-seam bg-field-deep px-4 py-2.5 text-xs tracking-widest text-chalk-dim"
    >
      {{ posLabel(group.type) }}
    </h3>
    <ul class="divide-y divide-seam">
      <li v-for="p in group.list" :key="p.personId">
        <button
          class="tap-target relative flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-field-deep focus-visible:bg-field-deep focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-bulb"
          :class="selectedId === p.personId ? 'bg-panel-lit' : ''"
          :aria-pressed="selectedId === p.personId"
          :aria-current="selectedId === p.personId ? 'true' : undefined"
          @click="$emit('select', p.personId)"
        >
          <span
            class="digit w-8 shrink-0 text-right text-sm"
            :class="selectedId === p.personId ? 'lit' : 'text-chalk-dim'"
          >
            {{ p.jersey || '–' }}
          </span>
          <span class="nameplate flex-1 truncate text-[15px] tracking-wide text-chalk" :title="p.name">
            {{ p.name }}
          </span>
          <PlayerStatusBadge :status="p.status" />
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
