import { UnprocessableEntityException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { validateUserOrThrow } from './user.validator.js';

describe('validateUserOrThrow', () => {
  it('não deve lançar erro com dados válidos', () => {
    expect(() => validateUserOrThrow({ name: 'João Silva', email: 'joao@example.com' })).not.toThrow();
  });

  it('não deve lançar erro quando campos são omitidos (update parcial)', () => {
    expect(() => validateUserOrThrow({})).not.toThrow();
    expect(() => validateUserOrThrow({ name: 'Maria' })).not.toThrow();
    expect(() => validateUserOrThrow({ email: 'maria@example.com' })).not.toThrow();
  });

  describe('validação de nome', () => {
    it('deve rejeitar nome vazio', () => {
      expect(() => validateUserOrThrow({ name: '' })).toThrow(UnprocessableEntityException);
      expect(() => validateUserOrThrow({ name: '   ' })).toThrow(UnprocessableEntityException);
    });

    it('deve rejeitar nome com menos de 2 caracteres', () => {
      expect(() => validateUserOrThrow({ name: 'A' })).toThrow(UnprocessableEntityException);
    });

    it('deve rejeitar nome com mais de 100 caracteres', () => {
      expect(() => validateUserOrThrow({ name: 'A'.repeat(101) })).toThrow(UnprocessableEntityException);
    });

    it('deve aceitar nome com exatamente 2 caracteres', () => {
      expect(() => validateUserOrThrow({ name: 'Jo' })).not.toThrow();
    });

    it('deve aceitar nome com exatamente 100 caracteres', () => {
      expect(() => validateUserOrThrow({ name: 'A'.repeat(100) })).not.toThrow();
    });
  });

  describe('validação de e-mail', () => {
    it('deve rejeitar e-mail vazio', () => {
      expect(() => validateUserOrThrow({ email: '' })).toThrow(UnprocessableEntityException);
      expect(() => validateUserOrThrow({ email: '   ' })).toThrow(UnprocessableEntityException);
    });

    it('deve rejeitar e-mail inválido', () => {
      expect(() => validateUserOrThrow({ email: 'nao-e-email' })).toThrow(UnprocessableEntityException);
    });

    it('deve aceitar e-mail válido', () => {
      expect(() => validateUserOrThrow({ email: 'user@domain.com' })).not.toThrow();
    });
  });

  it('deve acumular múltiplos erros de validação', () => {
    try {
      validateUserOrThrow({ name: 'A', email: 'invalido' });
      expect.fail('deveria ter lançado exceção');
    } catch (err) {
      expect(err).toBeInstanceOf(UnprocessableEntityException);
      const response = (err as UnprocessableEntityException).getResponse() as { message: unknown[] };
      expect(response.message).toHaveLength(2);
    }
  });
});
