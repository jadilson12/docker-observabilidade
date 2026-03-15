import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { App } from 'supertest/types';
import { CepService } from '../../src/cep/cep.service.js';
import { shutdownTelemetry } from '../../src/telemetry.js';
import { API_KEY, createApp } from '../helpers.js';

interface AddressData {
  cep: string;
  logradouro: string;
  numero: string | null;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
}

interface UserResponse {
  id: string;
  name: string;
  email: string;
  address: AddressData | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResponse {
  data: UserResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const mockCep = vi.fn();

const fakeCepResult = {
  cep: '01310100',
  logradouro: 'Avenida Paulista',
  bairro: 'Bela Vista',
  cidade: 'São Paulo',
  estado: 'SP',
};

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  const auth = { 'x-api-key': API_KEY };

  beforeAll(async () => {
    app = await createApp((builder) => builder.overrideProvider(CepService).useValue({ lookup: mockCep }));
  });

  afterAll(async () => {
    await app.close();
    await shutdownTelemetry();
  });

  // ─── helpers ───────────────────────────────────────────────────────────────

  function post(path: string, body: object) {
    return request(app.getHttpServer()).post(path).set(auth).send(body);
  }

  async function createUser(
    name = 'Test User',
    email = `u-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
  ) {
    const res = await post('/users', { name, email }).expect(201);
    return res.body as UserResponse;
  }

  async function deleteUser(id: string) {
    await request(app.getHttpServer()).delete(`/users/${id}`).set(auth);
  }

  // ─── POST /users ────────────────────────────────────────────────────────────

  describe('POST /users', () => {
    it('cria usuário sem endereço', async () => {
      const email = `joao-${Date.now()}@test.com`;
      const res = await post('/users', { name: 'João Silva', email }).expect(201);

      const body = res.body as UserResponse;
      expect(body.id).toBeDefined();
      expect(body.name).toBe('João Silva');
      expect(body.email).toBe(email);
      expect(body.address).toBeNull();
      expect(body.createdAt).toBeDefined();

      await deleteUser(body.id);
    });

    it('cria usuário com endereço via CEP', async () => {
      mockCep.mockResolvedValue(fakeCepResult);

      const email = `maria-${Date.now()}@test.com`;
      const res = await post('/users', {
        name: 'Maria Costa',
        email,
        cep: '01310-100',
        numero: '100',
        complemento: 'Apto 5',
      }).expect(201);

      const body = res.body as UserResponse;
      expect(body.address).not.toBeNull();
      expect(body.address?.cep).toBe('01310100');
      expect(body.address?.logradouro).toBe('Avenida Paulista');
      expect(body.address?.bairro).toBe('Bela Vista');
      expect(body.address?.cidade).toBe('São Paulo');
      expect(body.address?.estado).toBe('SP');
      expect(body.address?.numero).toBe('100');
      expect(body.address?.complemento).toBe('Apto 5');
      expect(mockCep).toHaveBeenCalledWith('01310-100');

      await deleteUser(body.id);
    });

    it('cria usuário com CEP sem numero nem complemento', async () => {
      mockCep.mockResolvedValue(fakeCepResult);

      const res = await post('/users', {
        name: 'Pedro Lima',
        email: `pedro-${Date.now()}@test.com`,
        cep: '01310100',
      }).expect(201);

      const body = res.body as UserResponse;
      expect(body.address?.numero).toBeNull();
      expect(body.address?.complemento).toBeNull();

      await deleteUser(body.id);
    });

    it('retorna 409 quando e-mail já está em uso', async () => {
      const user = await createUser();
      await post('/users', { name: 'Outro', email: user.email }).expect(409);
      await deleteUser(user.id);
    });

    it('retorna 400 para nome vazio', async () => {
      await post('/users', { name: '', email: 'x@test.com' }).expect(400);
    });

    it('retorna 400 para e-mail inválido', async () => {
      await post('/users', { name: 'Teste', email: 'nao-e-email' }).expect(400);
    });

    it('retorna 400 para CEP com formato inválido', async () => {
      await post('/users', { name: 'Teste', email: `t-${Date.now()}@test.com`, cep: '123' }).expect(400);
    });

    it('retorna 401 sem API key', async () => {
      await request(app.getHttpServer()).post('/users').send({ name: 'Teste', email: 'x@test.com' }).expect(401);
    });
  });

  // ─── GET /users ──────────────────────────────────────────────────────────────

  describe('GET /users', () => {
    it('retorna lista paginada', async () => {
      const user = await createUser('Paginacao Teste');

      const res = await request(app.getHttpServer()).get('/users').set(auth).expect(200);

      const body = res.body as PaginatedResponse;
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta.total).toBeGreaterThanOrEqual(1);
      expect(body.meta.page).toBe(1);
      expect(body.meta.limit).toBe(10);
      expect(body.data.find((u) => u.id === user.id)).toBeDefined();

      await deleteUser(user.id);
    });

    it('respeita parâmetros de paginação', async () => {
      const users = await Promise.all([createUser(), createUser(), createUser()]);

      const res = await request(app.getHttpServer()).get('/users?page=1&limit=2').set(auth).expect(200);

      const body = res.body as PaginatedResponse;
      expect(body.data.length).toBeLessThanOrEqual(2);
      expect(body.meta.limit).toBe(2);

      await Promise.all(users.map((u) => deleteUser(u.id)));
    });

    it('retorna 401 sem API key', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);
    });
  });

  // ─── GET /users/:id ──────────────────────────────────────────────────────────

  describe('GET /users/:id', () => {
    it('retorna usuário por ID', async () => {
      const user = await createUser();

      const res = await request(app.getHttpServer()).get(`/users/${user.id}`).set(auth).expect(200);

      const body = res.body as UserResponse;
      expect(body.id).toBe(user.id);
      expect(body.email).toBe(user.email);

      await deleteUser(user.id);
    });

    it('retorna usuário com endereço', async () => {
      mockCep.mockResolvedValue(fakeCepResult);
      const created = await post('/users', {
        name: 'Com Endereço',
        email: `end-${Date.now()}@test.com`,
        cep: '01310-100',
        numero: '50',
      }).then((r) => r.body as UserResponse);

      const res = await request(app.getHttpServer()).get(`/users/${created.id}`).set(auth).expect(200);

      expect((res.body as UserResponse).address?.cep).toBe('01310100');
      expect((res.body as UserResponse).address?.numero).toBe('50');

      await deleteUser(created.id);
    });

    it('retorna 404 para ID inexistente', async () => {
      await request(app.getHttpServer()).get('/users/00000000-0000-0000-0000-000000000000').set(auth).expect(404);
    });

    it('retorna 401 sem API key', async () => {
      const user = await createUser();
      await request(app.getHttpServer()).get(`/users/${user.id}`).expect(401);
      await deleteUser(user.id);
    });
  });

  // ─── PUT /users/:id ──────────────────────────────────────────────────────────

  describe('PUT /users/:id', () => {
    it('atualiza nome do usuário', async () => {
      const user = await createUser();

      const res = await request(app.getHttpServer())
        .put(`/users/${user.id}`)
        .set(auth)
        .send({ name: 'Nome Atualizado' })
        .expect(200);

      expect((res.body as UserResponse).name).toBe('Nome Atualizado');
      expect((res.body as UserResponse).email).toBe(user.email);

      await deleteUser(user.id);
    });

    it('atualiza e-mail do usuário', async () => {
      const user = await createUser();
      const novoEmail = `novo-${Date.now()}@test.com`;

      const res = await request(app.getHttpServer())
        .put(`/users/${user.id}`)
        .set(auth)
        .send({ email: novoEmail })
        .expect(200);

      expect((res.body as UserResponse).email).toBe(novoEmail);

      await deleteUser(user.id);
    });

    it('adiciona endereço via CEP em usuário existente', async () => {
      mockCep.mockResolvedValue(fakeCepResult);
      const user = await createUser();

      const res = await request(app.getHttpServer())
        .put(`/users/${user.id}`)
        .set(auth)
        .send({ cep: '01310-100', numero: '200', complemento: 'Sala 3' })
        .expect(200);

      const body = res.body as UserResponse;
      expect(body.address?.cep).toBe('01310100');
      expect(body.address?.numero).toBe('200');
      expect(body.address?.complemento).toBe('Sala 3');

      await deleteUser(user.id);
    });

    it('atualiza apenas numero sem novo CEP', async () => {
      mockCep.mockResolvedValue(fakeCepResult);
      const user = await post('/users', {
        name: 'Com End',
        email: `end2-${Date.now()}@test.com`,
        cep: '01310-100',
        numero: '10',
      }).then((r) => r.body as UserResponse);

      const res = await request(app.getHttpServer())
        .put(`/users/${user.id}`)
        .set(auth)
        .send({ numero: '99' })
        .expect(200);

      expect((res.body as UserResponse).address?.numero).toBe('99');
      expect((res.body as UserResponse).address?.cep).toBe('01310100');

      await deleteUser(user.id);
    });

    it('retorna 409 ao tentar usar e-mail já cadastrado', async () => {
      const user1 = await createUser('User1', `u1-${Date.now()}@test.com`);
      const user2 = await createUser('User2', `u2-${Date.now()}@test.com`);

      await request(app.getHttpServer()).put(`/users/${user2.id}`).set(auth).send({ email: user1.email }).expect(409);

      await deleteUser(user1.id);
      await deleteUser(user2.id);
    });

    it('retorna 404 para ID inexistente', async () => {
      await request(app.getHttpServer())
        .put('/users/00000000-0000-0000-0000-000000000000')
        .set(auth)
        .send({ name: 'Teste' })
        .expect(404);
    });

    it('retorna 401 sem API key', async () => {
      const user = await createUser();
      await request(app.getHttpServer()).put(`/users/${user.id}`).send({ name: 'Teste' }).expect(401);
      await deleteUser(user.id);
    });
  });

  // ─── DELETE /users/:id ───────────────────────────────────────────────────────

  describe('DELETE /users/:id', () => {
    it('remove usuário e retorna 204', async () => {
      const user = await createUser();
      await request(app.getHttpServer()).delete(`/users/${user.id}`).set(auth).expect(204);
    });

    it('retorna 404 após remoção', async () => {
      const user = await createUser();
      await deleteUser(user.id);
      await request(app.getHttpServer()).get(`/users/${user.id}`).set(auth).expect(404);
    });

    it('retorna 404 para ID inexistente', async () => {
      await request(app.getHttpServer()).delete('/users/00000000-0000-0000-0000-000000000000').set(auth).expect(404);
    });

    it('retorna 401 sem API key', async () => {
      const user = await createUser();
      await request(app.getHttpServer()).delete(`/users/${user.id}`).expect(401);
      await deleteUser(user.id);
    });
  });
});
