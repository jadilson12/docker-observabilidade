/**
 * Testes de Stress — Users
 *
 * Dispara requisições concorrentes contra o banco real (postgres_test ou DB_STRESS_NAME)
 * e valida latência / throughput mínimos aceitáveis.
 *
 * Execute com:
 *   npm run test:stress
 */
import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { App } from 'supertest/types';
import { CepService } from '../../src/cep/cep.service.js';
import { shutdownTelemetry } from '../../src/telemetry.js';
import { API_KEY, createApp } from '../helpers.js';
import { measureConcurrent } from './helpers.js';

describe('Users — Stress', () => {
  let app: INestApplication<App>;
  const auth = { 'x-api-key': API_KEY };
  const createdIds: string[] = [];

  beforeAll(async () => {
    // Sobe o app com CepService mockado para não depender de ViaCEP externo
    app = await createApp((builder) =>
      builder.overrideProvider(CepService).useValue({
        lookup: () =>
          Promise.resolve({
            cep: '01310100',
            logradouro: 'Av. Paulista',
            bairro: 'Bela Vista',
            cidade: 'São Paulo',
            estado: 'SP',
          }),
      }),
    );
  });

  afterAll(async () => {
    // Limpa todos os usuários criados durante o stress
    await Promise.allSettled(createdIds.map((id) => request(app.getHttpServer()).delete(`/users/${id}`).set(auth)));
    await app.close();
    await shutdownTelemetry();
  });

  // ─── Leitura concorrente ──────────────────────────────────────────────────

  describe('GET /users — leitura concorrente', () => {
    it('50 leituras simultâneas: p95 < 500ms, 0 erros', async () => {
      const result = await measureConcurrent(50, async () => {
        const res = await request(app.getHttpServer()).get('/users').set(auth);
        return res.status;
      });

      console.log('[stress] GET /users x50 —', {
        p50: result.p50,
        p95: result.p95,
        p99: result.p99,
        rps: result.rps.toFixed(1),
        errors: result.errors,
      });

      expect(result.errors).toBe(0);
      expect(result.p95).toBeLessThan(500);
    });

    it('100 leituras simultâneas: p99 < 1000ms, erros < 2%', async () => {
      const result = await measureConcurrent(100, async () => {
        const res = await request(app.getHttpServer()).get('/users').set(auth);
        return res.status;
      });

      console.log('[stress] GET /users x100 —', {
        p50: result.p50,
        p95: result.p95,
        p99: result.p99,
        rps: result.rps.toFixed(1),
        errors: result.errors,
      });

      expect(result.errors / result.total).toBeLessThan(0.02);
      expect(result.p99).toBeLessThan(1000);
    });
  });

  // ─── Escrita concorrente ──────────────────────────────────────────────────

  describe('POST /users — escrita concorrente', () => {
    it('20 criações simultâneas: p95 < 1000ms, 0 erros', async () => {
      const result = await measureConcurrent(20, async () => {
        const email = `stress-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
        const res = await request(app.getHttpServer()).post('/users').set(auth).send({ name: 'Stress User', email });

        if (res.status === 201) {
          createdIds.push((res.body as { id: string }).id);
        }
        return res.status;
      });

      console.log('[stress] POST /users x20 —', {
        p50: result.p50,
        p95: result.p95,
        p99: result.p99,
        rps: result.rps.toFixed(1),
        errors: result.errors,
      });

      expect(result.errors).toBe(0);
      expect(result.p95).toBeLessThan(1000);
    });
  });

  // ─── Carga mista (leitura + escrita) ─────────────────────────────────────

  describe('Carga mista — GET e POST intercalados', () => {
    it('30 leituras + 10 escritas simultâneas: p99 < 1500ms', async () => {
      const reads = Array.from({ length: 30 }, () => async () => {
        const res = await request(app.getHttpServer()).get('/users').set(auth);
        return res.status;
      });

      const writes = Array.from({ length: 10 }, () => async () => {
        const email = `mix-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
        const res = await request(app.getHttpServer()).post('/users').set(auth).send({ name: 'Mixed User', email });

        if (res.status === 201) {
          createdIds.push((res.body as { id: string }).id);
        }
        return res.status;
      });

      const allFns = [...reads, ...writes];

      const start = Date.now();
      const results = await Promise.allSettled(allFns.map((fn) => fn()));
      const durationMs = Date.now() - start;

      const latencies: number[] = [];
      let errors = 0;
      for (const r of results) {
        if (r.status === 'rejected' || (r.status === 'fulfilled' && r.value >= 500)) {
          errors++;
        } else {
          latencies.push(durationMs); // latência aproximada do lote
        }
      }

      console.log('[stress] Carga mista 30R+10W —', {
        total: allFns.length,
        errors,
        durationMs,
      });

      expect(errors).toBe(0);
      expect(durationMs).toBeLessThan(1500);
    });
  });
});
