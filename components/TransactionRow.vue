<script setup lang="ts">
import type { Transaction } from '~/types/mlb'
import { isInjuryTransaction } from '~/utils/transactions'

// One transaction line for the News feed: a type badge plus the feed's
// ready-made description, with a link to the player's stats when we have the
// ids. `from` tags that link so the team page's back button returns here.
const props = defineProps<{ tx: Transaction, from?: string }>()

const { t, te } = useI18n()

const injury = computed(() => isInjuryTransaction(props.tx.typeCode, props.tx.description))

// Localize the type badge by typeCode (IL is derived, not a real code), falling
// back to the feed's own typeDesc when we have no translation.
const badge = computed(() => {
  if (injury.value) return te('news.type.IL') ? t('news.type.IL') : 'IL'
  const key = `news.type.${props.tx.typeCode}`
  return te(key) ? t(key) : (props.tx.type || props.tx.typeCode)
})

const link = computed(() =>
  props.tx.playerId != null && props.tx.teamId != null
    ? { path: `/team/${props.tx.teamId}`, query: { player: String(props.tx.playerId), ...(props.from ? { from: props.from } : {}) } }
    : null,
)
</script>

<template>
  <div class="flex gap-2.5 px-1 py-2.5">
    <!-- League tag: which wire this came off (MLB / LMB / LMP) -->
    <span class="nameplate mt-1 w-9 shrink-0 text-[9px] tracking-widest text-chalk-dim/60">{{ tx.league }}</span>
    <span
      class="nameplate mt-0.5 h-fit shrink-0 border px-1.5 py-0.5 text-[10px] tracking-wider"
      :class="injury ? 'border-clay/60 text-clay' : 'border-line/50 text-chalk-dim'"
    >{{ badge }}</span>
    <p class="min-w-0 flex-1 text-[13px] leading-snug text-chalk-dim">
      {{ tx.description }}
      <NuxtLinkLocale
        v-if="link"
        :to="link"
        class="whitespace-nowrap underline decoration-dotted decoration-chalk-dim/50 underline-offset-2 transition-colors hover:text-bulb hover:decoration-bulb focus-visible:text-bulb focus:outline-none"
        :aria-label="$t('scoreboard.viewPlayer', { name: tx.playerName })"
      >{{ $t('news.viewStats') }} ↗</NuxtLinkLocale>
    </p>
  </div>
</template>
