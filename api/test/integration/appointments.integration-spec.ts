/**
 * Testes de Integração — Appointments
 *
 * Pipeline NestJS completo (guard → pipe → controller → service) com banco MOCKADO.
 */
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { INestApplication } from '@nestjs/common';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createIntegrationApp, makeAppointmentRepo } from './factory.js';

const API_KEY = 'test-api-key';
const AUTH = { 'x-api-key': API_KEY };
const SCHEDULED_AT = '2030-06-15T10:00:00.000Z';

function fakeAppointment(overrides = {}) {
  return {
    id: 'appt-uuid-1',
    title: 'Consulta',
    description: null,
    scheduledAt: new Date(SCHEDULED_AT),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

describe('Appointments — Integração (mock)', () => {
  let app: INestApplication;
  let appointmentRepo: ReturnType<typeof makeAppointmentRepo>;

  beforeAll(async () => {
    appointmentRepo = makeAppointmentRepo();
    app = await createIntegrationApp({ appointmentRepo });
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─── GET /appointments ───────────────────────────────────────────────────────

  describe('GET /appointments', () => {
    it('retorna lista de agendamentos', async () => {
      const items = [fakeAppointment(), fakeAppointment({ id: 'appt-uuid-2', title: 'Dentista' })];
      appointmentRepo.findAll.mockResolvedValue(items);

      const res = await request(app.getHttpServer()).get('/appointments').set(AUTH).expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Consulta');
    });

    it('retorna lista vazia', async () => {
      appointmentRepo.findAll.mockResolvedValue([]);

      const res = await request(app.getHttpServer()).get('/appointments').set(AUTH).expect(200);

      expect(res.body).toHaveLength(0);
    });

    it('retorna 401 sem API key', async () => {
      await request(app.getHttpServer()).get('/appointments').expect(401);
    });
  });

  // ─── GET /appointments/:id ───────────────────────────────────────────────────

  describe('GET /appointments/:id', () => {
    it('retorna agendamento por ID', async () => {
      appointmentRepo.findOne.mockResolvedValue(fakeAppointment());

      const res = await request(app.getHttpServer()).get('/appointments/appt-uuid-1').set(AUTH).expect(200);

      expect(res.body.id).toBe('appt-uuid-1');
      expect(res.body.title).toBe('Consulta');
      expect(res.body.scheduledAt).toBe(SCHEDULED_AT);
    });

    it('retorna 404 quando não existe', async () => {
      appointmentRepo.findOne.mockResolvedValue(null);

      await request(app.getHttpServer()).get('/appointments/nao-existe').set(AUTH).expect(404);
    });

    it('retorna 401 sem API key', async () => {
      await request(app.getHttpServer()).get('/appointments/appt-uuid-1').expect(401);
    });
  });

  // ─── POST /appointments ──────────────────────────────────────────────────────

  describe('POST /appointments', () => {
    it('cria agendamento sem descrição', async () => {
      appointmentRepo.create.mockResolvedValue(fakeAppointment());

      const res = await request(app.getHttpServer())
        .post('/appointments')
        .set(AUTH)
        .send({ title: 'Consulta', scheduledAt: SCHEDULED_AT })
        .expect(201);

      expect(res.body.id).toBe('appt-uuid-1');
      expect(res.body.description).toBeNull();
    });

    it('cria agendamento com descrição', async () => {
      appointmentRepo.create.mockResolvedValue(fakeAppointment({ description: 'Retorno semestral' }));

      const res = await request(app.getHttpServer())
        .post('/appointments')
        .set(AUTH)
        .send({ title: 'Dentista', scheduledAt: SCHEDULED_AT, description: 'Retorno semestral' })
        .expect(201);

      expect(res.body.description).toBe('Retorno semestral');
    });

    it('retorna 400 para payload sem title', async () => {
      await request(app.getHttpServer())
        .post('/appointments')
        .set(AUTH)
        .send({ scheduledAt: SCHEDULED_AT })
        .expect(400);
    });

    it('retorna 400 para payload sem scheduledAt', async () => {
      await request(app.getHttpServer()).post('/appointments').set(AUTH).send({ title: 'Reunião' }).expect(400);
    });

    it('retorna 400 para scheduledAt com formato inválido', async () => {
      await request(app.getHttpServer())
        .post('/appointments')
        .set(AUTH)
        .send({ title: 'Reunião', scheduledAt: 'data-invalida' })
        .expect(400);
    });

    it('retorna 401 sem API key', async () => {
      await request(app.getHttpServer())
        .post('/appointments')
        .send({ title: 'Teste', scheduledAt: SCHEDULED_AT })
        .expect(401);
    });
  });

  // ─── PUT /appointments/:id ───────────────────────────────────────────────────

  describe('PUT /appointments/:id', () => {
    it('atualiza título', async () => {
      appointmentRepo.update.mockResolvedValue(fakeAppointment({ title: 'Novo Título' }));

      const res = await request(app.getHttpServer())
        .put('/appointments/appt-uuid-1')
        .set(AUTH)
        .send({ title: 'Novo Título' })
        .expect(200);

      expect(res.body.title).toBe('Novo Título');
    });

    it('atualiza data e descrição', async () => {
      const newDate = '2031-01-01T08:00:00.000Z';
      appointmentRepo.update.mockResolvedValue(
        fakeAppointment({ scheduledAt: new Date(newDate), description: 'Nova desc' }),
      );

      const res = await request(app.getHttpServer())
        .put('/appointments/appt-uuid-1')
        .set(AUTH)
        .send({ scheduledAt: newDate, description: 'Nova desc' })
        .expect(200);

      expect(res.body.scheduledAt).toBe(newDate);
      expect(res.body.description).toBe('Nova desc');
    });

    it('retorna 404 quando não existe', async () => {
      appointmentRepo.update.mockResolvedValue(null);

      await request(app.getHttpServer()).put('/appointments/nao-existe').set(AUTH).send({ title: 'Teste' }).expect(404);
    });

    it('retorna 401 sem API key', async () => {
      await request(app.getHttpServer()).put('/appointments/appt-uuid-1').send({ title: 'X' }).expect(401);
    });
  });

  // ─── DELETE /appointments/:id ────────────────────────────────────────────────

  describe('DELETE /appointments/:id', () => {
    it('remove agendamento e retorna 204', async () => {
      appointmentRepo.findOne.mockResolvedValue(fakeAppointment());
      appointmentRepo.remove.mockResolvedValue(true);

      await request(app.getHttpServer()).delete('/appointments/appt-uuid-1').set(AUTH).expect(204);
    });

    it('retorna 404 quando não existe', async () => {
      appointmentRepo.findOne.mockResolvedValue(null);

      await request(app.getHttpServer()).delete('/appointments/nao-existe').set(AUTH).expect(404);
    });

    it('retorna 401 sem API key', async () => {
      await request(app.getHttpServer()).delete('/appointments/appt-uuid-1').expect(401);
    });
  });
});
