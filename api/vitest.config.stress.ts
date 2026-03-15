import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/stress/**/*.stress-spec.ts'],
    setupFiles: ['test/setup.ts'],
    fileParallelism: false,
    // Stress tests precisam de timeout maior — cada suite dispara dezenas de req concorrentes
    testTimeout: 60000,
    hookTimeout: 60000,
    env: {
      NODE_ENV: 'test',
      APP_NAME: 'test-api',
      API_KEY: 'test-api-key',
      OTEL_SDK_DISABLED: 'true',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4317',
      DB_HOST: process.env.DB_HOST ?? 'localhost',
      DB_PORT: process.env.DB_PORT ?? '5432',
      DB_USER: process.env.DB_USER ?? 'postgres',
      DB_PASSWORD: process.env.DB_PASSWORD ?? 'postgres',
      // DB_STRESS_NAME permite usar um banco isolado para stress (opcional)
      DB_NAME: process.env.DB_STRESS_NAME ?? process.env.DB_TEST_NAME ?? 'postgres_test',
    },
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oxc: false as any,
});
