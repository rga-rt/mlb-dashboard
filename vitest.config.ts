import { defineVitestConfig } from '@nuxt/test-utils/config'

// Tests run in the default node environment. defineVitestConfig wires up the
// project's ~/@ path aliases so imports match the rest of the app. Individual
// tests that need the full Nuxt runtime can opt in with `// @vitest-environment nuxt`.
export default defineVitestConfig({
  test: {
    include: ['test/**/*.{test,spec}.ts'],
  },
})
