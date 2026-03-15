import { describe, expect, it } from 'vitest';
import { Email } from './email.vo.js';

describe('Email', () => {
  describe('isValid', () => {
    it('deve aceitar e-mails válidos', () => {
      expect(Email.isValid('user@example.com')).toBe(true);
      expect(Email.isValid('nome.sobrenome@dominio.com.br')).toBe(true);
      expect(Email.isValid('user+tag@sub.domain.org')).toBe(true);
    });

    it('deve rejeitar e-mails sem @', () => {
      expect(Email.isValid('userexample.com')).toBe(false);
    });

    it('deve rejeitar e-mails sem domínio', () => {
      expect(Email.isValid('user@')).toBe(false);
    });

    it('deve rejeitar e-mails sem TLD', () => {
      expect(Email.isValid('user@domain')).toBe(false);
    });

    it('deve rejeitar string vazia', () => {
      expect(Email.isValid('')).toBe(false);
    });

    it('deve ignorar espaços nas bordas antes de validar', () => {
      expect(Email.isValid('  user@example.com  ')).toBe(true);
    });

    it('deve rejeitar e-mail com espaço interno', () => {
      expect(Email.isValid('us er@example.com')).toBe(false);
    });
  });
});
