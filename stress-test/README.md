# Stress Tests com k6

Testes de carga e stress para a API, executados **direto na `api`** (sem load balancer).

```
[k6] --> [api:8082]
```

> O nginx (lb) está desativado. Todos os testes apontam direto para `api`.

---

## Tipos de teste

| Script | Objetivo | VUs | Duracao |
|---|---|---|---|
| `smoke.js` | Sanidade basica, todos os endpoints | 2 | ~1min |
| `load.js` | Carga normal/esperada de producao | ate 30 | ~4min |
| `stress.js` | Stress gradual crescente | ate 250 | ~6min |
| `spike.js` | Pico repentino de trafego | ate 200 | ~2min30 |
| `breakpoint.js` | **Descobre o maximo da api** — sobe ate 150 VUs ou colapso | ate 150 | ~5min |

---

## Breakpoint — como funciona

O `breakpoint.js` e o teste principal para descobrir **ate onde a api aguenta** com os recursos atuais:

```
api:     0.3 vCPU  /  500m RAM
postgres: 0.5 vCPU  /  256m RAM  /  max_connections=100
poolSize: 20 conexoes
```

**Estrategia de rampa:**

| Stage | VUs | Duracao | O que observar |
|---|---|---|---|
| Aquecimento | 5 | 20s | JIT aquecendo, primeiras metricas |
| Carga leve | 10 | 30s | Baseline estavel |
| Pressao inicial | 20 | 30s | Pool de conexoes comecando a encher |
| Stress moderado | 30 | 30s | CPU comecando a saturar |
| Stress alto | 40 | 30s | Latencia sobe, filas no pool |
| Zona de risco | 50 | 30s | CPU provavelmente saturada |
| Sobrecarga | 75 | 30s | Erros esperados aqui |
| Ruptura esperada | 100 | 30s | Pool esgotado (53300 too many clients) |
| Colapso | 150 | 30s | Confirma o limite maximo |
| Cool-down | 0 | 20s | — |

O teste **nao aborta cedo** — deixa o app degradar naturalmente. So cancela se >50% de erros (colapso total) ou p99 > 30s (sistema morto).

**Como interpretar o resultado:**

- `0% erros` → api aguentou 150 VUs; aumente os limites de CPU/RAM para achar o real teto
- `<1% erros` → chegou perto do limite; o stage anterior e o ponto de escala
- `1–5% erros` → degradacao detectada; veja nos logs `[5xx]` em qual VU count comecou
- `5–20% erros` → ruptura encontrada; o stage anterior ao primeiro erro e o limite seguro
- `>20% erros` → colapso total; precisa escalar (mais instancias, mais CPU, pgBouncer)

---

## Pre-requisito

O stack principal deve estar rodando:

```bash
docker compose up -d
```

---

## Opcao 1: Rodar via Docker (recomendado)

O k6 roda dentro da rede Docker e acessa `api` pelo nome de servico.

```bash
# Smoke test (validacao basica — sempre rode esse primeiro)
docker compose -f stress-test/docker-compose.k6.yml run --rm \
  -e BASE_URL=http://api:8082 k6 run /scripts/smoke.js

# Load test (carga normal)
docker compose -f stress-test/docker-compose.k6.yml run --rm \
  -e BASE_URL=http://api:8082 k6 run /scripts/load.js

# Stress test (pressao crescente)
docker compose -f stress-test/docker-compose.k6.yml run --rm \
  -e BASE_URL=http://api:8082 k6 run /scripts/stress.js

# Spike test (pico repentino)
docker compose -f stress-test/docker-compose.k6.yml run --rm \
  -e BASE_URL=http://api:8082 k6 run /scripts/spike.js

# Breakpoint test — descobre o maximo da api
docker compose -f stress-test/docker-compose.k6.yml run --rm \
  -e BASE_URL=http://api:8082 k6 run /scripts/breakpoint.js
```

> Sempre use `--rm` para garantir que o container k6 seja removido apos o teste.

---

## Opcao 2: Rodar localmente (k6 instalado na maquina)

A `api` esta exposta na porta `8081` do host.

```bash
# Smoke test
BASE_URL=http://localhost:8088 k6 run stress-test/scripts/smoke.js

# Load test
BASE_URL=http://localhost:8088 k6 run stress-test/scripts/load.js

# Stress test
BASE_URL=http://localhost:8088 k6 run stress-test/scripts/stress.js

# Spike test
BASE_URL=http://localhost:8088 k6 run stress-test/scripts/spike.js

# Breakpoint test
BASE_URL=http://localhost:8088 k6 run stress-test/scripts/breakpoint.js
```

### Instalar k6 (macOS)

```bash
brew install k6
```

---

## Monitorar em tempo real

Enquanto o teste roda, acompanhe nos dashboards:

| Servico | URL | O que observar |
|---|---|---|
| **Grafana** | http://localhost:3001 | Latencia (P95/P99), taxa de erro, throughput, DB connections pending |
| **Tempo** | http://localhost:3200 | Traces — spans de requisicoes lentas |
| **Prometheus** | http://localhost:9292 | Metricas brutas em tempo real |
| **OpenSearch** | http://localhost:5601 | Logs dos containers |

**Metricas-chave no Grafana para o breakpoint:**

- `P95 Latencia Atual` — sobe antes dos erros aparecerem
- `DB Connections Pending` — pool cheio = gargalo no banco
- `Taxa de Erro Atual` — dispara quando o pool esgota (codigo 53300)
- `Throughput (req/s)` — o pico antes da queda e o throughput maximo real

---

## Endpoints testados

| Metodo | Rota | Mix | Descricao |
|---|---|---|---|
| GET | `/` | 10% | Health check — primeiro a falhar em colapso |
| GET | `/users` | 45% | Lista paginada — leitura simples |
| GET | `/users/:id` | 15% | Busca por ID — leitura pontual |
| POST | `/users` | 30% | Cria usuario — grava no postgres, pressiona o pool |

---

## Thresholds configurados

| Script | Aborta se | Objetivo |
|---|---|---|
| `smoke.js` | qualquer erro 5xx | Validar que tudo funciona |
| `load.js` | >0% erros ou p95>2.5s | Carga sustentavel normal |
| `stress.js` | >5% erros | Limite de stress aceitavel |
| `spike.js` | >5% erros | Resiliencia a picos |
| `breakpoint.js` | >50% erros ou p99>30s | So para em colapso total |

---

## Como escalar quando encontrar o limite

Quando o breakpoint mostrar onde o app quebra, as opcoes sao:

1. **Mais instancias** — adicionar novas instancias de `api` no `docker-compose.yml` com um load balancer na frente
2. **Mais CPU/RAM** — aumentar os limites de `deploy.resources` na `api`
3. **Pool maior** — aumentar `poolSize` no `app.module.ts` (respeitando `max_connections` do postgres)
4. **pgBouncer** — connection pooler na frente do postgres para suportar mais conexoes
5. **Cache** — adicionar uma camada de cache para queries de leitura (`GET /users`, `GET /users/:id`)
