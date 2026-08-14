<template>
  <div class="min-h-screen">
    <SiteMasthead />

    <!-- Site-wide scores ribbon: today's slate on every page, under the nav. -->
    <SiteTicker />

    <main class="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <slot />
    </main>

    <footer class="mt-4 border-t-2 border-seam py-6">
      <p class="mx-auto max-w-6xl px-4 text-center text-[11px] tracking-wider text-chalk-dim md:px-6">
        {{ $t('footer.app') }}
      </p>
    </footer>
  </div>
</template>
