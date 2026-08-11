<script setup lang="ts">
// Two-locale toggle (English / Spanish). no_prefix strategy means setLocale
// persists the choice in a cookie; the routes stay the same.
const { locale, setLocale } = useI18n()

const other = computed<'en' | 'es'>(() => (locale.value === 'es' ? 'en' : 'es'))
const otherName = computed(() => (locale.value === 'es' ? 'English' : 'Español'))
</script>

<template>
  <button
    type="button"
    class="nameplate inline-flex items-center gap-1.5 border border-line px-2.5 py-1.5 text-[11px] tracking-widest text-chalk-dim transition-colors hover:border-bulb focus-visible:border-bulb focus:outline-none"
    :aria-label="`${$t('lang.label')}: ${otherName}`"
    :title="otherName"
    @click="setLocale(other)"
  >
    <span :class="locale === 'en' ? 'text-bulb' : ''">EN</span>
    <span aria-hidden="true" class="text-line">/</span>
    <span :class="locale === 'es' ? 'text-bulb' : ''">ES</span>
  </button>
</template>
