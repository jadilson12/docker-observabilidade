import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModuleBuilder } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';

export const API_KEY = process.env.API_KEY ?? 'test-api-key';

/** Adiciona o header x-api-key a qualquer request do supertest */
export function withApiKey(req: ReturnType<typeof request.agent>): typeof req {
  return req.set('x-api-key', API_KEY);
}

/** Cria e inicializa a aplicação NestJS para os testes e2e */
export async function createApp(
  configure?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<INestApplication<App>> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (configure) builder = configure(builder);

  const moduleFixture = await builder.compile();
  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(0);
  return app;
}
