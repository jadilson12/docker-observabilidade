import { describe, expect, it } from 'vitest';
import { PaginationQueryDto } from './pagination-query.dto.js';

describe('PaginationQueryDto', () => {
  describe('fromQuery', () => {
    it('deve usar valores padrão quando query está vazia', () => {
      const dto = PaginationQueryDto.fromQuery({});
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(10);
    });

    it('deve converter page e limit corretamente', () => {
      const dto = PaginationQueryDto.fromQuery({ page: '3', limit: '25' });
      expect(dto.page).toBe(3);
      expect(dto.limit).toBe(25);
    });

    it('deve garantir page mínimo de 1', () => {
      const dto = PaginationQueryDto.fromQuery({ page: '0' });
      expect(dto.page).toBe(1);
    });

    it('deve garantir limit máximo de 100', () => {
      const dto = PaginationQueryDto.fromQuery({ limit: '200' });
      expect(dto.limit).toBe(100);
    });

    it('deve usar o padrão 10 quando limit é 0 (valor inválido)', () => {
      // 0 é falsy: parseInt('0') || 10 resulta em 10 (fallback do padrão)
      const dto = PaginationQueryDto.fromQuery({ limit: '0' });
      expect(dto.limit).toBe(10);
    });

    it('deve garantir limit mínimo de 1 para valores positivos pequenos', () => {
      const dto = PaginationQueryDto.fromQuery({ limit: '1' });
      expect(dto.limit).toBe(1);
    });

    it('deve tratar valores não numéricos com fallback para padrão', () => {
      const dto = PaginationQueryDto.fromQuery({ page: 'abc', limit: 'xyz' });
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(10);
    });
  });

  describe('skip', () => {
    it('deve calcular skip corretamente', () => {
      const dto = PaginationQueryDto.fromQuery({ page: '3', limit: '10' });
      expect(dto.skip).toBe(20);
    });

    it('skip deve ser 0 na primeira página', () => {
      const dto = PaginationQueryDto.fromQuery({ page: '1', limit: '15' });
      expect(dto.skip).toBe(0);
    });
  });
});
