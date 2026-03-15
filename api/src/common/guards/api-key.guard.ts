import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import type { Env } from '../../config/env.js';

// Rotas que não exigem autenticação
const PUBLIC_PATHS = ['/'];
const PUBLIC_PREFIXES = ['/docs', '/health'];

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Health check e Swagger ficam públicos
    if (PUBLIC_PATHS.includes(request.path) || PUBLIC_PREFIXES.some((p) => request.path.startsWith(p))) {
      return true;
    }

    const provided = (request.headers as Record<string, string | string[] | undefined>)['x-api-key'];
    const expected = this.config.get<string>('API_KEY');

    if (!provided || provided !== expected) {
      throw new UnauthorizedException('API key inválida ou ausente');
    }
    return true;
  }
}
