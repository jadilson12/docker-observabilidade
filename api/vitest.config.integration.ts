import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/integration/**/*.integration-spec.ts'],
    setupFiles: ['test/integration/setup.ts'],
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 15000,
    env: {
      NODE_ENV: 'test',
      APP_NAME: 'test-api',
      API_KEY: 'test-api-key',
      OTEL_SDK_DISABLED: 'true',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4317',
    },
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oxc: false as any,
});
