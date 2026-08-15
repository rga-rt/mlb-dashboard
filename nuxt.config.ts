import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/eslint', '@nuxt/test-utils/module', '@nuxtjs/i18n'],

  css: ['~/assets/css/main.css'],

  // Language switch (English / Spanish). prefix_except_default keeps English at
  // the bare routes (/, /standings, /team/:id) and serves Spanish under /es/*,
  // so the language is shareable in the URL. Choice also persists in a cookie.
  i18n: {
    langDir: 'locales',
    strategy: 'prefix_except_default',
    defaultLocale: 'en',
    locales: [
      { code: 'en', name: 'English', language: 'en-US', file: 'en.json' },
      { code: 'es', name: 'Español', language: 'es-ES', file: 'es.json' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
      redirectOn: 'root',
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },

  app: {
    // The title template is a function, so it's set at runtime in app.vue —
    // nuxt.config is serialized and can't carry a function.
    head: {
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'A ballpark-scoreboard dashboard for live MLB standings, rosters, and player stats.',
        },
        { name: 'theme-color', content: '#052018' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&display=swap',
        },
      ],
    },
  },

  // The MLB base URL lives in runtime config so it can be overridden with
  // NUXT_MLB_BASE if the API ever moves, without touching code.
  runtimeConfig: {
    mlbBase: 'https://statsapi.mlb.com/api/v1',
  },
})
