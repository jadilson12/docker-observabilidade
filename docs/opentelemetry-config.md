# Configuração OpenTelemetry — API e Web

Este documento descreve como o OpenTelemetry está configurado em cada serviço, quais variáveis de ambiente controlam o comportamento e como ativar/desativar a instrumentação.

---

## Visão Geral

```
web (Next.js)          api (NestJS)
     │                      │
     │ OTLP/HTTP :4318       │ OTLP/gRPC :4317
     └──────────┬────────────┘
                ▼
        otel-collector
         ┌──────┴──────┐
         ▼             ▼
    data-prepper    Tempo → Grafana
         │
         ▼
      OpenSearch
```

- **Web** exporta apenas **traces** via OTLP/HTTP
- **API** exporta **traces**, **logs** e **métricas** via OTLP/gRPC, além de expor métricas no formato Prometheus

---

## API (NestJS)

### Arquivo: `api/src/telemetry.ts`

A instrumentação é inicializada antes do NestJS subir, no topo de `main.ts`:

```ts
import 'dotenv/config';
import { validateEnv } from './config/env';
validateEnv(process.env); // valida todas as vars obrigatórias

import { initTelemetry } from './telemetry';
void initTelemetry();
```

### O que é instrumentado automaticamente

| Instrumentação | Pacote |
|---|---|
| HTTP (Express) | `@opentelemetry/instrumentation-http` |
| Express routes | `@opentelemetry/instrumentation-express` |
| PostgreSQL | `@opentelemetry/instrumentation-pg` |

Além disso, o `x-correlation-id` presente no header da request é propagado como atributo `http.request.correlation_id` em todos os spans.

### Sinais exportados

| Sinal | Exporter | Destino |
|---|---|---|
| Traces | `OTLPTraceExporter` (gRPC) | `OTEL_EXPORTER_OTLP_ENDPOINT` |
| Logs | `OTLPLogExporter` (gRPC) | `OTEL_EXPORTER_OTLP_ENDPOINT` |
| Métricas | `PrometheusExporter` | `http://localhost:OTEL_PROMETHEUS_PORT/metrics` |

### Variáveis de ambiente

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `OTEL_SDK_DISABLED` | não | `false` | `true` desabilita todo o SDK nativamente |
| `OTEL_SERVICE_NAME` | não* | — | Nome do serviço nos traces. Usa `APP_NAME` como fallback |
| `APP_NAME` | **sim** | — | Nome da aplicação. Usado como fallback para `OTEL_SERVICE_NAME` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | **sim** | — | Endpoint gRPC do collector (ex: `http://otel-collector:4317`) |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | não | `grpc` | Protocolo do exporter |
| `OTEL_PROMETHEUS_PORT` | não | `9464` | Porta para scrape de métricas pelo Prometheus |

> *`OTEL_SERVICE_NAME` é opcional pois `APP_NAME` é obrigatório e serve de fallback.

### Validação de ambiente

As variáveis são validadas via **Zod** em `api/src/config/env.ts` na inicialização. Se qualquer variável obrigatória estiver ausente, a aplicação termina imediatamente com uma mensagem clara:

```
Environment validation failed:
  - OTEL_EXPORTER_OTLP_ENDPOINT: OTEL_EXPORTER_OTLP_ENDPOINT is required. Add it to your .env file (see api/.env.example).
```

### Desligar telemetria

```env
OTEL_SDK_DISABLED=true
```

O SDK retorna implementações no-op sem necessidade de alterar código.

---

## Web (Next.js)

### Arquivo: `web/instrumentation.ts`

O Next.js chama `register()` automaticamente ao iniciar o servidor Node.js graças à integração nativa com a [Instrumentation API](https://nextjs.org/docs/app/guides/open-telemetry). Não é necessário importar nem chamar nada manualmente.

```ts
// next.config.ts ou next.config.js — habilitar instrumentation hook
experimental: {
  instrumentationHook: true, // necessário em versões < Next.js 15
}
```

> A partir do Next.js 15, `instrumentationHook` está habilitado por padrão.

### O que é instrumentado automaticamente

O `getNodeAutoInstrumentations()` ativa todos os instrumentadores padrão do Node.js, exceto `@opentelemetry/instrumentation-fs` (desabilitado para evitar ruído).

Inclui automaticamente: HTTP, fetch, DNS, gRPC, entre outros.

### Sinais exportados

| Sinal | Exporter | Destino |
|---|---|---|
| Traces | `OTLPTraceExporter` (HTTP) | `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces` |

> O web exporta apenas traces. Logs e métricas não estão configurados.

### Variáveis de ambiente

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `OTEL_SDK_DISABLED` | não | `false` | `true` desabilita todo o SDK nativamente |
| `OTEL_SERVICE_NAME` | **sim** | — | Nome do serviço nos traces |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | **sim** | — | Endpoint HTTP do collector (ex: `http://otel-collector:4318`) |

### Desligar telemetria

```env
OTEL_SDK_DISABLED=true
```

---

## Diferenças entre API e Web

| Aspecto | API (NestJS) | Web (Next.js) |
|---|---|---|
| Protocolo | gRPC (porta `4317`) | HTTP (porta `4318`) |
| Sinais | Traces + Logs + Métricas | Traces |
| Inicialização | Manual — `initTelemetry()` em `main.ts` | Automática via `instrumentation.ts` |
| Validação de env | Zod (`api/src/config/env.ts`) | Manual com `throw` em `instrumentation.ts` |
| Métricas Prometheus | Sim — porta `OTEL_PROMETHEUS_PORT` | Não |

---

## Configuração local (desenvolvimento)

### `api/.env`

```env
OTEL_SDK_DISABLED=false
OTEL_SERVICE_NAME=aplication-exemple-api
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc
```

### `web/.env`

```env
OTEL_SDK_DISABLED=false
OTEL_SERVICE_NAME=aplication-exemple-web
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

> Para desenvolvimento sem o stack de observabilidade rodando, basta setar `OTEL_SDK_DISABLED=true` para evitar erros de conexão.
