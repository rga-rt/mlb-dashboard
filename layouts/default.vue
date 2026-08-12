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
          <nav class="flex items-center gap-1" :aria-label="$t('nav.primary')">
            <NuxtLinkLocale
              to="/standings"
              class="nameplate px-2.5 py-2 text-[11px] tracking-widest text-chalk-dim transition-colors hover:text-bulb"
              active-class="text-bulb"
            >
              {{ $t('nav.board') }}
            </NuxtLinkLocale>
            <NuxtLinkLocale
              to="/scoreboard"
              class="nameplate flex items-center gap-1.5 px-2.5 py-2 text-[11px] tracking-widest text-chalk-dim transition-colors hover:text-bulb"
              active-class="text-bulb"
            >
              <span class="bulb inline-block h-1.5 w-1.5" aria-hidden="true" />
              {{ $t('nav.liveToday') }}
            </NuxtLinkLocale>
          </nav>
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
