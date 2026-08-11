<template>
  <div class="min-h-screen">
    <!-- Masthead: the metal header channel bolted across the top of the board -->
    <header class="border-b-2 border-seam bg-field-deep">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
        <NuxtLinkLocale to="/" class="group flex items-center gap-3">
          <!-- The lit bulb: the one amber accent the whole design leans on -->
          <span class="bulb inline-block h-3.5 w-3.5" aria-hidden="true" />
          <span class="nameplate text-2xl leading-none text-chalk md:text-3xl">
            The Scoreboard
          </span>
        </NuxtLinkLocale>
        <div class="flex items-center gap-4">
          <p class="nameplate hidden text-[11px] tracking-[0.25em] text-chalk-dim sm:block">
            {{ $t('masthead.subtitle') }}
          </p>
          <LangSwitch />
        </div>
      </div>
    </header>

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
