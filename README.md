# Docker Observabilidade

Stack completa de **observabilidade** baseada em Docker Compose, com uma aplicação de exemplo instrumentada (NestJS + Next.js) e toda a pipeline de coleta, armazenamento e visualização de métricas, traces e logs.

---

## Sumário

- [Arquitetura](#arquitetura)
- [Serviços e Portas](#serviços-e-portas)
- [Fluxo de Dados](#fluxo-de-dados)
- [Pilares de Observabilidade](#pilares-de-observabilidade)
- [Como Rodar](#como-rodar)
- [Scripts](#scripts)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [API — Endpoints](#api--endpoints)
- [Autenticação](#autenticação)
- [Dashboard Web](#dashboard-web)
- [Testes](#testes)
- [Documentação](#documentação)

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Aplicação Exemplo                        │
│                                                                 │
│   ┌──────────────┐          ┌──────────────────────────────┐   │
│   │  web (Next.js│──API──→ │  api (NestJS + OpenTelemetry │   │
│   │  port 3000)  │          │  port 8088 / metrics 9465)   │   │
│   └──────────────┘          └──────────┬─────────────────--┘   │
│                                        │ OTLP/gRPC              │
└────────────────────────────────────────│──────────────────────--┘
                                         ▼
                          ┌──────────────────────────┐
                          │   otel-collector          │
                          │   gRPC :4317 / HTTP :4318 │
                          └────┬──────────┬───────────┘
               Traces/Logs     │          │  Métricas
            ┌──────────────────┤          ├──────────────────────┐
            ▼                  ▼          ▼                      │
       ┌─────────┐   ┌────────────────┐  ┌──────────────┐       │
       │  Jaeger │   │  data-prepper  │  │  Prometheus   │       │
       │  :16686 │   │  :21890        │  │  :9292        │       │
       └─────────┘   └───────┬────────┘  └──────┬────────┘       │
                             │ Traces             │ scrape        │
                             ▼                   ▼               │
                      ┌────────────────────────────────────┐     │
                      │           OpenSearch :9200          │     │
                      │  índices: traces / logs / métricas  │     │
                      └────────────────────────────────────┘     │
                             ▲                                    │
                             │ logs (docker)                      │
                      ┌──────────────┐                            │
                      │  Fluent Bit  │◄── todos os containers     │
                      │  :24224      │                            │
                      └──────────────┘                            │
                                                                  │
                      ┌──────────────────────────────────────┐   │
                      │  Grafana :3001                        │   │
                      │  datasources: Prometheus + OpenSearch │   │
                      └──────────────────────────────────────┘   │
```

---

## Serviços e Portas

| Serviço                   | Porta(s) no host       | Descrição                                            |
|---------------------------|------------------------|------------------------------------------------------|
| **web**                   | `3000`                 | Frontend Next.js (dashboard + CRUD de usuários)      |
| **api**                   | `8088` / `9465`        | API NestJS (app em `:8082` interno, métricas `:9464`)|
| **otel-collector**        | `4317`, `4318`, `8889` | OTel Collector (gRPC, HTTP, Prometheus scrape)       |
| **jaeger**                | `16686`, `14250`       | UI de traces distribuídos                            |
| **data-prepper**          | `21890`                | Processa traces OTLP → OpenSearch                    |
| **opensearch**            | `9200`, `9600`         | Motor de busca/armazenamento de observabilidade      |
| **opensearch-dashboards** | `5601`                 | UI do OpenSearch                                     |
| **prometheus**            | `9292`                 | Banco de séries temporais de métricas                |
| **grafana**               | `3001`                 | Dashboards (acesso anônimo, role Admin)              |
| **fluent-bit**            | `24224`                | Agregador de logs de todos os containers             |
| **postgres**              | `5432`                 | Banco de dados da aplicação                          |
| **cadvisor**              | `8080`                 | Métricas de containers Docker                        |
| **postgres-exporter**     | `9187`                 | Métricas do PostgreSQL para o Prometheus             |

---

## Fluxo de Dados

### Traces

```
api ──OTLP/gRPC──► otel-collector:4317
                          │
               ┌──────────┴──────────┐
               ▼                     ▼
           Jaeger               data-prepper:21890
                                      │
                                      ▼
                             OpenSearch (ss4o_traces-otel-aplicacao-example)
```

### Métricas

```
api:9464 ──scrape──► Prometheus:9292 ◄──scrape── cadvisor, postgres-exporter
otel-collector:8889 ──scrape──►/
                               │
                               ▼
                           Grafana:3001
```

### Logs

```
todos os containers ──fluentd driver──► fluent-bit:24224 ──► OpenSearch (docker-logs)
api ──OTLP logs──► otel-collector ──► OpenSearch (ss4o_logs-otel-demo)
```

---

## Pilares de Observabilidade

| Pilar    | Ferramenta                | URL                    |
|----------|---------------------------|------------------------|
| Traces   | Jaeger                    | http://localhost:16686 |
| Traces   | OpenSearch Dashboards     | http://localhost:5601  |
| Logs     | OpenSearch Dashboards     | http://localhost:5601  |
| Métricas | Grafana                   | http://localhost:3001  |
| Métricas | Prometheus                | http://localhost:9292  |

> Leia mais: [`docs/pilares-observabilidade.md`](docs/pilares-observabilidade.md)

---

## Como Rodar

### Pré-requisitos

- Docker e Docker Compose v2+
- Node.js >= 20 e npm
- Mínimo **6 GB de RAM** disponível para o Docker

### Configurar e subir o ambiente

```bash
git clone <repo>
cd docker-observabilidade

# 1. Configura .envs, instala dependências e cria banco de testes
./scripts/setup.sh

# 2. Sobe toda a stack de observabilidade
docker compose up -d
```

Na primeira execução:
- `opensearch-init` cria índices e templates necessários
- `opensearch-dashboards-init` importa dashboards automaticamente
- A API roda as migrations do banco de dados na inicialização

### Desenvolver a API fora do Docker

```bash
cd api
# Sobe apenas as dependências necessárias
docker compose up -d postgres otel-collector
npm run start:dev
```

### Comandos úteis

```bash
docker compose ps                      # status dos containers
docker compose logs -f api             # logs da API em tempo real
docker compose logs -f web
docker compose down                    # para tudo (mantém volumes)
docker compose down -v                 # para tudo e remove volumes
```

---

## Scripts

O projeto tem dois scripts em `scripts/` que automatizam as tarefas mais comuns.

### `scripts/setup.sh` — Configuração do ambiente

Prepara o ambiente local do zero:

```bash
./scripts/setup.sh
```

| Etapa | O que faz |
|---|---|
| Pré-requisitos | Valida docker, node (≥ 20) e npm |
| Arquivos `.env` | Cria `.env` e `api/.env` a partir dos `.env.example` se não existirem |
| Dependências | Executa `npm install` em `api/` e `web/` |
| Postgres | Sobe o container via `docker compose up -d postgres` se necessário |
| Banco de testes | Cria o banco `postgres_test` se não existir |

### `scripts/test.sh` — Execução de testes

Roda todas as suites de testes com sumário final:

```bash
./scripts/test.sh              # roda tudo (API + Web)
./scripts/test.sh api          # todas as suites da API
./scripts/test.sh web          # só o Web
./scripts/test.sh api:unit     # só unitários da API
./scripts/test.sh api:integration
./scripts/test.sh api:e2e
./scripts/test.sh api:stress
```

**Requer postgres em execução.** Execute `./scripts/setup.sh` antes se necessário.

---

## Variáveis de Ambiente

> **Obrigatório:** os arquivos `.env` precisam existir antes de subir qualquer serviço.
> O `setup.sh` cria automaticamente. Para criar manualmente:
>
> ```bash
> cp .env.example .env
> cp api/.env.example api/.env
> ```

### Raiz (`docker-compose`)

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=observability

API_KEY=api-secret-key

OPENSEARCH_INITIAL_ADMIN_PASSWORD=ChangeMe_OpenSearch_2026!9
```

### API (`api/.env`)

```env
PORT=8082
NODE_ENV=development
APP_NAME=aplication-exemple-api

OTEL_SERVICE_NAME=aplication-exemple-api
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=observability

API_KEY=api-secret-key
```

### Web (`web/.env`)

```env
OTEL_SERVICE_NAME=aplication-exemple-web
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

OPENSEARCH_URL=http://localhost:9200
API_URL=http://localhost:8082
```

---

## API — Endpoints

Documentação Swagger interativa disponível em `http://localhost:8088/docs`.

### Usuários — `/users`

| Método   | Rota         | Descrição                                 |
|----------|--------------|-------------------------------------------|
| `GET`    | `/users`     | Listar com paginação (`?page=1&limit=10`) |
| `GET`    | `/users/:id` | Buscar por UUID                           |
| `POST`   | `/users`     | Criar usuário                             |
| `PUT`    | `/users/:id` | Atualizar usuário                         |
| `DELETE` | `/users/:id` | Remover usuário                           |

### Agendamentos — `/appointments`

| Método   | Rota                | Descrição             |
|----------|---------------------|-----------------------|
| `GET`    | `/appointments`     | Listar todos          |
| `GET`    | `/appointments/:id` | Buscar por UUID       |
| `POST`   | `/appointments`     | Criar agendamento     |
| `PUT`    | `/appointments/:id` | Atualizar agendamento |
| `DELETE` | `/appointments/:id` | Remover agendamento   |

### Outros

| Método | Rota               | Descrição                                      |
|--------|--------------------|------------------------------------------------|
| `GET`  | `/`                | Health check da API                            |
| `GET`  | `/health`          | Health check detalhado (db, memória, disco)    |
| `GET`  | `/debug/error/500` | Força erro 500 (para testes de observabilidade)|
| `GET`  | `/debug/error/502` | Força erro 502 (para testes de observabilidade)|

> Leia mais: [`docs/health-check.md`](docs/health-check.md) · [`docs/domain.md`](docs/domain.md)

---

## Autenticação

Todas as rotas (exceto `/`, `/health` e `/docs`) exigem o header `x-api-key`:

```bash
curl -H "x-api-key: api-secret-key" http://localhost:8088/users
```

O valor padrão é `api-secret-key`. Para alterar, defina `API_KEY` no `.env`.

---

## Dashboard Web

Acesse em `http://localhost:3000`.

### `/dashboard` — Observabilidade em tempo real

Dados consultados diretamente do OpenSearch via SSR (Next.js Server Components):

| Seção                      | O que mostra                                                         |
|----------------------------|----------------------------------------------------------------------|
| KPIs                       | Total de requests, erros, latência média, p95, taxa de erros         |
| Requests ao longo do tempo | Volume de requests por serviço                                       |
| Latência                   | Percentis p50, p95, p99 ao longo do tempo                            |
| Status HTTP                | Distribuição 2xx / 4xx / 5xx                                         |
| Throughput por método      | GET / POST / PUT / DELETE ao longo do tempo                          |
| Latência por rota          | Top 5 rotas por latência média                                       |
| Top Endpoints              | Ranking por volume, latência avg e p95                               |
| Logs por container         | Volume de logs de cada container                                     |
| Operações de agendamentos  | Criações, visualizações, atualizações, remoções                      |

Filtros: intervalo de tempo (15m até 30d), seleção de serviço e auto-refresh configurável.

> Leia mais: [`docs/decisao-arquitetura-nextjs-ssr.md`](docs/decisao-arquitetura-nextjs-ssr.md)

### `/users` — Gerenciamento de Usuários

CRUD completo com paginação.

---

## Testes

```bash
./scripts/test.sh     # roda tudo e exibe o sumário
```

### Suites da API

| Suite | Comando | Descrição | Testes |
|---|---|---|---|
| Unitários | `npm test` | Serviços e guards com mocks | 71 |
| Integração | `npm run test:integration` | Pipeline NestJS com banco mockado | 55 |
| E2E | `npm run test:e2e` | Endpoints reais contra `postgres_test` | 61 |
| Stress | `npm run test:stress` | Carga concorrente (50–100 req/s) | 8 |

### Suites do Web

| Suite | Comando | Descrição | Testes |
|---|---|---|---|
| Unitários | `npm test` | Componentes React e server actions | 50 |

### Rodar individualmente (dentro do diretório)

```bash
# API
cd api
npm test                    # unitários
npm run test:integration    # integração
npm run test:e2e            # e2e
npm run test:stress         # stress

# Web
cd web
npm test
```

> Leia mais: [`docs/testes.md`](docs/testes.md)

---

## Documentação

| Documento | Descrição |
|---|---|
| [`docs/testes.md`](docs/testes.md) | Estratégia de testes da API: ferramentas, camadas, mocks e como executar |
| [`docs/domain.md`](docs/domain.md) | Entidades, regras de negócio, camadas e fluxos da API e do frontend |
| [`docs/pilares-observabilidade.md`](docs/pilares-observabilidade.md) | Conceitos dos três pilares (traces, métricas, logs) e como estão implementados |
| [`docs/opentelemetry-config.md`](docs/opentelemetry-config.md) | Configuração do OpenTelemetry na API e no Web: variáveis, SDK e instrumentação |
| [`docs/health-check.md`](docs/health-check.md) | Endpoints de health check, indicadores verificados e integração com orquestradores |
| [`docs/decisao-arquitetura-nextjs-ssr.md`](docs/decisao-arquitetura-nextjs-ssr.md) | ADR-001: decisão de usar SSR (Server Components) para acessar o OpenSearch |
| [`stress-test/README.md`](stress-test/README.md) | Guia de testes de estresse com k6 |
