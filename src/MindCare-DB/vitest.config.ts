import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      JWT_SECRET: 'test-secret-mindcare-2024',
      DATABASE_URL: 'postgresql://mindcare:mindcare@localhost:5433/mindcare',
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      CORS_ORIGIN: 'http://localhost:5173',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/db/migrations/**', 'src/db/seed.ts'],
    },
    setupFiles: ['./src/tests/setup.ts'],
  },
})
