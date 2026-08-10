<script setup lang="ts">
import type { FieldDimensions, TeamInfoResponse } from '~/types/mlb'

const props = defineProps<{ info: TeamInfoResponse }>()

const venue = computed(() => props.info.venue)

// Each outfield marker's anchor on the wall arc, plus where its distance label
// sits. Only the ones the feed actually has are drawn.
const MARKERS: { key: keyof FieldDimensions, x: number, y: number, tx: number, ty: number, anchor: 'start' | 'middle' | 'end', accent?: boolean }[] = [
  { key: 'leftLine', x: 36, y: 110, tx: 30, ty: 122, anchor: 'end' },
  { key: 'leftCenter', x: 98, y: 66, tx: 98, ty: 56, anchor: 'middle' },
  { key: 'center', x: 160, y: 51, tx: 160, ty: 40, anchor: 'middle', accent: true },
  { key: 'rightCenter', x: 222, y: 66, tx: 222, ty: 56, anchor: 'middle' },
  { key: 'rightLine', x: 284, y: 110, tx: 290, ty: 122, anchor: 'start' },
]

const points = computed(() =>
  MARKERS
    .map(m => ({ ...m, dist: venue.value.dimensions[m.key] }))
    .filter((m): m is typeof m & { dist: number } => m.dist != null),
)
const hasDimensions = computed(() => points.value.length > 0)

const place = computed(() => [venue.value.city, venue.value.state].filter(Boolean).join(', '))

const facts = computed(() => {
  const f: { label: string, value: string }[] = []
  if (props.info.firstYearOfPlay) f.push({ label: 'Founded', value: props.info.firstYearOfPlay })
  if (venue.value.capacity != null) f.push({ label: 'Capacity', value: venue.value.capacity.toLocaleString('en-US') })
  if (venue.value.turf) f.push({ label: 'Surface', value: venue.value.turf })
  if (venue.value.roof) f.push({ label: 'Roof', value: venue.value.roof })
  return f
})
</script>

<template>
  <section class="border border-seam bg-panel">
    <div class="flex items-baseline justify-between border-b-2 border-seam bg-field-deep px-4 py-2.5">
      <h2 class="nameplate flex items-center gap-2 text-xs tracking-widest text-chalk">
        <span class="bulb inline-block h-1.5 w-1.5" aria-hidden="true" />
        Ballpark
      </h2>
      <span v-if="info.division" class="nameplate text-[10px] tracking-[0.2em] text-chalk-dim">
        {{ info.division }}
      </span>
    </div>

    <div class="grid gap-6 px-4 py-5 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <h3 class="nameplate text-2xl leading-none text-chalk">{{ venue.name ?? 'Ballpark' }}</h3>
        <p v-if="place" class="mt-1 text-xs text-chalk-dim">{{ place }}</p>

        <dl v-if="facts.length" class="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4">
          <div v-for="f in facts" :key="f.label">
            <dt class="nameplate text-[10px] tracking-[0.2em] text-chalk-dim">{{ f.label }}</dt>
            <dd class="digit mt-0.5 text-lg text-chalk">{{ f.value }}</dd>
          </div>
        </dl>
      </div>

      <!-- Signature: the outfield wall, ticked with each known distance (ft). -->
      <figure v-if="hasDimensions" class="mx-auto w-full max-w-[320px] md:w-[300px]">
        <svg viewBox="0 0 320 145" class="w-full" role="img" aria-label="Outfield dimensions in feet">
          <!-- foul lines home -> poles -->
          <path d="M160 134 L36 110 M160 134 L284 110" fill="none" style="stroke: var(--color-seam)" stroke-width="1.5" />
          <!-- outfield wall -->
          <path d="M36 110 Q160 -8 284 110" fill="none" style="stroke: var(--color-line)" stroke-width="2" stroke-linecap="round" />
          <!-- home plate -->
          <path d="M160 130 l5 4 -5 4 -5 -4 z" style="fill: var(--color-bulb)" />
          <g v-for="p in points" :key="p.key">
            <circle
              :cx="p.x"
              :cy="p.y"
              r="2.5"
              :style="p.accent ? 'fill: var(--color-bulb)' : 'fill: var(--color-chalk)'"
            />
            <text
              class="digit"
              :x="p.tx"
              :y="p.ty"
              :text-anchor="p.anchor"
              :style="{ fontSize: '12px', fill: p.accent ? 'var(--color-bulb)' : 'var(--color-chalk)' }"
            >
              {{ p.dist }}
            </text>
          </g>
        </svg>
        <figcaption class="nameplate mt-1 text-center text-[10px] tracking-[0.25em] text-chalk-dim">
          Outfield · ft
        </figcaption>
      </figure>
    </div>
  </section>
</template>
