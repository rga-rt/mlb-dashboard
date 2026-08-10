<script setup lang="ts">
import type { PlayerHistoryResponse, ZipsProjection } from '~/types/mlb'
import type { ForecastStat, LinearModel, Point } from '~/utils/forecast'
import { HITTING_FORECAST, PITCHING_FORECAST, formatForecast, linearRegression, seriesFor } from '~/utils/forecast'

const props = defineProps<{
  personId: number
  group: 'hitting' | 'pitching'
  sportId: number
  projection?: ZipsProjection | null // ZiPS full-season projection, when available
}>()

const { data: history, pending } = useFetch<PlayerHistoryResponse>(
  () => `/api/player-history/${props.personId}?group=${props.group}&sportId=${props.sportId}`,
  { lazy: true },
)

const metrics = computed<ForecastStat[]>(() => (props.group === 'pitching' ? PITCHING_FORECAST : HITTING_FORECAST))
const statKey = ref(metrics.value[0].key)
watch(metrics, (m: ForecastStat[]) => {
  if (!m.some((x: ForecastStat) => x.key === statKey.value)) statKey.value = m[0].key
})
const stat = computed(() => metrics.value.find((m: ForecastStat) => m.key === statKey.value) ?? metrics.value[0])

const series = computed(() => seriesFor(history.value?.seasons ?? [], statKey.value))

// The ZiPS projected value for the selected stat, if the feed has one.
const zips = computed<Point | null>(() => {
  const p = props.projection
  if (!p) return null
  const raw = p.stats[statKey.value]
  const y = raw === undefined || raw === null || raw === '' ? null : Number.parseFloat(String(raw))
  return y != null && Number.isFinite(y) ? { x: p.season, y } : null
})

// With a ZiPS point at the current (in-progress) season, the line shows only
// completed seasons; otherwise it's the whole history.
const linePoints = computed<Point[]>(() => (zips.value ? series.value.filter((pt: Point) => pt.x < zips.value!.x) : series.value))
const haveLine = computed(() => linePoints.value.length >= 2)

const ols = computed<LinearModel>(() => linearRegression(linePoints.value))

// TensorFlow.js refit of the trend line — client only, non-fatal, OLS otherwise.
const tf = ref<{ slope: number, intercept: number, epochs: number, loss: number } | null>(null)
const tfPending = ref(false)
async function runTF() {
  tf.value = null
  if (!import.meta.client || !haveLine.value) return
  tfPending.value = true
  try {
    const { fitLinearTF } = await import('~/utils/tfFit')
    tf.value = await fitLinearTF(linePoints.value)
  } catch {
    tf.value = null
  } finally {
    tfPending.value = false
  }
}
watch(linePoints, runTF, { immediate: true })

const model = computed<LinearModel>(() => {
  const t = tf.value
  if (t && Number.isFinite(t.slope) && Number.isFinite(t.intercept)) {
    return { slope: t.slope, intercept: t.intercept, r2: ols.value.r2, predict: (x: number) => t.intercept + t.slope * x }
  }
  return ols.value
})

// The headline projection: ZiPS if we have it, else the fitted line one year out.
const forecast = computed<Point | null>(() => {
  if (zips.value) return zips.value
  if (!haveLine.value) return null
  const nextX = (linePoints.value.at(-1)?.x ?? new Date().getFullYear()) + 1
  return { x: nextX, y: model.value.predict(nextX) }
})
const source = computed(() => (zips.value ? 'ZiPS' : 'linear'))

const trendLabel = computed(() => {
  const s = model.value.slope
  if (Math.abs(s) < 1e-6) return 'holding steady'
  return s > 0 ? 'trending up' : 'trending down'
})
const fitLabel = computed(() => (tf.value ? `TensorFlow.js · ${tf.value.epochs} epochs` : tfPending.value ? 'training…' : 'least squares'))
</script>

<template>
  <section class="border border-seam bg-panel">
    <div class="flex items-baseline justify-between border-b-2 border-seam bg-field-deep px-4 py-2.5">
      <h4 class="nameplate flex items-center gap-2 text-xs tracking-widest text-chalk">
        <span class="bulb inline-block h-1.5 w-1.5" aria-hidden="true" />
        Forecast
      </h4>
      <span class="nameplate text-[10px] tracking-[0.2em] text-chalk-dim">
        {{ source === 'ZiPS' ? 'ZiPS projection' : 'linear trend · illustrative' }}
      </span>
    </div>

    <div class="px-4 py-4">
      <div class="mb-4 flex flex-wrap gap-1.5">
        <button
          v-for="m in metrics"
          :key="m.key"
          class="nameplate border px-2.5 py-1 text-[11px] tracking-wider transition-colors"
          :class="m.key === statKey ? 'border-bulb text-bulb' : 'border-seam text-chalk-dim hover:border-line hover:text-chalk'"
          @click="statKey = m.key"
        >
          {{ m.label }}
        </button>
      </div>

      <div v-if="pending" class="h-48 animate-pulse border border-seam bg-panel/50" />

      <p v-else-if="!forecast" class="border border-dashed border-line px-4 py-8 text-center text-sm text-chalk-dim">
        Not enough {{ stat.label }} history to project a trend.
      </p>

      <template v-else>
        <ForecastChart v-if="haveLine" :points="linePoints" :model="model" :forecast="forecast" :stat="stat" />

        <div class="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-seam pt-4">
          <div>
            <p class="nameplate text-[10px] tracking-[0.2em] text-chalk-dim">
              {{ source === 'ZiPS' ? `ZiPS projection · ${forecast.x}` : `Projected ${forecast.x}` }}
            </p>
            <p class="mt-0.5 flex items-baseline gap-2">
              <span class="digit lit text-3xl leading-none">{{ formatForecast(forecast.y, stat) }}</span>
              <span class="nameplate text-xs text-chalk-dim">{{ stat.label }}</span>
            </p>
          </div>
          <dl class="grid grid-cols-2 gap-x-6 gap-y-1 text-right">
            <dt class="nameplate text-[10px] tracking-[0.2em] text-chalk-dim">Source</dt>
            <dd class="text-sm text-chalk">{{ source === 'ZiPS' ? 'ZiPS' : 'linear fit' }}</dd>
            <dt class="nameplate text-[10px] tracking-[0.2em] text-chalk-dim">Recent trend</dt>
            <dd class="text-sm text-chalk">{{ trendLabel }}</dd>
            <dt class="nameplate text-[10px] tracking-[0.2em] text-chalk-dim">Trend fit</dt>
            <dd class="text-sm text-chalk">{{ fitLabel }}</dd>
          </dl>
        </div>
      </template>
    </div>
  </section>
</template>
