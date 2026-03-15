/**
 * Factory para testes de integração.
 *
 * Sobe o pipeline NestJS completo (guard, pipe, controller, service) sem TypeORM.
 * Repositories e CepService são substituídos por mocks via overrideProvider.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { vi } from 'vitest';

import { ApiKeyGuard } from '../../src/common/guards/api-key.guard.js';
import { AppController } from '../../src/app.controller.js';
import { AppService } from '../../src/app.service.js';
import { DebugController } from '../../src/debug/debug.controller.js';
import { CepController } from '../../src/cep/cep.controller.js';
import { CepService } from '../../src/cep/cep.service.js';
import { UsersController } from '../../src/users/users.controller.js';
import { UsersService } from '../../src/users/users.service.js';
import { UsersRepository } from '../../src/users/users.repository.js';
import { AppointmentController } from '../../src/appointments/appointment.controller.js';
import { AppointmentService } from '../../src/appointments/appointment.service.js';
import { AppointmentRepository } from '../../src/appointments/appointment.repository.js';

// ─── Factories de mock ────────────────────────────────────────────────────────

export function makeUsersRepo() {
  return {
    findPaginated: vi.fn(),
    findOne: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
}

export function makeAppointmentRepo() {
  return {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
}

export function makeCepMock() {
  return { lookup: vi.fn() };
}

// ─── createIntegrationApp ─────────────────────────────────────────────────────

export interface IntegrationAppOptions {
  /** Mock do UsersRepository — padrão: makeUsersRepo() */
  usersRepo?: ReturnType<typeof makeUsersRepo>;
  /** Mock do AppointmentRepository — padrão: makeAppointmentRepo() */
  appointmentRepo?: ReturnType<typeof makeAppointmentRepo>;
  /**
   * Override do CepService.
   * - Valor passado: usa como mock (útil para usuários e appointments).
   * - `null`: não sobrescreve — usa o CepService real (útil para testar o endpoint /cep).
   * - Omitido: usa makeCepMock() por padrão.
   */
  cepService?: ReturnType<typeof makeCepMock> | null;
  /** Customizações adicionais no TestingModuleBuilder */
  configure?: (b: TestingModuleBuilder) => TestingModuleBuilder;
}

export async function createIntegrationApp(opts: IntegrationAppOptions = {}): Promise<INestApplication> {
  const { usersRepo = makeUsersRepo(), appointmentRepo = makeAppointmentRepo(), cepService, configure } = opts;

  // ConfigModule sem validação de esquema: não precisa de DB_HOST etc.
  // process.env já tem API_KEY injetado pelo vitest.config.integration.ts
  let builder = Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true })],
    controllers: [AppController, DebugController, UsersController, AppointmentController, CepController],
    providers: [
      AppService,
      UsersService,
      AppointmentService,
      CepService,
      UsersRepository,
      AppointmentRepository,
      { provide: APP_GUARD, useClass: ApiKeyGuard },
    ],
  })
    .overrideProvider(UsersRepository)
    .useValue(usersRepo)
    .overrideProvider(AppointmentRepository)
    .useValue(appointmentRepo);

  // Só sobrescreve CepService se não for explicitamente null
  if (cepService !== null) {
    builder = builder.overrideProvider(CepService).useValue(cepService ?? makeCepMock());
  }

  if (configure) builder = configure(builder);

  const module = await builder.compile();
  const app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}
