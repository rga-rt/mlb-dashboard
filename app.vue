<script setup lang="ts">
// Keep <html lang> in sync with the active locale for a11y and SEO.
const { locale } = useI18n()
useHead({
  htmlAttrs: { lang: locale },
  // Pages set a concise title via useSeo(); this appends the brand. A page with
  // no title of its own falls back to the full brand line.
  titleTemplate: (title?: string) =>
    title ? `${title} · The Scoreboard` : 'The Scoreboard — Live MLB Standings, Scores & Stats',
})

// Site-wide social defaults; each page fills in its own title/description via
// useSeo(). A large-image Twitter card is declared here — the image itself is
// added with the OG-image module in the follow-up SEO pass.
useSeoMeta({
  ogSiteName: 'The Scoreboard',
  ogType: 'website',
  twitterCard: 'summary_large_image',
  ogLocale: computed(() => (locale.value === 'es' ? 'es_ES' : 'en_US')),
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
