<script setup lang="ts">
import { rosterStatusLabel, rosterStatusTone } from '~/utils/roster'

// A small roster-status chip (IL / Minors / DFA / Traded / ...). Renders nothing
// for an active player, so callers can drop it in unconditionally. Injuries take
// the clay accent; everything else stays neutral.
const props = defineProps<{ status: string }>()

const { t, te } = useI18n()

const label = computed(() => {
  const abbr = rosterStatusLabel(props.status)
  const key = `status.${abbr}`
  return te(key) ? t(key) : abbr
})
const tone = computed(() => rosterStatusTone(props.status))
</script>

<template>
  <span
    v-if="status !== 'Active'"
    class="nameplate shrink-0 border px-1.5 py-0.5 text-[10px] tracking-wider"
    :class="tone === 'injury' ? 'border-clay/60 text-clay' : 'border-line/50 text-chalk-dim'"
  >
    {{ label }}
  </span>
</template>
