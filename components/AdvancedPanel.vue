<script setup lang="ts">
import type { PlayerAdvancedResponse } from '~/types/mlb'
import type { SaberStat } from '~/utils/advanced'
import { SABER_HITTING, SABER_PITCHING, expectedRows, formatSaber } from '~/utils/advanced'

const props = defineProps<{
  group: 'hitting' | 'pitching'
  year: number
  sabermetrics: PlayerAdvancedResponse['sabermetrics']
  standard: PlayerAdvancedResponse['standard']
  expected: PlayerAdvancedResponse['expected']
}>()

const saberStats = computed<SaberStat[]>(() => (props.group === 'pitching' ? SABER_PITCHING : SABER_HITTING))
const cards = computed(() => saberStats.value.map((c: SaberStat) => ({ cfg: c, value: formatSaber(props.sabermetrics?.[c.key], c) })))
const hasSaber = computed(() => cards.value.some((c: { value: string }) => c.value !== '—'))
const rows = computed(() => (props.group === 'hitting' ? expectedRows(props.standard, props.sabermetrics, props.expected) : []))
</script>

<template>
  <section v-if="hasSaber" class="border border-seam bg-panel">
    <div class="flex items-baseline justify-between border-b-2 border-seam bg-field-deep px-4 py-2.5">
      <h4 class="nameplate flex items-center gap-2 text-xs tracking-widest text-chalk">
        <span class="bulb inline-block h-1.5 w-1.5" aria-hidden="true" />
        {{ $t('advanced.title') }}
      </h4>
      <span class="nameplate text-[10px] tracking-[0.2em] text-chalk-dim">{{ year }}</span>
    </div>

    <div class="px-4 py-4">
      <dl class="grid grid-cols-4 gap-x-4 gap-y-1">
        <div v-for="c in cards" :key="c.cfg.key" class="text-center">
          <dt class="nameplate text-[10px] tracking-wider text-chalk-dim" :title="c.cfg.hint">{{ c.cfg.label }}</dt>
          <dd class="digit mt-0.5 text-xl text-chalk">{{ c.value }}</dd>
        </div>
      </dl>

      <!-- Statcast expected vs actual — the luck read (hitters). -->
      <div v-if="rows.length" class="mt-4 border-t border-seam pt-3">
        <p class="nameplate mb-2 text-[10px] tracking-[0.2em] text-chalk-dim">{{ $t('advanced.actualVsExpected') }}</p>
        <table class="w-full text-sm">
          <thead>
            <tr class="nameplate text-[10px] tracking-wider text-chalk-dim">
              <th class="text-left font-medium" />
              <th class="px-2 text-right font-medium">{{ $t('advanced.actual') }}</th>
              <th class="px-2 text-right font-medium">{{ $t('advanced.expected') }}</th>
              <th class="pl-2 text-right font-medium">Δ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.label" class="border-t border-line/40">
              <td class="nameplate py-1.5 text-[11px] tracking-wider text-chalk-dim">{{ r.label }}</td>
              <td class="digit px-2 py-1.5 text-right text-chalk">{{ r.actual }}</td>
              <td class="digit px-2 py-1.5 text-right text-chalk-dim">{{ r.expected }}</td>
              <td
                class="digit py-1.5 pl-2 text-right"
                :class="r.over === null ? 'text-chalk-dim' : r.over ? 'text-bulb' : 'text-clay'"
              >
                {{ r.delta }}
              </td>
            </tr>
          </tbody>
        </table>
        <p class="mt-2 text-[11px] leading-snug text-chalk-dim">
          {{ $t('advanced.caption') }}
        </p>
      </div>
    </div>
  </section>
</template>
