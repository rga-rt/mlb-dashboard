<template>
  <div class="min-h-screen">
    <!-- Masthead: styled like the header strip of a manual scoreboard -->
    <header class="border-b-2 border-line bg-field-deep">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
        <NuxtLink to="/" class="group flex items-center gap-3">
          <!-- The lit bulb: the one amber accent the whole design leans on -->
          <span
            class="inline-block h-3 w-3 rounded-full bg-bulb shadow-[0_0_10px_2px_rgba(232,176,75,0.6)]"
            aria-hidden="true"
          />
          <span class="nameplate text-2xl leading-none text-chalk md:text-3xl">
            The Scoreboard
          </span>
        </NuxtLink>
        <p class="nameplate hidden text-xs tracking-widest text-chalk-dim sm:block">
          MLB · Standings · Rosters · Stats
        </p>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <NuxtPage />
    </main>

    <footer class="border-t border-line/60 py-6">
      <p class="mx-auto max-w-6xl px-4 text-center text-xs text-chalk-dim md:px-6">
        Data from the public MLB Stats API · proxied server-side to keep the
        browser CORS-free.
      </p>
    </footer>
  </div>
</template>
