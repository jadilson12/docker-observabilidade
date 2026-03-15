# Health Check — API

Este documento descreve os endpoints de health check da API, os indicadores verificados em cada rota e como integrá-los com orquestradores de container.

---

## Endpoints

| Rota | Método | Autenticação | Finalidade |
|---|---|---|---|
| `/health` | GET | Não | Verificação completa — database, memória e disco |
| `/health/liveness` | GET | Não | Liveness probe — processo está vivo |
| `/health/readiness` | GET | Não | Readiness probe — pronto para receber tráfego |

Todas as rotas são públicas (sem `x-api-key`) e usam `VERSION_NEUTRAL` — não recebem o prefixo `/v1/`.

---

## `GET /health` — Check completo

Verifica todos os indicadores críticos da aplicação.

### Indicadores

| Indicador | Tipo | Critério de falha |
|---|---|---|
| `database` | TypeORM ping | PostgreSQL não responde |
| `memory_heap` | Heap do processo Node.js | Heap > 300 MB |
| `disk` | Espaço em disco (`/`) | Uso > 90% |

### Resposta — sucesso (`200 OK`)

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "memory_heap": { "status": "up" },
    "disk": { "status": "up" }
  },
  "error": {},
  "details": {
    "database": { "status": "up" },
    "memory_heap": { "status": "up" },
    "disk": { "status": "up" }
  }
}
```

### Resposta — falha (`503 Service Unavailable`)

```json
{
  "status": "error",
  "info": {
    "memory_heap": { "status": "up" },
    "disk": { "status": "up" }
  },
  "error": {
    "database": {
      "status": "down",
      "message": "connect ECONNREFUSED 127.0.0.1:5432"
    }
  },
  "details": {
    "database": { "status": "down", "message": "connect ECONNREFUSED 127.0.0.1:5432" },
    "memory_heap": { "status": "up" },
    "disk": { "status": "up" }
  }
}
```

---

## `GET /health/liveness`

Confirma que o processo Node.js está de pé e respondendo. Não verifica dependências externas.

Usada por orquestradores para decidir se o container deve ser **reiniciado**.

### Resposta — sempre `200 OK`

```json
{ "status": "ok" }
```

---

## `GET /health/readiness`

Verifica se a aplicação está pronta para receber requisições — confirma que o banco de dados está acessível.

Usada por orquestradores para decidir se o container deve **receber tráfego**.

### Resposta — sucesso (`200 OK`)

```json
{
  "status": "ok",
  "info": { "database": { "status": "up" } },
  "error": {},
  "details": { "database": { "status": "up" } }
}
```

### Resposta — falha (`503 Service Unavailable`)

```json
{
  "status": "error",
  "info": {},
  "error": { "database": { "status": "down", "message": "..." } },
  "details": { "database": { "status": "down", "message": "..." } }
}
```

---

## Diferença entre liveness e readiness

| | Liveness | Readiness |
|---|---|---|
| **O que verifica** | Processo está vivo | Dependências acessíveis |
| **Falha significa** | Reiniciar o container | Remover do load balancer |
| **Dependências externas** | Não | Sim (PostgreSQL) |
| **Rota** | `/health/liveness` | `/health/readiness` |

---

## Integração com Docker Compose

```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -fs http://localhost:8082/health/liveness || exit 1"]
  interval: 10s
  timeout: 3s
  retries: 5
  start_period: 15s
```

> Use `/health/liveness` no `healthcheck` do Docker — é rápido e sem dependências. Reserve `/health/readiness` para o load balancer ou orquestrador.

---

## Integração com Kubernetes

```yaml
livenessProbe:
  httpGet:
    path: /health/liveness
    port: 8082
  initialDelaySeconds: 15
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/readiness
    port: 8082
  initialDelaySeconds: 10
  periodSeconds: 5
```

---

## HTTP Status Codes

| Status | Significado |
|---|---|
| `200 OK` | Todos os indicadores verificados estão `up` |
| `503 Service Unavailable` | Um ou mais indicadores estão `down` |
