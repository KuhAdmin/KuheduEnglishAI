import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    // The `*.db.test.ts` files share one test database, which each of them empties.
    fileParallelism: false,
  },
})
