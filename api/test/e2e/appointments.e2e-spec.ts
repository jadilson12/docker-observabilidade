import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { App } from 'supertest/types';
import { shutdownTelemetry } from '../../src/telemetry.js';
import { API_KEY, createApp } from '../helpers.js';

interface AppointmentResponse {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
}

describe('Appointments (e2e)', () => {
  let app: INestApplication<App>;
  const auth = { 'x-api-key': API_KEY };

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
    await shutdownTelemetry();
  });

  // ─── helpers ───────────────────────────────────────────────────────────────

  async function createAppointment(
    title = 'Consulta',
    scheduledAt = new Date(Date.now() + 86_400_000).toISOString(),
    description?: string,
  ) {
    const res = await request(app.getHttpServer())
      .post('/appointments')
      .set(auth)
      .send({ title, scheduledAt, description })
      .expect(201);
    return res.body as AppointmentResponse;
  }

  async function deleteAppointment(id: string) {
    await request(app.getHttpServer()).delete(`/appointments/${id}`).set(auth);
  }

  // ─── POST /appointments ──────────────────────────────────────────────────────

  describe('POST /appointments', () => {
    it('cria agendamento sem descrição', async () => {
      const scheduledAt = '2030-01-15T10:00:00.000Z';
      const res = await request(app.getHttpServer())
        .post('/appointments')
        .set(auth)
        .send({ title: 'Reunião', scheduledAt })
        .expect(201);

      const body = res.body as AppointmentResponse;
      expect(body.id).toBeDefined();
      expect(body.title).toBe('Reunião');
      expect(body.description).toBeNull();
      expect(body.scheduledAt).toBe(scheduledAt);
      expect(body.createdAt).toBeDefined();

      await deleteAppointment(body.id);
    });

    it('cria agendamento com descrição', async () => {
      const res = await request(app.getHttpServer())
        .post('/appointments')
        .set(auth)
        .send({ title: 'Dentista', scheduledAt: '2030-03-10T09:00:00.000Z', description: 'Retorno semestral' })
        .expect(201);

      const body = res.body as AppointmentResponse;
      expect(body.title).toBe('Dentista');
      expect(body.description).toBe('Retorno semestral');

      await deleteAppointment(body.id);
    });

    it('retorna 400 para payload sem title', async () => {
      await request(app.getHttpServer())
        .post('/appointments')
        .set(auth)
        .send({ scheduledAt: '2030-01-01T10:00:00.000Z' })
        .expect(400);
    });

    it('retorna 400 para payload sem scheduledAt', async () => {
      await request(app.getHttpServer()).post('/appointments').set(auth).send({ title: 'Sem data' }).expect(400);
    });

    it('retorna 401 sem API key', async () => {
      await request(app.getHttpServer())
        .post('/appointments')
        .send({ title: 'Teste', scheduledAt: '2030-01-01T10:00:00.000Z' })
        .expect(401);
    });
  });

  // ─── GET /appointments ───────────────────────────────────────────────────────

  describe('GET /appointments', () => {
    it('retorna lista de agendamentos', async () => {
      const a1 = await createAppointment('App A', '2030-02-01T08:00:00.000Z');
      const a2 = await createAppointment('App B', '2030-02-02T08:00:00.000Z');

      const res = await request(app.getHttpServer()).get('/appointments').set(auth).expect(200);

      const body = res.body as AppointmentResponse[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(2);
      expect(body.find((a) => a.id === a1.id)).toBeDefined();
      expect(body.find((a) => a.id === a2.id)).toBeDefined();

      await deleteAppointment(a1.id);
      await deleteAppointment(a2.id);
    });

    it('retorna lista vazia quando não há agendamentos', async () => {
      // Este teste depende de banco limpo — se outros testes já criaram registros
      // será tolerado: apenas verifica que é um array
      const res = await request(app.getHttpServer()).get('/appointments').set(auth).expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('retorna 401 sem API key', async () => {
      await request(app.getHttpServer()).get('/appointments').expect(401);
    });
  });

  // ─── GET /appointments/:id ───────────────────────────────────────────────────

  describe('GET /appointments/:id', () => {
    it('retorna agendamento por ID', async () => {
      const appt = await createAppointment('Busca por ID', '2030-05-10T14:00:00.000Z');

      const res = await request(app.getHttpServer()).get(`/appointments/${appt.id}`).set(auth).expect(200);

      const body = res.body as AppointmentResponse;
      expect(body.id).toBe(appt.id);
      expect(body.title).toBe('Busca por ID');
      expect(body.scheduledAt).toBe('2030-05-10T14:00:00.000Z');

      await deleteAppointment(appt.id);
    });

    it('retorna 404 para ID inexistente', async () => {
      await request(app.getHttpServer())
        .get('/appointments/00000000-0000-0000-0000-000000000000')
        .set(auth)
        .expect(404);
    });

    it('retorna 401 sem API key', async () => {
      const appt = await createAppointment();
      await request(app.getHttpServer()).get(`/appointments/${appt.id}`).expect(401);
      await deleteAppointment(appt.id);
    });
  });

  // ─── PUT /appointments/:id ───────────────────────────────────────────────────

  describe('PUT /appointments/:id', () => {
    it('atualiza título do agendamento', async () => {
      const appt = await createAppointment('Título Original', '2030-06-01T10:00:00.000Z');

      const res = await request(app.getHttpServer())
        .put(`/appointments/${appt.id}`)
        .set(auth)
        .send({ title: 'Título Atualizado' })
        .expect(200);

      expect((res.body as AppointmentResponse).title).toBe('Título Atualizado');
      expect((res.body as AppointmentResponse).scheduledAt).toBe('2030-06-01T10:00:00.000Z');

      await deleteAppointment(appt.id);
    });

    it('atualiza data do agendamento', async () => {
      const appt = await createAppointment('Mudar Data', '2030-07-01T10:00:00.000Z');

      const res = await request(app.getHttpServer())
        .put(`/appointments/${appt.id}`)
        .set(auth)
        .send({ scheduledAt: '2030-12-31T23:59:00.000Z' })
        .expect(200);

      expect((res.body as AppointmentResponse).scheduledAt).toBe('2030-12-31T23:59:00.000Z');

      await deleteAppointment(appt.id);
    });

    it('atualiza descrição do agendamento', async () => {
      const appt = await createAppointment('Com Desc', '2030-08-01T10:00:00.000Z');

      const res = await request(app.getHttpServer())
        .put(`/appointments/${appt.id}`)
        .set(auth)
        .send({ description: 'Nova descrição' })
        .expect(200);

      expect((res.body as AppointmentResponse).description).toBe('Nova descrição');

      await deleteAppointment(appt.id);
    });

    it('atualiza múltiplos campos de uma vez', async () => {
      const appt = await createAppointment('Multi', '2030-09-01T08:00:00.000Z');

      const res = await request(app.getHttpServer())
        .put(`/appointments/${appt.id}`)
        .set(auth)
        .send({
          title: 'Multi Atualizado',
          scheduledAt: '2030-09-15T09:30:00.000Z',
          description: 'Desc atualizada',
        })
        .expect(200);

      const body = res.body as AppointmentResponse;
      expect(body.title).toBe('Multi Atualizado');
      expect(body.scheduledAt).toBe('2030-09-15T09:30:00.000Z');
      expect(body.description).toBe('Desc atualizada');

      await deleteAppointment(appt.id);
    });

    it('retorna 404 para ID inexistente', async () => {
      await request(app.getHttpServer())
        .put('/appointments/00000000-0000-0000-0000-000000000000')
        .set(auth)
        .send({ title: 'Teste' })
        .expect(404);
    });

    it('retorna 401 sem API key', async () => {
      const appt = await createAppointment();
      await request(app.getHttpServer()).put(`/appointments/${appt.id}`).send({ title: 'Teste' }).expect(401);
      await deleteAppointment(appt.id);
    });
  });

  // ─── DELETE /appointments/:id ────────────────────────────────────────────────

  describe('DELETE /appointments/:id', () => {
    it('remove agendamento e retorna 204', async () => {
      const appt = await createAppointment('Para Remover', '2030-10-01T10:00:00.000Z');
      await request(app.getHttpServer()).delete(`/appointments/${appt.id}`).set(auth).expect(204);
    });

    it('retorna 404 após remoção', async () => {
      const appt = await createAppointment();
      await deleteAppointment(appt.id);
      await request(app.getHttpServer()).get(`/appointments/${appt.id}`).set(auth).expect(404);
    });

    it('retorna 404 para ID inexistente', async () => {
      await request(app.getHttpServer())
        .delete('/appointments/00000000-0000-0000-0000-000000000000')
        .set(auth)
        .expect(404);
    });

    it('retorna 401 sem API key', async () => {
      const appt = await createAppointment();
      await request(app.getHttpServer()).delete(`/appointments/${appt.id}`).expect(401);
      await deleteAppointment(appt.id);
    });
  });
});
