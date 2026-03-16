import { z } from 'zod';

export const envSchema = z.object({
  // Servidor
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8082),
  APP_NAME: z.string().min(1, 'APP_NAME is required. Add it to your .env file (see api/.env.example).'),

  // OpenTelemetry
  OTEL_SDK_DISABLED: z.string().default('false'),
  OTEL_SERVICE_NAME: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().min(1, 'OTEL_EXPORTER_OTLP_ENDPOINT is required. Add it to your .env file (see api/.env.example).'),
  OTEL_EXPORTER_OTLP_PROTOCOL: z.string().default('grpc'),
  OTEL_PROMETHEUS_PORT: z.coerce.number().default(9464),

  // PostgreSQL
  DB_HOST: z.string().min(1, 'DB_HOST is required. Add it to your .env file (see api/.env.example).'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().min(1, 'DB_USER is required. Add it to your .env file (see api/.env.example).'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD is required. Add it to your .env file (see api/.env.example).'),
  DB_NAME: z.string().min(1, 'DB_NAME is required. Add it to your .env file (see api/.env.example).'),

  // Autenticação
  API_KEY: z.string().min(1, 'API_KEY is required. Add it to your .env file (see api/.env.example).'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const zodError = result.error as z.ZodError;
    const errors = zodError.issues.map((e) => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
    throw new Error(`Environment validation failed:\n${errors}`);
  }
  return result.data;
}
