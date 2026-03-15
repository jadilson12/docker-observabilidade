/**
 * Testes de Integração — Users
 *
 * Pipeline NestJS completo (guard → pipe → controller → service) com banco MOCKADO.
 * Permite testar cenários de erro precisos sem depender de banco real.
 */
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { INestApplication, NotFoundException } from '@nestjs/common';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createIntegrationApp, makeUsersRepo, makeCepMock } from './factory.js';

const API_KEY = 'test-api-key';
const AUTH = { 'x-api-key': API_KEY };

const NOW = new Date('2025-01-01T00:00:00Z');

function fakeUser(overrides = {}) {
  return {
    id: 'uuid-1',
    name: 'João Silva',
    email: 'joao@test.com',
    address: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function fakeAddress() {
  return {
    cep: '01310100',
    logradouro: 'Avenida Paulista',
    numero: '100',
    complemento: null,
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    estado: 'SP',
  };
}

describe('Users — Integração (mock)', () => {
  let app: INestApplication;
  let usersRepo: ReturnType<typeof makeUsersRepo>;
  let cepMock: ReturnType<typeof makeCepMock>;

  beforeAll(async () => {
    usersRepo = makeUsersRepo();
    cepMock = makeCepMock();
    app = await createIntegrationApp({ usersRepo, cepService: cepMock });
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─── GET /users ─────────────────────────────────────────────────────────────

  describe('GET /users', () => {
    it('retorna lista paginada com meta', async () => {
      const users = [fakeUser(), fakeUser({ id: 'uuid-2', email: 'b@test.com' })];
      usersRepo.findPaginated.mockResolvedValue([users, 2]);

      const res = await request(app.getHttpServer()).get('/users').set(AUTH).expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.total).toBe(2);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(10);
      expect(res.body.meta.hasNext).toBe(false);
      expect(usersRepo.findPaginated).toHaveBeenCalledWith(0, 10);
    });

    it('respeita parâmetros page e limit', async () => {
      usersRepo.findPaginated.mockResolvedValue([[], 50]);

      const res = await request(app.getHttpServer()).get('/users?page=3&limit=5').set(AUTH).expect(200);

      expect(res.body.meta.page).toBe(3);
      expect(res.body.meta.limit).toBe(5);
      expect(usersRepo.findPaginated).toHaveBeenCalledWith(10, 5);
    });

    it('retorna 401 sem API key', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);
    });
  });

  // ─── GET /users/:id ─────────────────────────────────────────────────────────

  describe('GET /users/:id', () => {
    it('retorna usuário encontrado', async () => {
      usersRepo.findOne.mockResolvedValue(fakeUser());

      const res = await request(app.getHttpServer()).get('/users/uuid-1').set(AUTH).expect(200);

      expect(res.body.id).toBe('uuid-1');
      expect(res.body.name).toBe('João Silva');
      expect(res.body.address).toBeNull();
    });

    it('inclui endereço quando presente', async () => {
      usersRepo.findOne.mockResolvedValue(fakeUser({ address: fakeAddress() }));

      const res = await request(app.getHttpServer()).get('/users/uuid-1').set(AUTH).expect(200);

      expect(res.body.address.cep).toBe('01310100');
      expect(res.body.address.cidade).toBe('São Paulo');
    });

    it('retorna 404 quando usuário não existe', async () => {
      usersRepo.findOne.mockResolvedValue(null);

      await request(app.getHttpServer()).get('/users/nao-existe').set(AUTH).expect(404);
    });

    it('retorna 401 sem API key', async () => {
      await request(app.getHttpServer()).get('/users/uuid-1').expect(401);
    });
  });

  // ─── POST /users ─────────────────────────────────────────────────────────────

  describe('POST /users', () => {
    it('cria usuário sem endereço', async () => {
      usersRepo.create.mockResolvedValue(fakeUser());

      const res = await request(app.getHttpServer())
        .post('/users')
        .set(AUTH)
        .send({ name: 'João Silva', email: 'joao@test.com' })
        .expect(201);

      expect(res.body.id).toBe('uuid-1');
      expect(res.body.address).toBeNull();
      expect(cepMock.lookup).not.toHaveBeenCalled();
    });

    it('cria usuário com endereço via CEP', async () => {
      cepMock.lookup.mockResolvedValue({
        cep: '01310100',
        logradouro: 'Avenida Paulista',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        estado: 'SP',
      });
      usersRepo.create.mockResolvedValue(fakeUser({ address: { ...fakeAddress() } }));

      const res = await request(app.getHttpServer())
        .post('/users')
        .set(AUTH)
        .send({ name: 'João Silva', email: 'joao@test.com', cep: '01310-100', numero: '100' })
        .expect(201);

      expect(cepMock.lookup).toHaveBeenCalledWith('01310-100');
      expect(res.body.address.cep).toBe('01310100');
    });

    it('retorna 502 quando CepService está indisponível', async () => {
      const { BadGatewayException } = await import('@nestjs/common');
      cepMock.lookup.mockRejectedValue(new BadGatewayException('ViaCEP indisponível'));

      await request(app.getHttpServer())
        .post('/users')
        .set(AUTH)
        .send({ name: 'João Silva', email: 'joao@test.com', cep: '01310-100' })
        .expect(502);
    });

    it('retorna 404 quando CEP não encontrado', async () => {
      cepMock.lookup.mockRejectedValue(new NotFoundException('CEP não encontrado'));

      await request(app.getHttpServer())
        .post('/users')
        .set(AUTH)
        .send({ name: 'João Silva', email: 'joao@test.com', cep: '99999999' })
        .expect(404);
    });

    it('retorna 409 quando e-mail já existe (código PG 23505)', async () => {
      usersRepo.create.mockRejectedValue({ code: '23505' });

      await request(app.getHttpServer())
        .post('/users')
        .set(AUTH)
        .send({ name: 'João Silva', email: 'joao@test.com' })
        .expect(409);
    });

    it('retorna 400 para nome ausente', async () => {
      await request(app.getHttpServer()).post('/users').set(AUTH).send({ email: 'joao@test.com' }).expect(400);
    });

    it('retorna 400 para nome muito curto', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set(AUTH)
        .send({ name: 'J', email: 'joao@test.com' })
        .expect(400);
    });

    it('retorna 400 para e-mail inválido', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set(AUTH)
        .send({ name: 'João Silva', email: 'nao-e-email' })
        .expect(400);
    });

    it('retorna 400 para CEP com formato inválido', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set(AUTH)
        .send({ name: 'João Silva', email: 'joao@test.com', cep: '123' })
        .expect(400);
    });

    it('retorna 401 sem API key', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'João Silva', email: 'joao@test.com' })
        .expect(401);
    });
  });

  // ─── PUT /users/:id ──────────────────────────────────────────────────────────

  describe('PUT /users/:id', () => {
    it('atualiza nome do usuário', async () => {
      usersRepo.update.mockResolvedValue(fakeUser({ name: 'Novo Nome' }));

      const res = await request(app.getHttpServer())
        .put('/users/uuid-1')
        .set(AUTH)
        .send({ name: 'Novo Nome' })
        .expect(200);

      expect(res.body.name).toBe('Novo Nome');
    });

    it('adiciona endereço via CEP', async () => {
      cepMock.lookup.mockResolvedValue({
        cep: '01310100',
        logradouro: 'Av. Paulista',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        estado: 'SP',
      });
      usersRepo.update.mockResolvedValue(fakeUser({ address: fakeAddress() }));

      const res = await request(app.getHttpServer())
        .put('/users/uuid-1')
        .set(AUTH)
        .send({ cep: '01310-100', numero: '200' })
        .expect(200);

      expect(res.body.address.cep).toBe('01310100');
      expect(cepMock.lookup).toHaveBeenCalled();
    });

    it('retorna 404 quando usuário não existe', async () => {
      usersRepo.update.mockResolvedValue(null);

      await request(app.getHttpServer()).put('/users/uuid-inexistente').set(AUTH).send({ name: 'Teste' }).expect(404);
    });

    it('retorna 409 quando e-mail já está em uso (código PG 23505)', async () => {
      usersRepo.update.mockRejectedValue({ code: '23505' });

      await request(app.getHttpServer()).put('/users/uuid-1').set(AUTH).send({ email: 'outro@test.com' }).expect(409);
    });

    it('retorna 400 para CEP com formato inválido', async () => {
      await request(app.getHttpServer()).put('/users/uuid-1').set(AUTH).send({ cep: 'invalido' }).expect(400);
    });

    it('retorna 401 sem API key', async () => {
      await request(app.getHttpServer()).put('/users/uuid-1').send({ name: 'X' }).expect(401);
    });
  });

  // ─── DELETE /users/:id ───────────────────────────────────────────────────────

  describe('DELETE /users/:id', () => {
    it('remove usuário e retorna 204', async () => {
      usersRepo.findOne.mockResolvedValue(fakeUser());
      usersRepo.remove.mockResolvedValue(true);

      await request(app.getHttpServer()).delete('/users/uuid-1').set(AUTH).expect(204);
    });

    it('retorna 404 quando usuário não existe', async () => {
      usersRepo.findOne.mockResolvedValue(null);

      await request(app.getHttpServer()).delete('/users/nao-existe').set(AUTH).expect(404);
    });

    it('retorna 422 quando usuário tem vínculos (código PG 23503)', async () => {
      usersRepo.findOne.mockResolvedValue(fakeUser());
      usersRepo.remove.mockRejectedValue({ code: '23503' });

      await request(app.getHttpServer()).delete('/users/uuid-1').set(AUTH).expect(422);
    });

    it('retorna 401 sem API key', async () => {
      await request(app.getHttpServer()).delete('/users/uuid-1').expect(401);
    });
  });
});
