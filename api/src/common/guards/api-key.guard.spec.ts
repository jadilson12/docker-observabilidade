import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { ApiKeyGuard } from './api-key.guard.js';

function makeContext(path: string, apiKey?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        path,
        headers: { 'x-api-key': apiKey },
      }),
    }),
  } as unknown as ExecutionContext;
}

function makeGuard(apiKey = 'test-api-key'): ApiKeyGuard {
  const config = { get: () => apiKey } as unknown as ConfigService;
  return new ApiKeyGuard(config);
}

describe('ApiKeyGuard', () => {
  it('deve permitir acesso à rota pública /', () => {
    const guard = makeGuard();
    expect(guard.canActivate(makeContext('/'))).toBe(true);
  });

  it('deve permitir acesso a rotas de documentação /docs', () => {
    const guard = makeGuard();
    expect(guard.canActivate(makeContext('/docs'))).toBe(true);
    expect(guard.canActivate(makeContext('/docs/swagger-ui'))).toBe(true);
  });

  it('deve permitir acesso com API key correta', () => {
    const guard = makeGuard('minha-chave');
    expect(guard.canActivate(makeContext('/users', 'minha-chave'))).toBe(true);
  });

  it('deve rejeitar acesso sem API key', () => {
    const guard = makeGuard();
    expect(() => guard.canActivate(makeContext('/users', undefined))).toThrow(UnauthorizedException);
  });

  it('deve rejeitar acesso com API key incorreta', () => {
    const guard = makeGuard();
    expect(() => guard.canActivate(makeContext('/users', 'wrong-key'))).toThrow(UnauthorizedException);
  });
});
