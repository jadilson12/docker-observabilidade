import { BadGatewayException, BadRequestException, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CepService } from './cep.service.js';

function mockFetch(response: object, ok = true) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok,
    json: () => Promise.resolve(response),
  } as Response);
}

describe('CepService', () => {
  let service: CepService;

  beforeEach(() => {
    service = new CepService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('lookup', () => {
    it('deve retornar endereço para CEP válido (com traço)', async () => {
      mockFetch({
        cep: '01310-100',
        logradouro: 'Avenida Paulista',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
      });

      const result = await service.lookup('01310-100');

      expect(result).toEqual({
        cep: '01310100',
        logradouro: 'Avenida Paulista',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        estado: 'SP',
      });
    });

    it('deve retornar endereço para CEP válido (sem traço)', async () => {
      mockFetch({
        logradouro: 'Avenida Paulista',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
      });

      const result = await service.lookup('01310100');

      expect(result.cep).toBe('01310100');
      expect(result.cidade).toBe('São Paulo');
    });

    it('deve lançar BadRequestException para CEP com menos de 8 dígitos', async () => {
      await expect(service.lookup('1234')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException para CEP com mais de 8 dígitos', async () => {
      await expect(service.lookup('123456789')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException para CEP com apenas letras', async () => {
      await expect(service.lookup('abcdefgh')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar NotFoundException quando ViaCEP retorna erro: true', async () => {
      mockFetch({ erro: 'true' });

      await expect(service.lookup('99999999')).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadGatewayException quando a resposta HTTP não é ok', async () => {
      mockFetch({}, false);

      await expect(service.lookup('01310100')).rejects.toThrow(BadGatewayException);
    });

    it('deve lançar BadGatewayException quando fetch lança erro de rede', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

      await expect(service.lookup('01310100')).rejects.toThrow(BadGatewayException);
    });

    it('deve usar string vazia para campos ausentes na resposta', async () => {
      mockFetch({ localidade: 'São Paulo', uf: 'SP' });

      const result = await service.lookup('01310100');

      expect(result.logradouro).toBe('');
      expect(result.bairro).toBe('');
      expect(result.cidade).toBe('São Paulo');
    });
  });
});
