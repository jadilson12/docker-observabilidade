/**
 * Testes de Integração — CEP
 *
 * Usa o CepService REAL (cepService: null na factory) com fetch mockado.
 * Testa o pipeline completo: guard → controller → CepService → resposta HTTP.
 */
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { INestApplication } from '@nestjs/common';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createIntegrationApp } from './factory.js';

const API_KEY = 'test-api-key';
const AUTH = { 'x-api-key': API_KEY };

function stubFetch(body: object, ok = true) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  } as Response);
}

describe('CEP — Integração (CepService real + fetch mockado)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // cepService: null → não sobrescreve: usa o CepService real
    app = await createIntegrationApp({ cepService: null });
  });

  afterAll(async () => {
    await app.close();
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

      const res = await request(app.getHttpServer()).get('/cep/01310100').set(AUTH).expect(200);

      expect(res.body).toMatchObject({
        cep: '01310100',
        logradouro: 'Avenida Paulista',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        estado: 'SP',
      });
    });

    it('normaliza CEP com traço para 8 dígitos', async () => {
      stubFetch({ logradouro: 'Rua XV', bairro: 'Centro', localidade: 'Curitiba', uf: 'PR' });

      const res = await request(app.getHttpServer()).get('/cep/80020-310').set(AUTH).expect(200);

      expect(res.body.cep).toBe('80020310');
    });

    it('preenche campos ausentes com string vazia', async () => {
      stubFetch({ localidade: 'São Paulo', uf: 'SP' });

      const res = await request(app.getHttpServer()).get('/cep/01310100').set(AUTH).expect(200);

      expect(res.body.logradouro).toBe('');
      expect(res.body.bairro).toBe('');
    });

    it('retorna 404 quando ViaCEP responde { erro: true }', async () => {
      stubFetch({ erro: 'true' });

      await request(app.getHttpServer()).get('/cep/99999999').set(AUTH).expect(404);
    });

    it('retorna 400 para CEP com menos de 8 dígitos', async () => {
      await request(app.getHttpServer()).get('/cep/1234').set(AUTH).expect(400);
    });

    it('retorna 400 para CEP com mais de 8 dígitos', async () => {
      await request(app.getHttpServer()).get('/cep/123456789').set(AUTH).expect(400);
    });

    it('retorna 502 quando ViaCEP responde HTTP !ok', async () => {
      stubFetch({}, false);

      await request(app.getHttpServer()).get('/cep/01310100').set(AUTH).expect(502);
    });

    it('retorna 502 quando fetch lança erro de rede', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

      await request(app.getHttpServer()).get('/cep/01310100').set(AUTH).expect(502);
    });

    it('retorna 401 sem API key', async () => {
      await request(app.getHttpServer()).get('/cep/01310100').expect(401);
    });
  });
});
