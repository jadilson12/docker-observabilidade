/**
 * Testes de Stress — Appointments
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
import { shutdownTelemetry } from '../../src/telemetry.js';
import { API_KEY, createApp } from '../helpers.js';
import { measureConcurrent } from './helpers.js';

describe('Appointments — Stress', () => {
  let app: INestApplication<App>;
  const auth = { 'x-api-key': API_KEY };
  const createdIds: string[] = [];

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    // Limpa todos os agendamentos criados durante o stress
    await Promise.allSettled(
      createdIds.map((id) => request(app.getHttpServer()).delete(`/appointments/${id}`).set(auth)),
    );
    await app.close();
    await shutdownTelemetry();
  });

  function futureDate(offsetDays = 1): string {
    return new Date(Date.now() + offsetDays * 86_400_000).toISOString();
  }

  // ─── Leitura concorrente ──────────────────────────────────────────────────

  describe('GET /appointments — leitura concorrente', () => {
    it('50 leituras simultâneas: p95 < 500ms, 0 erros', async () => {
      const result = await measureConcurrent(50, async () => {
        const res = await request(app.getHttpServer()).get('/appointments').set(auth);
        return res.status;
      });

      console.log('[stress] GET /appointments x50 —', {
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
        const res = await request(app.getHttpServer()).get('/appointments').set(auth);
        return res.status;
      });

      console.log('[stress] GET /appointments x100 —', {
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

  describe('POST /appointments — escrita concorrente', () => {
    it('20 criações simultâneas: p95 < 1000ms, 0 erros', async () => {
      const result = await measureConcurrent(20, async () => {
        const res = await request(app.getHttpServer())
          .post('/appointments')
          .set(auth)
          .send({
            title: `Stress-${Math.random().toString(36).slice(2)}`,
            scheduledAt: futureDate(Math.ceil(Math.random() * 30)),
          });

        if (res.status === 201) {
          createdIds.push((res.body as { id: string }).id);
        }
        return res.status;
      });

      console.log('[stress] POST /appointments x20 —', {
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

  // ─── Carga mista (leitura + escrita + deleção) ───────────────────────────

  describe('Carga mista — GET, POST e DELETE intercalados', () => {
    it('30 leituras + 10 escritas + 5 deleções simultâneas: p99 < 1500ms', async () => {
      // Cria 5 agendamentos antecipadamente para deletar durante o stress
      const toDelete: string[] = [];
      for (let i = 0; i < 5; i++) {
        const res = await request(app.getHttpServer())
          .post('/appointments')
          .set(auth)
          .send({ title: `ToDelete-${i}`, scheduledAt: futureDate(i + 1) })
          .expect(201);
        toDelete.push((res.body as { id: string }).id);
      }

      const reads = Array.from({ length: 30 }, () => async () => {
        const res = await request(app.getHttpServer()).get('/appointments').set(auth);
        return res.status;
      });

      const writes = Array.from({ length: 10 }, () => async () => {
        const res = await request(app.getHttpServer())
          .post('/appointments')
          .set(auth)
          .send({
            title: `MixWrite-${Math.random().toString(36).slice(2)}`,
            scheduledAt: futureDate(Math.ceil(Math.random() * 60) + 30),
          });
        if (res.status === 201) {
          createdIds.push((res.body as { id: string }).id);
        }
        return res.status;
      });

      const deletes = toDelete.map((id) => async () => {
        const res = await request(app.getHttpServer()).delete(`/appointments/${id}`).set(auth);
        return res.status;
      });

      const allFns = [...reads, ...writes, ...deletes];

      const start = Date.now();
      const results = await Promise.allSettled(allFns.map((fn) => fn()));
      const durationMs = Date.now() - start;

      let errors = 0;
      for (const r of results) {
        if (r.status === 'rejected' || (r.status === 'fulfilled' && r.value >= 500)) {
          errors++;
        }
      }

      console.log('[stress] Carga mista 30R+10W+5D —', {
        total: allFns.length,
        errors,
        durationMs,
      });

      expect(errors).toBe(0);
      expect(durationMs).toBeLessThan(1500);
    });
  });
});
