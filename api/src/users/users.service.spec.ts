/* eslint-disable @typescript-eslint/unbound-method */
import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@opentelemetry/api', () => ({
  metrics: {
    getMeter: () => ({
      createHistogram: () => ({ record: vi.fn() }),
      createCounter: () => ({ add: vi.fn() }),
    }),
  },
  trace: {
    getTracer: () => ({
      startActiveSpan: vi.fn((_name: string, fn: (span: object) => Promise<unknown>) =>
        fn({ setAttribute: vi.fn(), setStatus: vi.fn(), recordException: vi.fn(), end: vi.fn() }),
      ),
    }),
  },
  SpanStatusCode: { OK: 1, ERROR: 2 },
}));

import { CepService } from '../cep/cep.service.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { UserModel } from './user.model.js';
import { UsersRepository } from './users.repository.js';
import { UsersService } from './users.service.js';

function makeUser(overrides: Partial<UserModel> = {}): UserModel {
  return new UserModel(
    overrides.id ?? 'uuid-1',
    overrides.name ?? 'João Silva',
    overrides.email ?? 'joao@example.com',
    overrides.address ?? null,
    overrides.createdAt ?? new Date('2024-01-01'),
    overrides.updatedAt ?? new Date('2024-01-01'),
  );
}

const mockAddress = {
  cep: '01310100',
  logradouro: 'Avenida Paulista',
  bairro: 'Bela Vista',
  cidade: 'São Paulo',
  estado: 'SP',
};

function makeRepo(): UsersRepository {
  return {
    findPaginated: vi.fn(),
    findOne: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  } as unknown as UsersRepository;
}

function makeCepService(): CepService {
  return {
    lookup: vi.fn(),
  } as unknown as CepService;
}

describe('UsersService', () => {
  let service: UsersService;
  let repo: ReturnType<typeof makeRepo>;
  let cepService: ReturnType<typeof makeCepService>;

  beforeEach(() => {
    repo = makeRepo();
    cepService = makeCepService();
    service = new UsersService(repo, cepService);
  });

  describe('findAll', () => {
    it('deve retornar lista paginada de usuários', async () => {
      const users = [makeUser(), makeUser({ id: 'uuid-2', email: 'outro@example.com' })];
      vi.mocked(repo.findPaginated).mockResolvedValue([users, 2]);

      const pagination = PaginationQueryDto.fromQuery({ page: '1', limit: '10' });
      const result = await service.findAll(pagination);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(repo.findPaginated).toHaveBeenCalledWith(0, 10);
    });
  });

  describe('findOne', () => {
    it('deve retornar usuário quando encontrado', async () => {
      const user = makeUser();
      vi.mocked(repo.findOne).mockResolvedValue(user);

      const result = await service.findOne('uuid-1');

      expect(result).toBe(user);
    });

    it('deve lançar NotFoundException quando usuário não existe', async () => {
      vi.mocked(repo.findOne).mockResolvedValue(null);

      await expect(service.findOne('nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('deve criar usuário sem endereço', async () => {
      const user = makeUser();
      vi.mocked(repo.create).mockResolvedValue(user);

      const result = await service.create({ name: 'João Silva', email: 'joao@example.com' });

      expect(result).toBe(user);
      expect(cepService.lookup).not.toHaveBeenCalled();
      expect(repo.create).toHaveBeenCalledWith({ name: 'João Silva', email: 'joao@example.com' });
    });

    it('deve criar usuário com endereço via CEP', async () => {
      const user = makeUser({
        address: { ...mockAddress, numero: '42', complemento: null },
      });
      vi.mocked(cepService.lookup).mockResolvedValue(mockAddress);
      vi.mocked(repo.create).mockResolvedValue(user);

      const result = await service.create({
        name: 'João Silva',
        email: 'joao@example.com',
        cep: '01310-100',
        numero: '42',
      });

      expect(result).toBe(user);
      expect(cepService.lookup).toHaveBeenCalledWith('01310-100');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cep: '01310100',
          logradouro: 'Avenida Paulista',
          numero: '42',
          complemento: null,
        }),
      );
    });

    it('deve criar usuário com endereço incluindo complemento', async () => {
      vi.mocked(cepService.lookup).mockResolvedValue(mockAddress);
      vi.mocked(repo.create).mockResolvedValue(makeUser());

      await service.create({
        name: 'João Silva',
        email: 'joao@example.com',
        cep: '01310100',
        numero: '100',
        complemento: 'Apto 5',
      });

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ numero: '100', complemento: 'Apto 5' }));
    });

    it('deve propagar erro do CepService ao criar usuário', async () => {
      const { NotFoundException: NF } = await import('@nestjs/common');
      vi.mocked(cepService.lookup).mockRejectedValue(new NF('CEP 99999999 não encontrado'));

      await expect(service.create({ name: 'João Silva', email: 'joao@example.com', cep: '99999999' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar ConflictException quando e-mail já existe', async () => {
      vi.mocked(repo.create).mockRejectedValue({ code: '23505' });

      await expect(service.create({ name: 'João', email: 'joao@example.com' })).rejects.toThrow(ConflictException);
    });

    it('deve lançar UnprocessableEntityException para dados inválidos', async () => {
      await expect(service.create({ name: 'A', email: 'joao@example.com' })).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  describe('update', () => {
    it('deve atualizar usuário sem endereço', async () => {
      const updated = makeUser({ name: 'João Atualizado' });
      vi.mocked(repo.update).mockResolvedValue(updated);

      const result = await service.update('uuid-1', { name: 'João Atualizado' });

      expect(result).toBe(updated);
      expect(cepService.lookup).not.toHaveBeenCalled();
    });

    it('deve atualizar usuário com novo CEP', async () => {
      const updated = makeUser({ address: { ...mockAddress, numero: null, complemento: null } });
      vi.mocked(cepService.lookup).mockResolvedValue(mockAddress);
      vi.mocked(repo.update).mockResolvedValue(updated);

      await service.update('uuid-1', { cep: '01310-100' });

      expect(cepService.lookup).toHaveBeenCalledWith('01310-100');
      expect(repo.update).toHaveBeenCalledWith(
        'uuid-1',
        expect.objectContaining({ cep: '01310100', logradouro: 'Avenida Paulista' }),
      );
    });

    it('deve atualizar apenas numero/complemento sem novo CEP', async () => {
      vi.mocked(repo.update).mockResolvedValue(makeUser());

      await service.update('uuid-1', { numero: '200', complemento: 'Sala 3' });

      expect(cepService.lookup).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith('uuid-1', { numero: '200', complemento: 'Sala 3' });
    });

    it('deve lançar NotFoundException quando usuário não existe', async () => {
      vi.mocked(repo.update).mockResolvedValue(null);

      await expect(service.update('nao-existe', { name: 'Teste' })).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ConflictException para e-mail duplicado', async () => {
      vi.mocked(repo.update).mockRejectedValue({ code: '23505' });

      await expect(service.update('uuid-1', { email: 'outro@example.com' })).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('deve remover usuário com sucesso', async () => {
      vi.mocked(repo.findOne).mockResolvedValue(makeUser());
      vi.mocked(repo.remove).mockResolvedValue(true);

      await expect(service.remove('uuid-1')).resolves.toBeUndefined();
      expect(repo.remove).toHaveBeenCalledWith('uuid-1');
    });

    it('deve lançar NotFoundException quando usuário não existe', async () => {
      vi.mocked(repo.findOne).mockResolvedValue(null);

      await expect(service.remove('nao-existe')).rejects.toThrow(NotFoundException);
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('deve lançar UnprocessableEntityException para usuário com vínculos (FK 23503)', async () => {
      vi.mocked(repo.findOne).mockResolvedValue(makeUser());
      vi.mocked(repo.remove).mockRejectedValue({ code: '23503' });

      await expect(service.remove('uuid-1')).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
