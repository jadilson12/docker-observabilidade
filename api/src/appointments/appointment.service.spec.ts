/* eslint-disable @typescript-eslint/unbound-method */
import { NotFoundException } from '@nestjs/common';
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

import { AppointmentModel } from './appointment.model.js';
import { AppointmentRepository } from './appointment.repository.js';
import { AppointmentService } from './appointment.service.js';

function makeAppointment(overrides: Partial<AppointmentModel> = {}): AppointmentModel {
  return new AppointmentModel(
    overrides.id ?? 'appt-uuid-1',
    overrides.title ?? 'Consulta médica',
    overrides.description ?? null,
    overrides.scheduledAt ?? new Date('2025-06-01T10:00:00Z'),
    overrides.createdAt ?? new Date('2024-01-01'),
    overrides.updatedAt ?? new Date('2024-01-01'),
  );
}

function makeRepo(): AppointmentRepository {
  return {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  } as unknown as AppointmentRepository;
}

describe('AppointmentService', () => {
  let service: AppointmentService;
  let repo: ReturnType<typeof makeRepo>;

  beforeEach(() => {
    repo = makeRepo();
    service = new AppointmentService(repo);
  });

  describe('findAll', () => {
    it('deve retornar lista de agendamentos', async () => {
      const items = [makeAppointment(), makeAppointment({ id: 'appt-uuid-2', title: 'Dentista' })];
      vi.mocked(repo.findAll).mockResolvedValue(items);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result).toBe(items);
    });

    it('deve retornar lista vazia quando não há agendamentos', async () => {
      vi.mocked(repo.findAll).mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('deve retornar agendamento quando encontrado', async () => {
      const item = makeAppointment();
      vi.mocked(repo.findOne).mockResolvedValue(item);

      const result = await service.findOne('appt-uuid-1');

      expect(result).toBe(item);
      expect(repo.findOne).toHaveBeenCalledWith('appt-uuid-1');
    });

    it('deve lançar NotFoundException quando agendamento não existe', async () => {
      vi.mocked(repo.findOne).mockResolvedValue(null);

      await expect(service.findOne('nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('deve criar e retornar novo agendamento', async () => {
      const item = makeAppointment();
      vi.mocked(repo.create).mockResolvedValue(item);

      const result = await service.create({
        title: 'Consulta médica',
        scheduledAt: '2025-06-01T10:00:00Z',
      });

      expect(result).toBe(item);
      expect(repo.create).toHaveBeenCalledWith({
        title: 'Consulta médica',
        description: null,
        scheduledAt: new Date('2025-06-01T10:00:00Z'),
      });
    });

    it('deve passar description quando fornecida', async () => {
      const item = makeAppointment({ description: 'Retorno' });
      vi.mocked(repo.create).mockResolvedValue(item);

      await service.create({
        title: 'Consulta médica',
        description: 'Retorno',
        scheduledAt: '2025-06-01T10:00:00Z',
      });

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ description: 'Retorno' }));
    });
  });

  describe('update', () => {
    it('deve atualizar e retornar agendamento', async () => {
      const updated = makeAppointment({ title: 'Consulta atualizada' });
      vi.mocked(repo.update).mockResolvedValue(updated);

      const result = await service.update('appt-uuid-1', { title: 'Consulta atualizada' });

      expect(result).toBe(updated);
    });

    it('deve lançar NotFoundException quando agendamento não existe', async () => {
      vi.mocked(repo.update).mockResolvedValue(null);

      await expect(service.update('nao-existe', { title: 'Teste' })).rejects.toThrow(NotFoundException);
    });

    it('deve converter scheduledAt para Date no patch', async () => {
      const updated = makeAppointment();
      vi.mocked(repo.update).mockResolvedValue(updated);

      await service.update('appt-uuid-1', { scheduledAt: '2025-12-31T08:00:00Z' });

      expect(repo.update).toHaveBeenCalledWith(
        'appt-uuid-1',
        expect.objectContaining({ scheduledAt: new Date('2025-12-31T08:00:00Z') }),
      );
    });

    it('deve ignorar campos undefined no patch', async () => {
      const updated = makeAppointment();
      vi.mocked(repo.update).mockResolvedValue(updated);

      await service.update('appt-uuid-1', { title: 'Novo título', description: undefined });

      expect(repo.update).toHaveBeenCalledWith('appt-uuid-1', { title: 'Novo título' });
    });
  });

  describe('remove', () => {
    it('deve remover agendamento com sucesso', async () => {
      const item = makeAppointment();
      vi.mocked(repo.findOne).mockResolvedValue(item);
      vi.mocked(repo.remove).mockResolvedValue(true);

      await expect(service.remove('appt-uuid-1')).resolves.toBeUndefined();
      expect(repo.remove).toHaveBeenCalledWith('appt-uuid-1');
    });

    it('deve lançar NotFoundException quando agendamento não existe', async () => {
      vi.mocked(repo.findOne).mockResolvedValue(null);

      await expect(service.remove('nao-existe')).rejects.toThrow(NotFoundException);
      expect(repo.remove).not.toHaveBeenCalled();
    });
  });
});
