<script setup lang="ts">
import { scaleLinear } from 'd3-scale'
import { line as d3line } from 'd3-shape'
import type { ForecastStat, LinearModel, Point } from '~/utils/forecast'
import { formatForecast } from '~/utils/forecast'

const props = defineProps<{
  points: Point[] // historical (season, value), season-ascending
  model: LinearModel // the trend line to draw
  forecast: Point // { x: next season, y: predicted value }
  stat: ForecastStat
}>()

// Fixed internal coordinate system; the SVG scales to its container via
// viewBox (responsive without measuring the DOM, so it renders under SSR too).
const W = 640
const H = 300
const M = { top: 16, right: 20, bottom: 34, left: 48 }

const tickLabel = (v: number) => formatForecast(v, props.stat)

const chart = computed(() => {
  const pts = props.points
  const fc = props.forecast
  const seasons = [...pts.map(p => p.x), fc.x]
  const xDomain: [number, number] = [Math.min(...seasons), Math.max(...seasons)]

  const trendPts: Point[] = [
    { x: xDomain[0], y: props.model.predict(xDomain[0]) },
    { x: xDomain[1], y: props.model.predict(xDomain[1]) },
  ]

  const ys = [...pts.map(p => p.y), fc.y, ...trendPts.map(t => t.y)]
  let yMin = Math.min(...ys)
  let yMax = Math.max(...ys)
  const pad = (yMax - yMin) * 0.15 || Math.abs(yMax) * 0.15 || 1
  yMin -= pad
  yMax += pad
  if (props.stat.rate && yMin < 0) yMin = 0 // rates don't go negative

  const x = scaleLinear().domain(xDomain).range([M.left, W - M.right])
  const y = scaleLinear().domain([yMin, yMax]).range([H - M.bottom, M.top])

  const path = d3line<Point>().x(p => x(p.x)).y(p => y(p.y))
  const lastHist = pts[pts.length - 1]

  return {
    histPath: path(pts) ?? '',
    trendPath: path(trendPts) ?? '',
    connector: lastHist ? `M${x(lastHist.x)},${y(lastHist.y)}L${x(fc.x)},${y(fc.y)}` : '',
    histPoints: pts.map(p => ({ ...p, X: x(p.x), Y: y(p.y) })),
    fc: { X: x(fc.x), Y: y(fc.y) },
    xTicks: [...new Set(seasons)].sort((a, b) => a - b).map(v => ({ v, X: x(v) })),
    yTicks: y.ticks(5).map(v => ({ v, Y: y(v) })),
    plotLeft: M.left,
    plotRight: W - M.right,
  }
})
</script>

<template>
  <figure class="m-0">
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="w-full"
      role="img"
      :aria-label="`${stat.label} by season with a projected ${forecast.x} value of ${tickLabel(forecast.y)}`"
    >
      <!-- y gridlines + labels -->
      <g v-for="t in chart.yTicks" :key="`y${t.v}`">
        <line :x1="chart.plotLeft" :x2="chart.plotRight" :y1="t.Y" :y2="t.Y" style="stroke: var(--color-line)" stroke-width="0.5" stroke-opacity="0.6" />
        <text :x="chart.plotLeft - 8" :y="t.Y" text-anchor="end" dominant-baseline="middle" class="digit" style="font-size: 11px; fill: var(--color-chalk-dim)">{{ tickLabel(t.v) }}</text>
      </g>

      <!-- x labels (seasons) -->
      <text
        v-for="t in chart.xTicks"
        :key="`x${t.v}`"
        :x="t.X"
        :y="H - 12"
        text-anchor="middle"
        class="digit"
        style="font-size: 11px"
        :style="{ fill: t.v === forecast.x ? 'var(--color-bulb)' : 'var(--color-chalk-dim)' }"
      >{{ t.v }}</text>

      <!-- trend (the fitted line — secondary to the projection) -->
      <path :d="chart.trendPath" fill="none" style="stroke: var(--color-chalk-dim)" stroke-width="1.5" stroke-dasharray="5 4" stroke-opacity="0.55" />
      <!-- historical line + points -->
      <path :d="chart.histPath" fill="none" style="stroke: var(--color-chalk)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      <circle v-for="p in chart.histPoints" :key="`p${p.x}`" :cx="p.X" :cy="p.Y" r="3" style="fill: var(--color-chalk)" />
      <!-- forecast -->
      <path :d="chart.connector" fill="none" style="stroke: var(--color-bulb)" stroke-width="1.5" stroke-dasharray="2 3" />
      <circle :cx="chart.fc.X" :cy="chart.fc.Y" r="5" style="fill: var(--color-bulb)" stroke="var(--color-field)" stroke-width="1.5" />
    </svg>

    <!-- Accessible data alternative to the chart. -->
    <figcaption class="sr-only">
      {{ stat.label }} by season:
      <span v-for="p in points" :key="p.x">{{ p.x }} was {{ tickLabel(p.y) }}. </span>
      Projected {{ forecast.x }}: {{ tickLabel(forecast.y) }}.
    </figcaption>
  </figure>
</template>
