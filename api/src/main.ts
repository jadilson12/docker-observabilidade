import 'dotenv/config';
import { validateEnv } from './config/env';
validateEnv(process.env as Record<string, unknown>);

import { initTelemetry } from './telemetry';
void initTelemetry();

import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { OtelLogger } from './common/otel-logger';
import { setupSwagger } from './common/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new OtelLogger({
      prefix: process.env.APP_NAME ?? 'api',
    }),
  });

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  setupSwagger(app);

  const port = process.env.PORT ?? 8082;

  await app.listen(port);
}
void bootstrap();
