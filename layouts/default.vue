<template>
  <div class="min-h-screen">
    <!-- Masthead: the metal header channel bolted across the top of the board -->
    <header class="border-b-2 border-seam bg-field-deep">
      <!-- flex-wrap so the nav drops to its own row on mobile: row 1 is the
           logo + language switch, row 2 the (scrollable) tabs. On sm+ it all
           sits inline again. -->
      <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-4 md:px-6">
        <NuxtLinkLocale to="/" class="group mr-auto flex items-center gap-3">
          <!-- The lit bulb: the one amber accent the whole design leans on -->
          <span class="bulb inline-block h-3.5 w-3.5" aria-hidden="true" />
          <span class="nameplate text-xl leading-none text-chalk sm:text-2xl md:text-3xl">
            The Scoreboard
          </span>
        </NuxtLinkLocale>
        <nav
          class="order-last flex w-full items-center justify-end gap-1 overflow-x-auto sm:order-none sm:w-auto sm:justify-normal sm:overflow-visible"
          :aria-label="$t('nav.primary')"
        >
          <NuxtLinkLocale
            to="/standings"
            class="nameplate shrink-0 whitespace-nowrap px-2.5 py-2 text-[11px] tracking-widest text-chalk-dim transition-colors hover:text-bulb"
            active-class="text-bulb"
          >
            {{ $t('nav.board') }}
          </NuxtLinkLocale>
          <NuxtLinkLocale
            to="/scoreboard"
            class="nameplate flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-2 text-[11px] tracking-widest text-chalk-dim transition-colors hover:text-bulb"
            active-class="text-bulb"
          >
            <span class="bulb inline-block h-1.5 w-1.5" aria-hidden="true" />
            {{ $t('nav.liveToday') }}
          </NuxtLinkLocale>
          <NuxtLinkLocale
            to="/upcoming"
            class="nameplate shrink-0 whitespace-nowrap px-2.5 py-2 text-[11px] tracking-widest text-chalk-dim transition-colors hover:text-bulb"
            active-class="text-bulb"
          >
            {{ $t('nav.upcoming') }}
          </NuxtLinkLocale>
          <NuxtLinkLocale
            to="/news"
            class="nameplate shrink-0 whitespace-nowrap px-2.5 py-2 text-[11px] tracking-widest text-chalk-dim transition-colors hover:text-bulb"
            active-class="text-bulb"
          >
            {{ $t('nav.news') }}
          </NuxtLinkLocale>
        </nav>
        <LangSwitch />
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
