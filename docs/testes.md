# Estratégia de Testes — API (NestJS)

Documentação completa da estratégia de testes adotada na API: ferramentas, camadas, arquivos, mocks e como executar.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Ferramentas](#ferramentas)
- [Estrutura de Arquivos](#estrutura-de-arquivos)
- [Pirâmide de Testes](#pirâmide-de-testes)
- [Configurações Vitest](#configurações-vitest)
- [Testes Unitários](#testes-unitários)
  - [email.vo.spec.ts](#emailvospects)
  - [pagination-query.dto.spec.ts](#pagination-querydtospects)
  - [user.validator.spec.ts](#uservalidatorspects)
  - [api-key.guard.spec.ts](#api-keyguardspects)
  - [users.service.spec.ts](#usersservicespects)
  - [appointment.service.spec.ts](#appointmentservicespects)
  - [cep.service.spec.ts](#cepservicespects)
- [Testes de Integração (mocks)](#testes-de-integração-mocks)
  - [factory.ts](#factoryts)
  - [users.integration-spec.ts](#usersintegration-spects)
  - [appointments.integration-spec.ts](#appointmentsintegration-spects)
  - [cep.integration-spec.ts](#cepintegration-spects)
- [Testes E2E (banco real)](#testes-e2e-banco-real)
  - [app.e2e-spec.ts](#appe2e-spects)
  - [users.e2e-spec.ts](#otherse2e-spects)
  - [appointments.e2e-spec.ts](#appointmentse2e-spects)
  - [cep.e2e-spec.ts](#cepe2e-spects)
- [Testes de Stress](#testes-de-stress)
  - [Opção 1 — Interna (Vitest + Supertest)](#opção-1--interna-vitest--supertest)
    - [helpers.ts (stress)](#helpersts-stress)
    - [users.stress-spec.ts](#usersstress-spects)
    - [appointments.stress-spec.ts](#appointmentsstress-spects)
  - [Opção 2 — Externa (k6)](#opção-2--externa-k6)
  - [Quando usar cada abordagem](#quando-usar-cada-abordagem)
- [Estratégia de Mocks](#estratégia-de-mocks)
- [Banco de Dados de Teste](#banco-de-dados-de-teste)
- [Executando os Testes](#executando-os-testes)
- [Cobertura das Regras de Negócio](#cobertura-das-regras-de-negócio)

---

## Visão Geral

Os testes estão organizados em **quatro camadas complementares**, cada uma com escopo, velocidade e dependências diferentes:

| Camada | Objetivo | Velocidade | Banco | Rede |
|--------|----------|------------|-------|------|
| **Unitários** | Lógica pura de cada classe | < 1s total | Nenhum | Nenhuma |
| **Integração (mocks)** | Pipeline HTTP completo sem I/O real | ~2–4s total | Nenhum | Nenhuma |
| **E2E** | Sistema real de ponta a ponta | ~5–15s total | PostgreSQL real | Nenhuma (fetch mockado quando necessário) |
| **Stress** | Concorrência, latência e throughput | ~10–30s total | PostgreSQL real | Nenhuma (CepService mockado) |

A separação é intencional:
- **Unitários** rodam em modo watch durante o desenvolvimento
- **Integração** validam o pipeline HTTP (guard → pipe → controller → service) sem depender de banco
- **E2E** confirmam que tudo funciona junto em condições reais
- **Stress** medem o comportamento sob carga concorrente

```
                  ┌──────────────────────────────────┐
                  │         Stress Tests             │  ← banco real, carga concorrente
                  │  test/stress/  |  test:stress    │
                  └──────────────────────────────────┘
                ┌────────────────────────────────────────┐
                │            E2E Tests                   │  ← banco real, HTTP real
                │  test/e2e/  |  test:e2e               │
                └────────────────────────────────────────┘
              ┌──────────────────────────────────────────────┐
              │       Integration Tests (mocks)              │  ← sem banco, pipeline NestJS
              │  test/integration/  |  test:integration      │
              └──────────────────────────────────────────────┘
            ┌────────────────────────────────────────────────────┐
            │              Unit Tests                            │  ← sem I/O, componentes isolados
            │  src/**/*.spec.ts  |  npm test                    │
            └────────────────────────────────────────────────────┘
```

---

## Ferramentas

| Ferramenta | Versão | Papel |
|------------|--------|-------|
| [Vitest](https://vitest.dev/) | v4 | Runner de testes para todas as camadas |
| [`@nestjs/testing`](https://docs.nestjs.com/fundamentals/testing) | v11 | Criação do módulo NestJS nos testes de integração e E2E |
| [Supertest](https://github.com/ladjs/supertest) | v7 | Requisições HTTP nos testes de integração, E2E e stress |
| [`unplugin-swc`](https://github.com/nicolo-ribaudo/unplugin-swc) | v1 | Transpilação TypeScript rápida via SWC (suporte a decorators NestJS) |

**Por que Vitest e não Jest?**

Vitest é mais rápido, tem suporte nativo a ESM, usa `unplugin-swc` para decorators e compartilha a mesma API (`describe`/`it`/`expect`) com Jest — zero reescrita de testes existentes. Um único runner cobre todas as quatro camadas com configs separadas.

---

## Estrutura de Arquivos

```
api/
├── vitest.config.ts               ← unit tests
├── vitest.config.integration.ts   ← integration tests (mocks)
├── vitest.config.e2e.ts           ← E2E tests (banco real)
├── vitest.config.stress.ts        ← stress tests (banco real, concorrência)
│
├── src/                           ← testes unitários ficam ao lado dos arquivos testados
│   ├── common/
│   │   ├── domain/
│   │   │   └── email.vo.spec.ts
│   │   ├── dto/
│   │   │   └── pagination-query.dto.spec.ts
│   │   └── guards/
│   │       └── api-key.guard.spec.ts
│   ├── users/
│   │   ├── user.validator.spec.ts
│   │   └── users.service.spec.ts
│   ├── appointments/
│   │   └── appointment.service.spec.ts
│   └── cep/
│       └── cep.service.spec.ts
│
└── test/
    ├── setup.ts                   ← bootstrap E2E e stress (OTel condicional)
    ├── helpers.ts                 ← createApp() + API_KEY compartilhados
    │
    ├── integration/               ← pipeline NestJS sem banco
    │   ├── setup.ts               ← vazio (OTel usa no-ops sem SDK)
    │   ├── factory.ts             ← createIntegrationApp() com mocks injetáveis
    │   ├── users.integration-spec.ts
    │   ├── appointments.integration-spec.ts
    │   └── cep.integration-spec.ts
    │
    ├── e2e/                       ← AppModule completo + PostgreSQL real
    │   ├── app.e2e-spec.ts
    │   ├── users.e2e-spec.ts
    │   ├── appointments.e2e-spec.ts
    │   └── cep.e2e-spec.ts
    │
    └── stress/                    ← carga concorrente + asserções de latência
        ├── helpers.ts             ← measureConcurrent(), StressResult
        ├── users.stress-spec.ts
        └── appointments.stress-spec.ts
```

**Convenção de nomenclatura:**
- `*.spec.ts` — unitários (em `src/`)
- `*.integration-spec.ts` — integração com mocks (em `test/integration/`)
- `*.e2e-spec.ts` — E2E com banco real (em `test/e2e/`)
- `*.stress-spec.ts` — stress com banco real (em `test/stress/`)

---

## Pirâmide de Testes

```
                             ╔═══════════════════════════╗
                             ║       Stress Tests        ║
                             ║  banco real | concorrente ║
                             ╚═══════════════════════════╝
                        ╔═════════════════════════════════════╗
                        ║          E2E Tests                  ║
                        ║  banco real | HTTP real | ~15s      ║
                        ╚═════════════════════════════════════╝
                   ╔═══════════════════════════════════════════════╗
                   ║        Integration Tests (mocks)             ║
                   ║  sem banco | pipeline NestJS | ~3s           ║
                   ╚═══════════════════════════════════════════════╝
              ╔════════════════════════════════════════════════════════╗
              ║                  Unit Tests                           ║
              ║  sem I/O | componentes isolados | < 1s               ║
              ╚════════════════════════════════════════════════════════╝
```

### O que cada camada verifica

**Unitários** — lógica pura de cada classe/função. Bancos, APIs externas e o próprio NestJS são mockados. São rápidos e determinísticos; rodam a cada save em modo watch.

**Integração (mocks)** — sobe o pipeline NestJS completo (guard → ValidationPipe → controller → service) sem TypeORM. Repositories e CepService são substituídos por `vi.fn()`. Permitem simular erros difíceis de reproduzir no banco real (ex: código PG 23505, 23503) e cenários de erro do CepService (502, 404) de forma controlada.

**E2E** — sobe o `AppModule` completo com PostgreSQL real (`postgres_test`). Valida que todas as camadas (HTTP → Guard → Controller → Service → Repository → PostgreSQL) funcionam corretamente juntas. O banco é zerado a cada suite (`dropSchema: true` + `synchronize: true`).

**Stress** — duas abordagens complementares. A **interna** (Vitest + Supertest) dispara requisições simultâneas com `Promise.allSettled`, mede p50/p95/p99 e valida limites de latência — roda no CI sem infraestrutura extra. A **externa** (k6) simula usuários virtuais contra a API real com a stack de observabilidade ativa, gerando traces e métricas visíveis no Grafana em tempo real.

---

## Configurações Vitest

### `vitest.config.ts` — Testes Unitários

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
```

Sem variáveis de ambiente de banco — nenhum I/O externo é feito.

---

### `vitest.config.integration.ts` — Integração (mocks)

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/integration/**/*.integration-spec.ts'],
    setupFiles: ['test/integration/setup.ts'],
    fileParallelism: false,
    testTimeout: 15000,
    env: {
      NODE_ENV: 'test',
      APP_NAME: 'test-api',
      API_KEY: 'test-api-key',
      OTEL_SDK_DISABLED: 'true',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4317',
      // Sem DB_* — TypeORM nunca é inicializado
    },
  },
});
```

- Sem variáveis de banco: o `TestingModule` da factory nunca importa o `AppModule` nem o TypeORM.
- `OTEL_SDK_DISABLED: 'true'` + setup vazio: o SDK OpenTelemetry usa no-ops automaticamente.
- `fileParallelism: false`: evita conflitos de porta HTTP entre suites.

---

### `vitest.config.e2e.ts` — E2E (banco real)

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/e2e/**/*.e2e-spec.ts'],
    setupFiles: ['test/setup.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      APP_NAME: 'test-api',
      API_KEY: 'test-api-key',
      OTEL_SDK_DISABLED: 'true',
      DB_HOST: process.env.DB_HOST ?? 'localhost',
      DB_PORT: process.env.DB_PORT ?? '5432',
      DB_USER: process.env.DB_USER ?? 'postgres',
      DB_PASSWORD: process.env.DB_PASSWORD ?? 'postgres',
      DB_NAME: process.env.DB_TEST_NAME ?? 'postgres_test',
    },
  },
});
```

- `DB_NAME` lido de `DB_TEST_NAME` (sobrescrevível por CI) ou `postgres_test`.
- `NODE_ENV: 'test'` ativa `dropSchema: true` + `synchronize: true` no TypeORM.

---

### `vitest.config.stress.ts` — Stress (banco real, carga)

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/stress/**/*.stress-spec.ts'],
    setupFiles: ['test/setup.ts'],
    fileParallelism: false,
    testTimeout: 60000,   // testes com dezenas de req concorrentes precisam de mais tempo
    hookTimeout: 60000,
    env: {
      NODE_ENV: 'test',
      APP_NAME: 'test-api',
      API_KEY: 'test-api-key',
      OTEL_SDK_DISABLED: 'true',
      DB_HOST: process.env.DB_HOST ?? 'localhost',
      DB_PORT: process.env.DB_PORT ?? '5432',
      DB_USER: process.env.DB_USER ?? 'postgres',
      DB_PASSWORD: process.env.DB_PASSWORD ?? 'postgres',
      // DB_STRESS_NAME isola o banco de stress do banco de E2E (opcional)
      DB_NAME: process.env.DB_STRESS_NAME ?? process.env.DB_TEST_NAME ?? 'postgres_test',
    },
  },
});
```

- `DB_STRESS_NAME` permite usar um banco separado para stress — útil quando E2E e stress rodam em paralelo no CI.

---

## Testes Unitários

### `email.vo.spec.ts`

**Arquivo testado:** `src/common/domain/email.vo.ts`

**Papel:** O `Email` é um Value Object responsável por validar o formato de e-mails via regex. É o único ponto do sistema que define o que é um e-mail válido.

| Cenário | Expectativa |
|---------|-------------|
| `user@example.com` | válido |
| `nome.sobrenome@dominio.com.br` | válido |
| `user+tag@sub.domain.org` | válido |
| `  user@example.com  ` (espaços nas bordas) | válido (`.trim()` aplicado) |
| `userexample.com` (sem `@`) | inválido |
| `user@` (sem domínio) | inválido |
| `user@domain` (sem TLD) | inválido |
| `us er@domain.com` (espaço interno) | inválido |
| string vazia | inválido |

---

### `pagination-query.dto.spec.ts`

**Arquivo testado:** `src/common/dto/pagination-query.dto.ts`

**Papel:** Transforma strings de query string (`?page=2&limit=20`) em valores numéricos validados e calcula o `skip` para o banco.

| Cenário | Expectativa |
|---------|-------------|
| Query vazia | `page=1`, `limit=10` (defaults) |
| `page=3&limit=25` | `page=3`, `limit=25` |
| `page=0` | `page=1` (mínimo) |
| `limit=200` | `limit=100` (máximo) |
| `limit=1` | `limit=1` (mínimo válido) |
| `page=abc&limit=xyz` | fallback para defaults |
| `page=3, limit=10` | `skip=20` |
| `page=1, limit=15` | `skip=0` |

**Detalhe:** `limit=0` retorna `10` porque `parseInt('0') || 10` resulta em `10` — o `0` é falsy, ativando o default.

---

### `user.validator.spec.ts`

**Arquivo testado:** `src/users/user.validator.ts`

**Papel:** `validateUserOrThrow` aplica regras de negócio _após_ o `ValidationPipe`. Lança `UnprocessableEntityException` (422) — diferenciando erros de domínio dos erros de formato (400).

| Cenário | Expectativa |
|---------|-------------|
| `{ name: 'João Silva', email: 'joao@test.com' }` | sem erro |
| `{}` (update parcial) | sem erro |
| `{ name: '' }` ou `{ name: '   ' }` | `UnprocessableEntityException` |
| `{ name: 'A' }` (1 char) | erro: mínimo 2 |
| `{ name: 'A'.repeat(101) }` | erro: máximo 100 |
| `{ email: '' }` ou `{ email: '   ' }` | erro |
| `{ email: 'nao-e-email' }` | erro |
| `{ name: 'A', email: 'invalido' }` | **2 erros acumulados** no array da exceção |

O último cenário valida que erros são acumulados (não fail-fast).

---

### `api-key.guard.spec.ts`

**Arquivo testado:** `src/common/guards/api-key.guard.ts`

**Papel:** Guard global que inspeciona o header `x-api-key`. Rotas `/` e `/docs/*` são públicas.

**Estratégia de mock:** `{ get: () => 'test-api-key' }` substitui o `ConfigService` sem subir o módulo NestJS.

| Cenário | Expectativa |
|---------|-------------|
| `GET /` | liberado |
| `GET /docs` e `/docs/swagger-ui` | liberado |
| `GET /users` com key correta | liberado |
| `GET /users` sem key | `UnauthorizedException` |
| `GET /users` com key errada | `UnauthorizedException` |

---

### `users.service.spec.ts`

**Arquivo testado:** `src/users/users.service.ts`

**Papel:** Núcleo da lógica de negócio de usuários — validação de domínio, consulta CEP, persistência e tratamento de erros de banco.

**Estratégia de mock:**

```typescript
// vi.mock é hoisted — executado ANTES dos imports
vi.mock('@opentelemetry/api', () => ({
  metrics: { getMeter: () => ({ createHistogram: ..., createCounter: ... }) },
  trace: { getTracer: () => ({ startActiveSpan: vi.fn((_, fn) => fn(fakeSpan)) }) },
  SpanStatusCode: { ERROR: 2 },
}));

import { UsersService } from './users.service.js';

const repo = { findPaginated: vi.fn(), findOne: vi.fn(), create: vi.fn(), ... };
const cepService = { lookup: vi.fn() };
service = new UsersService(repo, cepService);
```

| Método | Cenários cobertos |
|--------|------------------|
| `findAll` | Lista paginada; `findPaginated` chamado com skip/limit corretos |
| `findOne` | Usuário encontrado; `NotFoundException` quando ausente |
| `create` | Sem CEP; com CEP (dados completos); com complemento; propaga erro CepService; `ConflictException` (23505); `UnprocessableEntityException` para dados inválidos |
| `update` | Atualiza nome/email; com novo CEP; atualiza só numero/complemento; `NotFoundException`; `ConflictException` (23505) |
| `remove` | Sucesso; `NotFoundException`; `UnprocessableEntityException` para FK 23503 |

---

### `appointment.service.spec.ts`

**Arquivo testado:** `src/appointments/appointment.service.ts`

**Papel:** Gerencia o ciclo de vida dos agendamentos. Mesma estratégia de mock de OTel do `UsersService`.

| Método | Cenários cobertos |
|--------|------------------|
| `findAll` | Lista com múltiplos itens; lista vazia |
| `findOne` | Item encontrado; `NotFoundException` |
| `create` | Com `title`/`scheduledAt`; com `description`; converte `scheduledAt` string → `Date` |
| `update` | Atualiza título; `NotFoundException`; converte `scheduledAt`; ignora campos `undefined` |
| `remove` | Sucesso (verifica `findOne` antes); `NotFoundException` sem chamar `remove` |

---

### `cep.service.spec.ts`

**Arquivo testado:** `src/cep/cep.service.ts`

**Papel:** Encapsula toda a comunicação com a API externa ViaCEP. Valida CEP, faz fetch, normaliza a resposta e trata todos os erros.

**Estratégia de mock:** `vi.spyOn(globalThis, 'fetch')` — nenhuma conexão de rede é feita.

| Cenário | Expectativa |
|---------|-------------|
| CEP `01310-100` (com traço) | normaliza para `01310100`, dados corretos |
| CEP `01310100` (sem traço) | mesmo resultado |
| CEP `1234` (< 8 dígitos) | `BadRequestException` |
| CEP `123456789` (> 8 dígitos) | `BadRequestException` |
| CEP `abcdefgh` (só letras) | `BadRequestException` |
| ViaCEP retorna `{ erro: "true" }` | `NotFoundException` |
| HTTP ViaCEP retorna `!ok` | `BadGatewayException` |
| `fetch` lança erro de rede | `BadGatewayException` |
| Campos ausentes na resposta ViaCEP | string vazia como fallback |

---

## Testes de Integração (mocks)

Os testes de integração sobem o pipeline NestJS completo — `ApiKeyGuard`, `ValidationPipe`, controllers, services — **sem TypeORM e sem banco de dados**. Repositories e `CepService` são substituídos por `vi.fn()`, dando controle total sobre os valores retornados e erros lançados.

Isso permite testar cenários impossíveis ou difíceis de reproduzir no banco real:
- Erros de constraint PostgreSQL (código 23505, 23503) simulados como `mockRejectedValue({ code: '23505' })`
- `CepService` lançando `BadGatewayException` ou `NotFoundException` de forma direta
- Retornos específicos por teste sem precisar criar e limpar registros no banco

### `factory.ts`

A fábrica central dos testes de integração. Cria um `TestingModule` mínimo — apenas controllers, services e providers essenciais, **sem `AppModule`**:

```typescript
export async function createIntegrationApp(opts: IntegrationAppOptions): Promise<INestApplication> {
  let builder = Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true })],
    controllers: [AppController, DebugController, UsersController, AppointmentController, CepController],
    providers: [AppService, UsersService, AppointmentService, CepService,
                UsersRepository, AppointmentRepository,
                { provide: APP_GUARD, useClass: ApiKeyGuard }],
  })
    .overrideProvider(UsersRepository).useValue(usersRepo)
    .overrideProvider(AppointmentRepository).useValue(appointmentRepo);

  // cepService: null → usa CepService real (para testar o endpoint /cep)
  // cepService: objeto → mock (para testar users/appointments)
  // cepService: omitido → makeCepMock() automático
  if (cepService !== null) {
    builder = builder.overrideProvider(CepService).useValue(cepService ?? makeCepMock());
  }
  // ...
}
```

Exporta também `makeUsersRepo()`, `makeAppointmentRepo()` e `makeCepMock()` para criar mocks tipados nos arquivos de teste.

---

### `users.integration-spec.ts`

**Cobertura:** 20 testes cobrindo todo o CRUD de usuários com foco nos cenários de erro controlados.

| Grupo | Cenários notáveis |
|-------|------------------|
| `GET /users` | Lista paginada com meta; parâmetros page/limit; 401 |
| `GET /users/:id` | Usuário encontrado; com endereço; 404; 401 |
| `POST /users` | Sem endereço; com CEP; 502 CepService indisponível; 404 CEP não encontrado; **409** (23505); 400 nome/email/CEP inválido; 401 |
| `PUT /users/:id` | Atualiza nome; adiciona CEP; 404; **409** (23505); 400 CEP inválido; 401 |
| `DELETE /users/:id` | 204; 404; **422** (23503 FK violation); 401 |

Os erros 409 (23505) e 422 (23503) são os principais diferenciais desta camada — simulados via `mockRejectedValue({ code: '23505' })`, sem precisar de dados reais no banco.

---

### `appointments.integration-spec.ts`

**Cobertura:** 15 testes cobrindo todo o CRUD de agendamentos.

| Grupo | Cenários |
|-------|----------|
| `GET /appointments` | Lista com 2 itens; lista vazia; 401 |
| `GET /appointments/:id` | Por ID; 404; 401 |
| `POST /appointments` | Sem descrição; com descrição; 400 sem title; 400 sem scheduledAt; 400 data inválida; 401 |
| `PUT /appointments/:id` | Atualiza título; data e descrição; 404; 401 |
| `DELETE /appointments/:id` | 204; 404; 401 |

---

### `cep.integration-spec.ts`

**Diferencial:** usa `cepService: null` na factory para manter o `CepService` **real**, mockando apenas o `globalThis.fetch`. Isso exercita o controller + service juntos sem chamadas de rede.

**Cobertura:** 9 testes espelhando os da camada E2E:

| Cenário | Status |
|---------|--------|
| CEP válido sem traço | 200 com campos corretos |
| Normalização de CEP com traço | 200, CEP normalizado |
| Campos ausentes na resposta | 200 com strings vazias |
| ViaCEP `{ erro: true }` | 404 |
| CEP com < 8 dígitos | 400 |
| CEP com > 8 dígitos | 400 |
| HTTP ViaCEP `!ok` | 502 |
| `fetch` lança erro de rede | 502 |
| Sem API key | 401 |

---

## Testes E2E (banco real)

Os testes E2E sobem o `AppModule` completo (com TypeORM + PostgreSQL real). `NODE_ENV=test` ativa `dropSchema: true` + `synchronize: true`, zerando e recriando o schema a cada inicialização de suite. Cada arquivo de teste cria e destrói sua própria instância da aplicação.

### `app.e2e-spec.ts`

**Papel:** Valida health check, autenticação global e endpoints de debug.

| Rota | Cenário | Status |
|------|---------|--------|
| `GET /` | Sem autenticação | 200 `Hello World!` |
| `GET /users` | Sem API key | 401 |
| `GET /users` | API key errada | 401 |
| `GET /users` | API key correta | 200 |
| `GET /debug/error/500` | Com API key | 500 |
| `GET /debug/error/502` | Com API key | 502 |

---

### `users.e2e-spec.ts`

**Por que mockar o `CepService` no E2E?**

A API ViaCEP é uma dependência externa. Nos testes E2E, mockamos apenas o `CepService` via `overrideProvider` — o banco, o guard, o pipe e o controller continuam reais:

```typescript
app = await createApp((builder) =>
  builder.overrideProvider(CepService).useValue({ lookup: mockCep }),
);
```

**Cobertura:**

| Endpoint | Cenários |
|----------|---------|
| `POST /users` | Sem endereço; com CEP+numero+complemento; com CEP sem numero; e-mail duplicado (409); nome vazio (400); e-mail inválido (400); CEP inválido (400); 401 |
| `GET /users` | Lista paginada com meta; page/limit; 401 |
| `GET /users/:id` | Por ID; com endereço salvo; 404; 401 |
| `PUT /users/:id` | Atualiza nome; atualiza e-mail; adiciona CEP; atualiza só numero; e-mail em uso (409); 404; 401 |
| `DELETE /users/:id` | 204; 404 após remoção; 404 para UUID inexistente; 401 |

---

### `appointments.e2e-spec.ts`

**Papel:** CRUD completo de agendamentos sem dependências externas a mockar.

| Endpoint | Cenários |
|----------|---------|
| `POST /appointments` | Sem descrição; com descrição; 400 sem title; 400 sem scheduledAt; 401 |
| `GET /appointments` | Lista com múltiplos itens; confirma array; 401 |
| `GET /appointments/:id` | Por ID; 404; 401 |
| `PUT /appointments/:id` | title; scheduledAt; description; múltiplos campos; 404; 401 |
| `DELETE /appointments/:id` | 204; 404 após remoção; 404 inexistente; 401 |

---

### `cep.e2e-spec.ts`

**Diferencial em relação ao integration:** aqui o mock está no `globalThis.fetch` (não no `CepService`), validando o fluxo completo `CepController` → `CepService` → `fetch` → resposta HTTP.

| Cenário | Status |
|---------|--------|
| CEP válido sem traço | 200 com todos os campos |
| CEP válido com traço (`80020-310`) | 200, normalizado para `80020310` |
| ViaCEP `{ erro: "true" }` | 404 |
| CEP < 8 dígitos | 400 |
| CEP > 8 dígitos | 400 |
| HTTP ViaCEP `!ok` | 502 |
| `fetch` lança ECONNREFUSED | 502 |
| Sem API key | 401 |

---

## Testes de Stress

Os testes de stress medem o comportamento do sistema sob carga concorrente. O projeto oferece **duas abordagens** com propósitos complementares:

| | Interna (Vitest + Supertest) | Externa (k6) |
|-|------------------------------|--------------|
| **Onde roda** | Dentro do processo Node.js | Processo separado, fora da app |
| **API testada** | Servidor HTTP embutido do NestJS (sem porta TCP real) | API rodando em porta real (`http://localhost:3000`) |
| **Telemetria** | Desativada (`OTEL_SDK_DISABLED=true`) | Ativa — gera traces, métricas e logs reais |
| **Integração com Grafana** | Não | Sim — métricas visíveis em tempo real |
| **Velocidade de setup** | Instantâneo (sem Docker extra) | Requer app + stack de observabilidade rodando |
| **Uso principal** | CI, validação de regressão de performance | Análise de observabilidade, testes de capacidade |

---

## Opção 1 — Interna (Vitest + Supertest)

Roda dentro da suíte de testes usando a mesma infraestrutura do E2E. Ideal para **detectar regressões de performance no CI** sem depender de nenhum serviço externo além do PostgreSQL.

### `helpers.ts` (stress)

Fornece `measureConcurrent(concurrency, fn)`:

```typescript
export async function measureConcurrent(
  concurrency: number,
  fn: () => Promise<number>,  // retorna o status HTTP
): Promise<StressResult> {
  // Dispara `concurrency` chamadas em paralelo com Promise.allSettled
  // Mede latência de cada chamada individualmente
  // Calcula p50, p95, p99, rps e contagem de erros (status >= 500)
}

export interface StressResult {
  total: number;
  success: number;
  errors: number;
  latencies: number[];  // ms por requisição bem-sucedida
  p50: number;
  p95: number;
  p99: number;
  rps: number;         // requisições bem-sucedidas por segundo
  durationMs: number;
}
```

Cada teste de stress imprime um log com as métricas para diagnóstico manual:

```
[stress] GET /users x50 — { p50: 12, p95: 45, p99: 89, rps: '42.3', errors: 0 }
```

---

### `users.stress-spec.ts`

O `CepService` é mockado para evitar dependência de rede externa durante a carga.

| Cenário | Carga | Asserção |
|---------|-------|----------|
| Leitura `GET /users` | 50 simultâneas | p95 < 500ms, 0 erros |
| Leitura `GET /users` | 100 simultâneas | p99 < 1000ms, erros < 2% |
| Escrita `POST /users` | 20 simultâneas | p95 < 1000ms, 0 erros |
| Carga mista 30 GET + 10 POST | 40 simultâneas | duração total < 1500ms, 0 erros |

E-mails únicos são gerados com `Date.now() + Math.random()` para evitar conflitos de constraint.

---

### `appointments.stress-spec.ts`

Não precisa mockar nenhuma dependência externa.

| Cenário | Carga | Asserção |
|---------|-------|----------|
| Leitura `GET /appointments` | 50 simultâneas | p95 < 500ms, 0 erros |
| Leitura `GET /appointments` | 100 simultâneas | p99 < 1000ms, erros < 2% |
| Escrita `POST /appointments` | 20 simultâneas | p95 < 1000ms, 0 erros |
| Carga mista 30 GET + 10 POST + 5 DELETE | 45 simultâneas | duração total < 1500ms, 0 erros |

Para o cenário de DELETE, 5 agendamentos são criados antecipadamente no início do teste e então deletados durante a carga mista.

---

## Opção 2 — Externa (k6)

O [k6](https://k6.io/) é uma ferramenta de stress e carga que roda **fora da aplicação**, disparando requisições HTTP reais contra a API em execução. A grande diferença em relação à abordagem interna é que a telemetria fica ativa: cada requisição gera spans, métricas e logs que fluem para OpenTelemetry Collector → Grafana, permitindo analisar o comportamento do sistema sob carga em tempo real.

### Pré-requisitos

```bash
# Instalar o k6
brew install k6          # macOS
# ou via Docker:
docker run --rm -i grafana/k6 run - <script.js

# Subir toda a stack (API + observabilidade)
docker compose up -d
# ou apenas o necessário:
docker compose up -d postgres api
```

### Estrutura dos scripts k6

Os scripts ficam em `k6/` na raiz do projeto (não fazem parte da suíte Vitest):

```
k6/
├── users.js           ← stress de usuários (CRUD)
├── appointments.js    ← stress de agendamentos
└── smoke.js           ← teste rápido de sanidade (1 VU, 30s)
```

### Exemplo de script k6

```javascript
// k6/users.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // ramp-up: 0 → 20 VUs em 30s
    { duration: '1m',  target: 20 },   // carga constante: 20 VUs por 1 min
    { duration: '10s', target: 0 },    // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // p95 abaixo de 500ms
    http_req_failed:   ['rate<0.01'],  // menos de 1% de erros
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY  = __ENV.API_KEY  || 'test-api-key';

export default function () {
  const res = http.get(`${BASE_URL}/users`, {
    headers: { 'x-api-key': API_KEY },
  });

  check(res, {
    'status 200': (r) => r.status === 200,
    'tem campo data': (r) => JSON.parse(r.body).data !== undefined,
  });

  sleep(1);
}
```

### Executando k6

```bash
# Teste básico de leitura
k6 run k6/users.js

# Com variáveis de ambiente personalizadas
k6 run -e BASE_URL=http://localhost:3000 -e API_KEY=minha-key k6/users.js

# Gerando relatório HTML
k6 run --out json=resultado.json k6/users.js

# Via Docker (sem instalar k6 localmente)
docker run --rm -i --network host grafana/k6 run - < k6/users.js
```

### Visualizando no Grafana

Com a stack de observabilidade rodando, as métricas geradas pelo k6 e pela API aparecem automaticamente nos dashboards do Grafana (`http://localhost:3000`):

- **Traces**: cada requisição k6 gera um span visível no painel de traces (via OpenSearch)
- **Métricas**: latência p50/p95/p99, throughput (req/s) e taxa de erro
- **Logs**: logs estruturados da API correlacionados com os trace IDs

---

## Quando usar cada abordagem

| Situação | Abordagem recomendada |
|----------|-----------------------|
| CI/CD — detectar regressão de performance | **Interna** (`npm run test:stress`) |
| Desenvolvimento local — validar sem infraestrutura | **Interna** |
| Análise de observabilidade — ver traces e métricas reais | **Externa** (k6) |
| Teste de capacidade — quantos VUs o sistema aguenta | **Externa** (k6) |
| Relatório de performance para stakeholders | **Externa** (k6 + dashboard Grafana) |
| Simular padrões de carga reais (ramp-up, picos) | **Externa** (k6 com `stages`) |

Em geral: use a abordagem **interna** para garantias automatizadas e a **externa** para análise e investigação.

---

## Estratégia de Mocks

### OpenTelemetry nos Testes Unitários

O decorator `@TraceService` executa **no momento em que a classe é definida** (tempo de importação). Se o SDK não estiver inicializado, as chamadas ao `metrics.getMeter()` e `trace.getTracer()` falhariam.

A solução é `vi.mock('@opentelemetry/api')` que o Vitest **hoist** automaticamente para antes de qualquer `import`:

```typescript
// Hoisted para ANTES de qualquer import pelo Vitest
vi.mock('@opentelemetry/api', () => ({
  metrics: {
    getMeter: () => ({
      createHistogram: () => ({ record: vi.fn() }),
      createCounter: () => ({ add: vi.fn() }),
    }),
  },
  trace: {
    getTracer: () => ({
      startActiveSpan: vi.fn((_name, fn) =>
        fn({ setAttribute: vi.fn(), setStatus: vi.fn(), recordException: vi.fn(), end: vi.fn() }),
      ),
    }),
  },
  SpanStatusCode: { OK: 1, ERROR: 2 },
}));

// Só depois o serviço pode ser importado com segurança
import { UsersService } from './users.service.js';
```

### OpenTelemetry nos Testes de Integração, E2E e Stress

Nesses contextos, `OTEL_SDK_DISABLED: 'true'` é passado via env. O `@opentelemetry/api` detecta a ausência de um SDK registrado e usa implementações **no-op** automaticamente — nenhum mock manual é necessário.

### `overrideProvider` — substituição cirúrgica no NestJS Testing

Para substituir um único provider sem afetar o módulo de produção:

```typescript
// Substitui apenas CepService; tudo mais continua real
const builder = Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(CepService)
  .useValue({ lookup: mockCep });
```

### Mocks de Repository nos Testes Unitários e de Integração

```typescript
const repo = {
  findPaginated: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
};

// Configuração por teste
repo.findOne.mockResolvedValue(null);
await expect(service.findOne('id')).rejects.toThrow(NotFoundException);

// Simulando erro de banco
repo.create.mockRejectedValue({ code: '23505' });
await expect(service.create(dto)).rejects.toThrow(ConflictException);
```

### `vi.spyOn(globalThis, 'fetch')` — mock do fetch nativo

Usado nos testes unitários e de integração do `CepService`:

```typescript
vi.spyOn(globalThis, 'fetch').mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ logradouro: 'Av. Paulista', ... }),
} as Response);

// Restaurado após cada teste
afterEach(() => vi.restoreAllMocks());
```

---

## Banco de Dados de Teste

### Banco principal de testes (E2E e Stress)

| Variável | Padrão |
|----------|--------|
| `DB_HOST` | `localhost` |
| `DB_PORT` | `5432` |
| `DB_USER` | `postgres` |
| `DB_PASSWORD` | `postgres` |
| `DB_NAME` (`DB_TEST_NAME`) | `postgres_test` |

### Banco separado para stress (opcional)

A variável `DB_STRESS_NAME` permite usar um banco diferente para os testes de stress, isolando-os dos E2E quando ambos rodam em paralelo no CI:

```bash
DB_STRESS_NAME=postgres_stress npm run test:stress
```

### Isolamento entre suites E2E

Quando `NODE_ENV=test`, o TypeORM é configurado com:

```typescript
dropSchema: true,    // derruba todas as tabelas ao iniciar
synchronize: true,   // recria baseado nas entidades
```

Cada arquivo `*.e2e-spec.ts` e `*.stress-spec.ts` cria seu próprio `AppModule`, o que garante um banco limpo por suite. Dentro de cada suite, os testes são responsáveis por limpar os dados que criam (padrão `createUser` + `deleteUser` em `afterAll`).

---

## Executando os Testes

### Pré-requisito para E2E e Stress

```bash
# Sobe apenas o PostgreSQL
docker compose up -d postgres
```

### Testes Unitários

```bash
npm test               # roda uma vez
npm run test:watch     # modo watch
npm run test:cov       # com cobertura de código
```

### Testes de Integração (mocks)

```bash
# Não precisa de banco — roda sem Docker
npm run test:integration
```

### Testes E2E (banco real)

```bash
npm run test:e2e

# Com banco alternativo
DB_TEST_NAME=meu_banco_test npm run test:e2e
```

### Testes de Stress

```bash
npm run test:stress

# Com banco isolado para stress
DB_STRESS_NAME=postgres_stress npm run test:stress
```

### Rodar todas as camadas em sequência

```bash
npm test && npm run test:integration && npm run test:e2e
```

---

## Cobertura das Regras de Negócio

| Regra | Unitário | Integração | E2E |
|-------|----------|------------|-----|
| E-mail válido (regex) | `email.vo.spec.ts` | `users.integration-spec.ts` | `users.e2e-spec.ts` |
| Nome entre 2–100 chars | `user.validator.spec.ts` | `users.integration-spec.ts` | `users.e2e-spec.ts` (400) |
| E-mail único no banco | `users.service.spec.ts` (ConflictException) | `users.integration-spec.ts` (23505→409) | `users.e2e-spec.ts` (409) |
| 404 para ID inexistente | `users.service.spec.ts` | `users/appointments.integration-spec.ts` | todos os E2E |
| Endereço populado via CEP | `users.service.spec.ts` | `users.integration-spec.ts` (cepMock) | `users.e2e-spec.ts` (overrideProvider) |
| CEP normalizado (remove traço) | `cep.service.spec.ts` | `cep.integration-spec.ts` | `cep.e2e-spec.ts` |
| CEP inválido (< ou > 8 dígitos) | `cep.service.spec.ts` | `cep.integration-spec.ts` | `cep.e2e-spec.ts` (400) |
| ViaCEP indisponível → 502 | `cep.service.spec.ts` | `cep.integration-spec.ts` | `cep.e2e-spec.ts` (502) |
| CepService indisponível → 502 | `users.service.spec.ts` | `users.integration-spec.ts` | — |
| FK violation 23503 → 422 | `users.service.spec.ts` | `users.integration-spec.ts` | — |
| API key obrigatória (exceto `/`) | `api-key.guard.spec.ts` | todos integration-spec | todos e2e-spec |
| Paginação (page/limit/skip) | `pagination-query.dto.spec.ts` | `users.integration-spec.ts` | `users.e2e-spec.ts` |
| Agendamento com/sem descrição | `appointment.service.spec.ts` | `appointments.integration-spec.ts` | `appointments.e2e-spec.ts` |
| `scheduledAt` como Date no banco | `appointment.service.spec.ts` | `appointments.integration-spec.ts` | `appointments.e2e-spec.ts` |
| Erros simulados debug (500/502) | — | — | `app.e2e-spec.ts` |
| Latência GET < 500ms (p95) | — | — | `users/appointments.stress-spec.ts` |
| Escrita concorrente sem erros | — | — | `users/appointments.stress-spec.ts` |
