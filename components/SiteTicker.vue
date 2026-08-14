<script setup lang="ts">
import type { ScoreboardResponse } from '~/types/mlb'

// Site-wide scores ribbon: today's slate drifting under the masthead on every
// page. Lazy so it never blocks a page's first paint, and keyed to share the
// 'scoreboard' fetch with the Live Today page — while that page polls, this bar
// updates along with it.
const { data } = useLazyFetch<ScoreboardResponse>('/api/scoreboard', {
  key: 'scoreboard',
})
</script>

<template>
  <ScoreTicker v-if="data && data.games.length" :games="data.games" />
</template>
