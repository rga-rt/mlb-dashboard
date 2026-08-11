<script setup lang="ts">
// Two-locale toggle (English / Spanish). With prefix_except_default the choice
// lives in the URL (/ vs /es/...), so this is a real crawlable link to the
// current route in the other locale via switchLocalePath.
const { locale } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const other = computed<'en' | 'es'>(() => (locale.value === 'es' ? 'en' : 'es'))
const otherName = computed(() => (locale.value === 'es' ? 'English' : 'Español'))
</script>

<template>
  <NuxtLink
    :to="switchLocalePath(other)"
    class="nameplate inline-flex items-center gap-1.5 border border-line px-2.5 py-1.5 text-[11px] tracking-widest text-chalk-dim transition-colors hover:border-bulb focus-visible:border-bulb focus:outline-none"
    :aria-label="`${$t('lang.label')}: ${otherName}`"
    :title="otherName"
  >
    <span :class="locale === 'en' ? 'text-bulb' : ''">EN</span>
    <span aria-hidden="true" class="text-line">/</span>
    <span :class="locale === 'es' ? 'text-bulb' : ''">ES</span>
  </NuxtLink>
</template>
