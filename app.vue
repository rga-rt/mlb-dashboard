<script setup lang="ts">
// Keep <html lang> in sync with the active locale for a11y and SEO.
const { locale } = useI18n()
useHead({ htmlAttrs: { lang: locale } })
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
