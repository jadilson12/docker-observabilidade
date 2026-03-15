import { INestApplication } from '@nestjs/common';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { App } from 'supertest/types';
import { shutdownTelemetry } from '../../src/telemetry.js';
import { API_KEY, createApp } from '../helpers.js';

function stubFetch(body: object, ok = true) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  } as Response);
}

describe('CEP (e2e)', () => {
  let app: INestApplication<App>;
  const auth = { 'x-api-key': API_KEY };

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
    await shutdownTelemetry();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /cep/:cep', () => {
    it('retorna endereço para CEP válido (sem traço)', async () => {
      stubFetch({
        logradouro: 'Avenida Paulista',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
      });

      const res = await request(app.getHttpServer()).get('/cep/01310100').set(auth).expect(200);

      expect(res.body).toMatchObject({
        cep: '01310100',
        logradouro: 'Avenida Paulista',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        estado: 'SP',
      });
    });

    it('retorna endereço para CEP válido (com traço)', async () => {
      stubFetch({
        logradouro: 'Rua XV de Novembro',
        bairro: 'Centro',
        localidade: 'Curitiba',
        uf: 'PR',
      });

      const res = await request(app.getHttpServer()).get('/cep/80020-310').set(auth).expect(200);

      expect(res.body).toMatchObject({
        cep: '80020310',
        cidade: 'Curitiba',
        estado: 'PR',
      });
    });

    it('retorna 404 quando ViaCEP retorna erro: true', async () => {
      stubFetch({ erro: 'true' });

      await request(app.getHttpServer()).get('/cep/99999999').set(auth).expect(404);
    });

    it('retorna 400 para CEP com menos de 8 dígitos', async () => {
      await request(app.getHttpServer()).get('/cep/1234').set(auth).expect(400);
    });

    it('retorna 400 para CEP com mais de 8 dígitos', async () => {
      await request(app.getHttpServer()).get('/cep/123456789').set(auth).expect(400);
    });

    it('retorna 502 quando serviço ViaCEP está indisponível', async () => {
      stubFetch({}, false);

      await request(app.getHttpServer()).get('/cep/01310100').set(auth).expect(502);
    });

    it('retorna 502 quando fetch lança erro de rede', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

      await request(app.getHttpServer()).get('/cep/01310100').set(auth).expect(502);
    });

    it('retorna 401 sem API key', async () => {
      await request(app.getHttpServer()).get('/cep/01310100').expect(401);
    });
  });
});
