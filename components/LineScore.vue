<script setup lang="ts">
import type { LineScore } from '~/types/mlb'

// The classic inning-by-inning box. `live` lights the current inning's column
// amber (the one-lamp cue); a final game shows the same grid, unlit.
const props = defineProps<{
  line: LineScore
  awayAbbr: string
  homeAbbr: string
  live?: boolean
}>()

// Columns run 1..N — at least the scheduled innings, more if the game went
// extras — so a mid-game card still reads as a full scorecard, future innings
// blank. Each column carries both sides' runs (null ⇒ that half wasn't batted).
const cols = computed(() => {
  const byNum = new Map(props.line.innings.map(i => [i.num, i]))
  const n = Math.max(props.line.scheduledInnings, props.line.innings.length)
  return Array.from({ length: n }, (_, k) => {
    const num = k + 1
    const inn = byNum.get(num)
    return { num, away: inn?.away ?? null, home: inn?.home ?? null }
  })
})

const rows = computed(() => [
  { side: 'away' as const, abbr: props.awayAbbr, ...props.line.away },
  { side: 'home' as const, abbr: props.homeAbbr, ...props.line.home },
])

// Only mark a live game's current inning; a finished game's lamp is off.
const litInning = computed(() => (props.live ? props.line.currentInning : -1))
</script>

<template>
  <div class="overflow-x-auto border-t border-seam bg-field-deep/40 px-3 py-2.5">
    <table class="linescore" :aria-label="$t('linescore.caption')">
      <thead>
        <tr>
          <th scope="col" class="ls-corner" />
          <th
            v-for="c in cols"
            :key="c.num"
            scope="col"
            class="ls-inn digit"
            :class="c.num === litInning ? 'text-bulb' : 'text-chalk-dim'"
          >{{ c.num }}</th>
          <th scope="col" class="ls-tot ls-r digit">{{ $t('linescore.r') }}</th>
          <th scope="col" class="ls-tot digit">{{ $t('linescore.h') }}</th>
          <th scope="col" class="ls-tot digit">{{ $t('linescore.e') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.side">
          <th scope="row" class="ls-team nameplate">{{ row.abbr }}</th>
          <td
            v-for="c in cols"
            :key="c.num"
            class="ls-cell digit"
            :class="c.num === litInning ? 'text-bulb' : 'text-chalk'"
          >{{ c[row.side] ?? '' }}</td>
          <td class="ls-cell ls-r digit">{{ row.r }}</td>
          <td class="ls-cell digit text-chalk-dim">{{ row.h }}</td>
          <td class="ls-cell digit text-chalk-dim">{{ row.e }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.linescore {
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.linescore th,
.linescore td {
  text-align: center;
  padding: 0.15rem 0;
  min-width: 1.35rem;
  font-size: 11px;
  line-height: 1.4;
}
/* Team column: left-aligned label, a touch wider, a seam dividing it from the
   grid. */
.ls-team,
.ls-corner {
  min-width: 2.5rem;
  text-align: left;
  padding-right: 0.5rem;
  border-right: 1px solid var(--color-seam);
}
.ls-team {
  font-size: 11px;
  letter-spacing: 0.03em;
  color: var(--color-chalk);
}
.ls-inn {
  letter-spacing: 0.02em;
}
/* R/H/E totals sit past a seam; R is the emphasized one. */
.ls-tot {
  color: var(--color-chalk-dim);
}
.ls-r {
  border-left: 1px solid var(--color-seam);
}
.ls-cell.ls-r {
  color: var(--color-chalk);
  font-weight: 600;
}
.ls-tot.ls-r {
  color: var(--color-chalk);
}
</style>
