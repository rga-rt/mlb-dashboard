<script setup lang="ts">
// Shown when a bonus panel's fetch actually failed — so a network error reads
// as "retry", never as a silently missing panel the user mistakes for no data.
defineProps<{ label: string }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="flex items-center justify-between gap-3 border border-seam bg-panel px-4 py-3">
    <p class="text-[13px] text-chalk-dim">{{ label }}</p>
    <button
      type="button"
      class="nameplate tap-target relative shrink-0 border border-line px-2.5 py-1 text-[11px] tracking-wider text-chalk-dim transition-colors hover:border-bulb hover:text-bulb focus-visible:border-bulb focus-visible:text-bulb focus:outline-none"
      @click="$emit('retry')"
    >
      {{ $t('team.retry') }}
    </button>
  </div>
</template>
