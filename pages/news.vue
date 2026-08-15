<script setup lang="ts">
import type { NewsResponse } from '~/types/mlb'

const { t, locale } = useI18n()

const { data, pending, error, refresh } = await useFetch<NewsResponse>('/api/news')

// "Posted HH:MM" freshness stamp, client-side only so the time never mismatches
// between server and client render.
const lastUpdated = ref<Date | null>(null)
const justUpdated = ref(false)
let flashTimer: ReturnType<typeof setTimeout> | undefined
function markUpdated() {
  if (error.value || !data.value) return
  lastUpdated.value = new Date()
  justUpdated.value = true
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (justUpdated.value = false), 1200)
}
onMounted(markUpdated)
watch(pending, (now: boolean, was: boolean) => {
  if (was && !now) markUpdated()
})
onBeforeUnmount(() => clearTimeout(flashTimer))

const postedLabel = computed(() =>
  lastUpdated.value
    ? lastUpdated.value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null,
)

// Day label: "Today" / "Yesterday" for the two most recent days, else weekday +
// date. Anchored on the response's `end` (the server's today), so the string is
// identical on server and client — no hydration mismatch.
const yesterday = computed(() => (data.value ? addDays(data.value.end, -1) : ''))
function dayLabel(date: string): string {
  if (data.value && date === data.value.end) return t('news.today')
  if (date === yesterday.value) return t('news.yesterday')
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(locale.value, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// Split the wire into two league sections — MLB and the Mexican leagues — each
// keeping its own newest-first date grouping. Section order follows the locale,
// mirroring the standings board: MLB first for English, the Mexican leagues
// first for Spanish. A section only appears when it has moves.
const MEXICAN = new Set(['LMB', 'LMP'])
const sections = computed(() => {
  const days = data.value?.days ?? []
  const daysFor = (inMexican: boolean) =>
    days
      .map(d => ({ date: d.date, transactions: d.transactions.filter(t => MEXICAN.has(t.league) === inMexican) }))
      .filter(d => d.transactions.length > 0)

  const mlb = { key: 'mlb', days: daysFor(false) }
  const mex = { key: 'mex', days: daysFor(true) }
  const ordered = locale.value === 'es' ? [mex, mlb] : [mlb, mex]
  return ordered.filter(s => s.days.length > 0)
})

useSeo('news')
</script>

<template>
  <div>
    <!-- Hero: headline plus a manual refresh and the freshness stamp -->
    <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="nameplate flex items-center gap-2 text-xs tracking-[0.3em] text-chalk-dim">
          <span class="bulb inline-block h-2 w-2" aria-hidden="true" />
          {{ $t('news.eyebrow') }}
        </p>
        <h1 class="nameplate mt-2 text-5xl leading-[0.85] text-chalk md:text-6xl">
          {{ $t('news.title') }}
        </h1>
      </div>
      <div class="flex flex-col items-end gap-1.5">
        <button
          class="nameplate border border-seam bg-field-deep px-3 py-2 text-xs tracking-wider text-chalk-dim transition-colors hover:border-bulb hover:text-bulb focus:border-bulb focus:text-bulb focus:outline-none"
          :disabled="pending"
          @click="refresh()"
        >
          {{ pending ? $t('board.refreshing') : $t('board.refresh') }}
        </button>
        <p
          v-if="postedLabel"
          aria-live="polite"
          class="nameplate text-[11px] tracking-wider transition-colors duration-500"
          :class="justUpdated ? 'text-bulb' : 'text-chalk-dim'"
        >
          {{ $t('board.posted', { time: postedLabel }) }}
        </p>
      </div>
    </div>

    <p v-if="!error || data" class="mb-6 max-w-2xl text-sm text-chalk-dim">
      {{ $t('news.intro') }}
    </p>

    <!-- Refresh failed but we still have a feed: keep it, banner above. -->
    <div
      v-if="error && data"
      role="alert"
      class="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border border-clay/50 bg-panel px-4 py-3"
    >
      <span class="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-clay/80 ring-1 ring-clay" aria-hidden="true" />
      <p class="min-w-0 flex-1 text-sm text-chalk-dim">{{ $t('scoreboard.refreshFailed') }}</p>
      <button
        class="nameplate shrink-0 border border-seam bg-field-deep px-3 py-1.5 text-xs tracking-wider text-chalk transition-colors hover:border-bulb hover:text-bulb focus:border-bulb focus:text-bulb focus:outline-none"
        :disabled="pending"
        @click="refresh()"
      >
        {{ pending ? $t('board.refreshing') : $t('board.tryAgain') }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="pending && !data" class="space-y-3">
      <div v-for="n in 8" :key="n" class="h-12 animate-pulse border border-seam bg-panel/50" />
    </div>

    <!-- First-load error: no feed to fall back to -->
    <div v-else-if="error && !data" role="alert" class="border border-clay/50 bg-panel px-5 py-6">
      <h2 class="nameplate flex items-center gap-2 text-lg text-clay">
        <span class="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-clay/80 ring-1 ring-clay" aria-hidden="true" />
        {{ $t('scoreboard.errTitle') }}
      </h2>
      <p class="mt-1 text-sm text-chalk-dim">{{ $t('scoreboard.errBody') }}</p>
      <button
        class="nameplate mt-4 border border-seam bg-field-deep px-3 py-2 text-xs tracking-wider text-chalk transition-colors hover:border-bulb hover:text-bulb focus:border-bulb focus:text-bulb focus:outline-none"
        @click="refresh()"
      >
        {{ $t('board.tryAgain') }}
      </button>
    </div>

    <!-- Loaded, but no moves in the window -->
    <div v-else-if="data && !sections.length" class="border border-seam bg-panel px-5 py-6">
      <h2 class="nameplate flex items-center gap-2 text-lg text-chalk">
        <span class="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-seam ring-1 ring-line" aria-hidden="true" />
        {{ $t('news.emptyTitle') }}
      </h2>
      <p class="mt-1 text-sm text-chalk-dim">{{ $t('news.emptyBody') }}</p>
    </div>

    <!-- The wire, split into league sections (locale-ordered), each grouped by day -->
    <div v-else-if="data" class="space-y-12">
      <section v-for="section in sections" :key="section.key">
        <!-- League section banner -->
        <div class="mb-5 flex items-center gap-3">
          <span class="bulb inline-block h-2 w-2 shrink-0" aria-hidden="true" />
          <h2 class="nameplate shrink-0 text-xs tracking-[0.28em] text-chalk">
            {{ $t(section.key === 'mex' ? 'board.sectionMexican' : 'board.sectionMlb') }}
          </h2>
          <span class="h-0.5 flex-1 bg-seam" aria-hidden="true" />
        </div>

        <!-- Date sub-groups within the section -->
        <div class="space-y-8">
          <section v-for="day in section.days" :key="day.date">
            <div class="mb-3 flex items-center gap-3">
              <span class="inline-block h-1.5 w-1.5 shrink-0 bg-chalk-dim/50" aria-hidden="true" />
              <h3 class="nameplate shrink-0 text-[11px] tracking-[0.25em] text-chalk-dim">{{ dayLabel(day.date) }}</h3>
              <span class="h-px flex-1 bg-seam" aria-hidden="true" />
              <span class="nameplate shrink-0 text-[11px] tracking-wider text-chalk-dim">{{ day.transactions.length }}</span>
            </div>
            <div class="divide-y divide-seam border border-seam bg-panel px-3">
              <TransactionRow
                v-for="tx in day.transactions"
                :key="tx.id"
                :tx="tx"
                from="news"
              />
            </div>
          </section>
        </div>
      </section>
    </div>
  </div>
</template>
