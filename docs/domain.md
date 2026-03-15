# Domínio da Aplicação

Documentação das entidades, regras de negócio, camadas e fluxos implementados na API (NestJS) e no frontend (Next.js).

---

## Sumário

- [Entidades](#entidades)
  - [User (Usuário)](#user-usuário)
  - [Appointment (Agendamento)](#appointment-agendamento)
- [Regras de Negócio](#regras-de-negócio)
- [Camadas da API](#camadas-da-api)
- [Fluxo de uma Requisição](#fluxo-de-uma-requisição)
- [Erros e Códigos HTTP](#erros-e-códigos-http)
- [Instrumentação de Observabilidade no Domínio](#instrumentação-de-observabilidade-no-domínio)
- [Frontend — Web (Next.js)](#frontend--web-nextjs)

---

## Entidades

### User (Usuário)

**Tabela PostgreSQL:** `users`

| Campo        | Tipo          | Restrição            | Descrição                        |
|--------------|---------------|----------------------|----------------------------------|
| `id`         | `uuid`        | PK, `gen_random_uuid()` | Identificador único           |
| `name`       | `varchar`     | NOT NULL             | Nome completo do usuário         |
| `email`      | `varchar`     | NOT NULL, UNIQUE     | E-mail (chave de negócio única)  |
| `created_at` | `timestamptz` | default `now()`      | Data/hora de criação             |
| `updated_at` | `timestamptz` | default `now()`      | Data/hora da última atualização  |

**Migration:** `1741910000000-CreateUsersTable`

**Estrutura em camadas:**

```
CreateUserDto / UpdateUserDto   ← entrada HTTP (validação class-validator)
        │
        ▼
  validateUserOrThrow()         ← validação de domínio (Email.isValid, name trim)
        │
        ▼
    UserModel                   ← objeto de domínio imutável (readonly)
        │
        ▼
    User (Entity)               ← mapeamento TypeORM ↔ PostgreSQL
        │
        ▼
   UserPresenter                ← saída HTTP (datas como ISO string)
```

---

### Appointment (Agendamento)

**Tabela PostgreSQL:** `appointments`

| Campo          | Tipo          | Restrição         | Descrição                              |
|----------------|---------------|-------------------|----------------------------------------|
| `id`           | `uuid`        | PK, `gen_random_uuid()` | Identificador único              |
| `title`        | `varchar`     | NOT NULL          | Título do agendamento                  |
| `description`  | `text`        | nullable          | Descrição opcional                     |
| `scheduled_at` | `timestamptz` | NOT NULL          | Data/hora do agendamento (com timezone)|
| `created_at`   | `timestamptz` | default `now()`   | Data/hora de criação                   |
| `updated_at`   | `timestamptz` | default `now()`   | Data/hora da última atualização        |

**Migration:** `1741920000000-CreateAgendaTable`

**Estrutura em camadas:**

```
CreateAppointmentDto / UpdateAppointmentDto   ← entrada HTTP
        │
        ▼
  AppointmentModel                            ← objeto de domínio imutável
        │
        ▼
  Appointment (Entity)                        ← mapeamento TypeORM ↔ PostgreSQL
        │
        ▼
  AppointmentPresenter                        ← saída HTTP (datas como ISO string)
```

---

## Regras de Negócio

### User

| Regra | Implementação | Erro gerado |
|-------|--------------|-------------|
| `name` obrigatório, entre 2 e 100 caracteres | `CreateUserDto` (class-validator) + `validateUserOrThrow()` | `400 Bad Request` / `422 Unprocessable Entity` |
| `name` não pode ser vazio ou só espaços | `validateUserOrThrow()` — aplica `.trim()` | `422 Unprocessable Entity` |
| `email` obrigatório e formato válido | `CreateUserDto` + `Email.isValid()` via `validateUserOrThrow()` | `400` / `422` |
| `email` deve ser único no sistema | constraint UNIQUE no PostgreSQL, capturada pelo código `23505` no service | `409 Conflict` |
| Atualização é parcial (patch) | `UpdateUserDto` — todos os campos são `@IsOptional()` | — |
| Remoção falha se usuário tem vínculos | código de erro PostgreSQL `23503` (FK violation) | `422 Unprocessable Entity` |

**Value Object `Email`** (`common/domain/email.vo.ts`):
- Valida o formato com regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Método estático `Email.isValid(value)` — usada no `validateUserOrThrow`

### Appointment

| Regra | Implementação | Erro gerado |
|-------|--------------|-------------|
| `title` obrigatório, entre 2 e 200 caracteres | `CreateAppointmentDto` | `400 Bad Request` |
| `description` é opcional, máx. 1000 caracteres | `CreateAppointmentDto` — `@IsOptional()` | `400` se fornecido e inválido |
| `scheduledAt` obrigatório, formato ISO 8601 | `@IsDateString()` no DTO | `400 Bad Request` |
| Atualização é parcial (patch) | `UpdateAppointmentDto` — todos `@IsOptional()` | — |
| `scheduledAt` salvo com timezone | `timestamptz` no banco | — |

---

## Camadas da API

```
HTTP Request
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Middleware Pipeline (aplicado a todas as rotas)                  │
│  1. CorrelationIdMiddleware — gera/propaga x-correlation-id      │
│  2. RequestLoggerMiddleware — loga method/url/status/duration    │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Guard: ApiKeyGuard                                               │
│  - Verifica header x-api-key                                     │
│  - Rotas públicas: GET / e /docs/*                               │
│  - Erro: 401 Unauthorized                                        │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ ValidationPipe (global)                                          │
│  - Valida e transforma o body com class-validator               │
│  - whitelist: true → remove campos extras do body               │
│  - transform: true → converte tipos automaticamente             │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Controller (UsersController / AppointmentController)             │
│  - Mapeamento de rotas REST                                      │
│  - Chama o Service, retorna o Presenter                          │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Service (UsersService / AppointmentService)                      │
│  - Orquestra a lógica de negócio                                 │
│  - Chama validateUserOrThrow() antes de persistir                │
│  - Trata erros do banco (23505 → 409, 23503 → 422)              │
│  - Emite logs estruturados via Logger                            │
│  @TraceService — instrumenta cada método com span OTel           │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Repository (UsersRepository / AppointmentRepository)             │
│  - Acessa o banco via TypeORM                                    │
│  - Retorna sempre Models (nunca Entities diretamente)            │
│  @TraceRepository — instrumenta queries com span + atributo      │
│                     db.system=postgresql                         │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
                         PostgreSQL (TypeORM)
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ HttpExceptionFilter (global)                                     │
│  - Captura todas as exceções                                     │
│  - Formata resposta: { statusCode, timestamp, path, message }    │
│  - Registra o status code no span OTel ativo                     │
│  - Para 5xx: recordException + SpanStatus.ERROR no span          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de uma Requisição

### Exemplo: `POST /users`

```
1. Request chega com header x-api-key e body JSON

2. CorrelationIdMiddleware
   └─ gera x-correlation-id (UUID) se ausente
   └─ propaga no response header e no span OTel ativo

3. ApiKeyGuard
   └─ valida x-api-key === process.env.API_KEY
   └─ rejeita com 401 se inválido

4. ValidationPipe
   └─ instancia CreateUserDto
   └─ valida: name (string, 2-100 chars), email (formato válido)
   └─ rejeita com 400 se inválido

5. UsersController.create(dto)
   └─ delega para UsersService.create(dto)

6. UsersService.create(dto)        [span: users.create]
   └─ validateUserOrThrow(dto)
      └─ Email.isValid(email)
      └─ verifica name.trim()
      └─ lança 422 se inválido
   └─ UsersRepository.create(dto) [span: users.repository.create, counter: db.users.created.total]
      └─ TypeORM: INSERT INTO users ...
      └─ retorna UserModel
   └─ loga: "create: usuário criado id=... email=..."
   └─ retorna UserModel

7. UsersController
   └─ toUserPresenter(user) → { id, name, email, createdAt, updatedAt }
   └─ responde 201 Created

8. RequestLoggerMiddleware (on finish)
   └─ loga: "POST /users 201 45ms — ip=... ua=... cid=..."
```

---

## Erros e Códigos HTTP

| Situação | Status | Quem lança |
|----------|--------|------------|
| API key ausente ou inválida | `401 Unauthorized` | `ApiKeyGuard` |
| Body inválido (validação DTO) | `400 Bad Request` | `ValidationPipe` |
| Dados inválidos (regra de domínio) | `422 Unprocessable Entity` | `validateUserOrThrow()` / `UsersService` |
| Recurso não encontrado | `404 Not Found` | `UsersService` / `AppointmentService` |
| E-mail já cadastrado | `409 Conflict` | `UsersService.handleSaveError()` (código PG `23505`) |
| Usuário com vínculos (não pode remover) | `422 Unprocessable Entity` | `UsersService.remove()` (código PG `23503`) |
| Erro interno simulado | `500` / `502` | `DebugController` (para testes de observabilidade) |

**Formato padrão de erro:**
```json
{
  "statusCode": 404,
  "timestamp": "2026-03-15T10:30:00.000Z",
  "path": "/users/abc-123",
  "message": "Usuário abc-123 não encontrado"
}
```

---

## Instrumentação de Observabilidade no Domínio

### Decorators `@TraceService` e `@TraceRepository`

Implementados em `common/decorators/trace.decorator.ts`. Envolvem automaticamente os métodos configurados com spans OpenTelemetry e métricas Prometheus.

**O que cada decorator faz por método instrumentado:**

1. Abre um **span ativo** com nome `{prefixo}.{método}`
2. Adiciona **atributos configurados** ao span (ex: `user.id`, `db.query.skip`)
3. Registra a **duração** em um histogram: `{prefixo}.operation.duration_ms` ou `{prefixo}.query.duration_ms`
4. Em **sucesso**: incrementa o counter configurado (se houver)
5. Em **erro**: chama `span.recordException()` + `SpanStatus.ERROR`
6. Sempre fecha o span no `finally`

**Spans gerados pelo domínio:**

| Span | Tipo | Contador associado |
|------|------|--------------------|
| `users.findAll` | Service | — |
| `users.findOne` | Service | — |
| `users.create` | Service | `users.created.total` |
| `users.update` | Service | — |
| `users.remove` | Service | `users.deleted.total` |
| `users.repository.findPaginated` | Repository | — |
| `users.repository.findOne` | Repository | — |
| `users.repository.findByEmail` | Repository | — |
| `users.repository.create` | Repository | `db.users.created.total` |
| `users.repository.update` | Repository | — |
| `users.repository.remove` | Repository | `db.users.removed.total` |
| `appointments.findAll` | Service | — |
| `appointments.findOne` | Service | — |
| `appointments.create` | Service | `appointments.created.total` |
| `appointments.update` | Service | — |
| `appointments.remove` | Service | `appointments.deleted.total` |
| `appointments.repository.create` | Repository | `db.appointments.created.total` |
| `appointments.repository.remove` | Repository | `db.appointments.removed.total` |

**Atributos adicionados ao span HTTP** (`CorrelationIdMiddleware`):
- `http.request.correlation_id` — propaga o ID de correlação entre serviços

**Atributos adicionados pelo `HttpExceptionFilter`:**
- `http.response.status_code` — status code da resposta
- `exception` (via `recordException`) — para erros 5xx

---

## Frontend — Web (Next.js)

O frontend consome a API via **Server Actions** (executadas no servidor Next.js).

### Server Actions — `web/app/users/actions.ts`

| Função | Método HTTP | Endpoint | Revalidação |
|--------|-------------|----------|-------------|
| `getUsers(page, limit)` | GET | `/users?page=&limit=` | — (cache: no-store) |
| `createUser(data)` | POST | `/users` | `revalidatePath('/users')` |
| `updateUser(id, data)` | PUT | `/users/:id` | `revalidatePath('/users')` |
| `deleteUser(id)` | DELETE | `/users/:id` | `revalidatePath('/users')` |

- Todas as ações retornam `{ error?: string }` em caso de falha, sem lançar exceções para o cliente.
- A URL da API é configurada via variável de ambiente `API_URL` (padrão: `http://localhost:8088`).
- Não inclui o header `x-api-key` nas chamadas (a comunicação é interna, container-to-container via rede Docker).

### Server Actions — `web/app/dashboard/actions.ts`

Acessa o **OpenSearch diretamente** (não passa pela API) para consultas de observabilidade:

| Função | Índice OpenSearch | O que retorna |
|--------|-------------------|---------------|
| `getServices()` | `ss4o_traces-otel-aplicacao-example` | Lista de serviços ativos |
| `getServiceCapabilities(name)` | `ss4o_traces-otel-aplicacao-example` | Se o serviço tem operações de users/appointments |
| `getKpis(from, to, service?)` | `ss4o_traces-otel-aplicacao-example` | KPIs: requests, erros, latência, operações por entidade |
| `getRequestsOverTime(...)` | `ss4o_traces-otel-aplicacao-example` | Volume de requests por intervalo de tempo |
| `getLatencyOverTime(...)` | `ss4o_traces-otel-aplicacao-example` | Latência p50/p95/p99 ao longo do tempo |
| `getStatusOverTime(...)` | `ss4o_traces-otel-aplicacao-example` | Distribuição 2xx/4xx/5xx ao longo do tempo |
| `getLogCountOverTime(...)` | `docker-logs` | Volume de logs por container |
| `getThroughputByMethod(...)` | `ss4o_traces-otel-aplicacao-example` | Throughput por método HTTP |
| `getLatencyByRoute(...)` | `ss4o_traces-otel-aplicacao-example` | Latência p95 por rota |
| `getLatencyByRouteOverTime(...)` | `ss4o_traces-otel-aplicacao-example` | Latência média das top 5 rotas ao longo do tempo |
| `getOpDistribution(...)` | `ss4o_traces-otel-aplicacao-example` | Distribuição de operações (nome do span) |
| `getTopEndpoints(...)` | `ss4o_traces-otel-aplicacao-example` | Top endpoints: requests, avg e p95 de latência |
| `getAppointmentsOverTime(...)` | `ss4o_traces-otel-aplicacao-example` | Operações de agendamentos ao longo do tempo |

**Intervalo automático de agregação** (`autoInterval`):

| Janela de tempo | Intervalo dos buckets |
|-----------------|-----------------------|
| até 30 min | 1 minuto |
| até 3 horas | 5 minutos |
| até 12 horas | 15 minutos |
| até 2 dias | 30 minutos |
| até 14 dias | 3 horas |
| acima | 12 horas |

### Tipos de resposta compartilhados (web)

```typescript
// Usuário (espelha o UserPresenter da API)
interface User {
  id: string
  name: string
  email: string
  createdAt: string  // ISO 8601
  updatedAt: string  // ISO 8601
}

// Paginação
interface PaginatedUsers {
  data: User[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Ponto de série temporal (dashboard)
interface TimePoint {
  time: string       // ex: "14:30" ou "15/03 14:30"
  [key: string]: number | string  // campos dinâmicos por serviço/método/container
}
```
