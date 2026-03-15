import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { shutdownTelemetry } from '../../src/telemetry.js';
import { API_KEY, createApp } from '../helpers.js';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
    await shutdownTelemetry();
  });

  describe('GET /', () => {
    it('deve retornar Hello World! sem autenticação', async () => {
      await request(app.getHttpServer()).get('/').expect(200).expect('Hello World!');
    });
  });

  describe('Autenticação', () => {
    it('deve retornar 401 sem API key em rota protegida', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);
    });

    it('deve retornar 401 com API key errada', async () => {
      await request(app.getHttpServer()).get('/users').set('x-api-key', 'chave-errada').expect(401);
    });

    it('deve liberar acesso com API key correta', async () => {
      await request(app.getHttpServer()).get('/users').set('x-api-key', API_KEY).expect(200);
    });
  });

  describe('GET /debug/error/500', () => {
    it('deve retornar 500', async () => {
      await request(app.getHttpServer()).get('/debug/error/500').set('x-api-key', API_KEY).expect(500);
    });
  });

  describe('GET /debug/error/502', () => {
    it('deve retornar 502', async () => {
      await request(app.getHttpServer()).get('/debug/error/502').set('x-api-key', API_KEY).expect(502);
    });
  });
});
