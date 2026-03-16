# Os Pilares da Observabilidade

## O que e Observabilidade?

Observabilidade e a capacidade de compreender o estado interno de um sistema a partir de suas saidas externas. O termo vem da teoria de controle de sistemas e foi popularizado no contexto de software por Charity Majors e a equipe da Honeycomb.

A diferenca fundamental entre **monitoramento** e **observabilidade** e que monitoramento responde perguntas que voce ja sabe que vai precisar fazer ("o servico esta fora do ar?"), enquanto observabilidade permite responder perguntas que voce ainda nao sabe que vai precisar fazer ("por que 3% dos usuarios de Sao Paulo estao com latencia alta apenas nas sextas a noite?").

> **Regra geral:** Um sistema e observavel quando voce consegue debugar qualquer problema sem precisar adicionar novo codigo de instrumentacao.

---

## Os Tres Pilares

A observabilidade moderna e sustentada por tres tipos de dados complementares, conhecidos como os **tres pilares**:

```
                    +---------------------+
                    |   OBSERVABILIDADE   |
                    +---------------------+
                   /          |            \
                  /           |             \
         +-------+       +--------+      +-------+
         | LOGS  |       |METRICAS|      |TRACES |
         +-------+       +--------+      +-------+
```

---

## 1. Logs

### O que sao?

Logs sao **registros textuais de eventos** que ocorreram em um sistema em um determinado momento no tempo. Sao a forma mais antiga e intuitiva de instrumentacao.

### Caracteristicas

- **Imutaveis:** Uma vez escritos, nao mudam
- **Discretos:** Representam um evento especifico no tempo
- **Verbosos:** Podem conter grande quantidade de detalhe contextual
- **Estruturados ou nao-estruturados:** Podem ser texto livre ou JSON/key-value

### Tipos de Logs

| Tipo                  | Descricao                                                 | Exemplo                                                   |
| --------------------- | --------------------------------------------------------- | --------------------------------------------------------- |
| **Structured Logs**   | Formato padronizado (JSON) facil de parsear               | `{"level":"error","msg":"DB timeout","duration_ms":5001}` |
| **Unstructured Logs** | Texto livre, legivel por humanos mas dificil de consultar | `[ERROR] 2024-01-15 DB connection timed out after 5001ms` |
| **Application Logs**  | Eventos gerados pela aplicacao                            | Erros, avisos, info de negocio                            |
| **System Logs**       | Eventos do sistema operacional                            | syslog, journald                                          |
| **Audit Logs**        | Registro de acoes para compliance                         | Quem fez o que e quando                                   |

### Niveis de Severidade (RFC 5424)

```
TRACE  -> Mais verbose, rastreamento linha a linha
DEBUG  -> Informacoes de depuracao
INFO   -> Eventos normais de operacao
WARN   -> Situacoes incomuns mas nao criticas
ERROR  -> Erros que precisam de atencao
FATAL  -> Erros criticos que causam parada do sistema
```

### Boas Praticas

- **Use logs estruturados** (JSON) sempre que possivel
- **Inclua correlation IDs** para rastrear requisicoes entre servicos
- **Nao logue dados sensiveis** (senhas, tokens, CPF, cartao)
- **Defina nivel de log por ambiente** (DEBUG em dev, INFO/WARN em producao)
- **Evite logs excessivos em hot paths** — impacto de performance e real
- **Use campos padrao:** `timestamp`, `level`, `service`, `trace_id`, `span_id`

### Quando usar Logs?

- Para registrar eventos de negocio importantes (pedido criado, pagamento aprovado)
- Para capturar erros com stack trace completo
- Para auditoria e compliance
- Para depuracao de comportamentos especificos

---

## 2. Metricas

### O que sao?

Metricas sao **medicoes numericas agregadas ao longo do tempo**. Representam o estado do sistema de forma quantitativa e sao ideais para monitoramento, alertas e dashboards.

### Caracteristicas

- **Agregadas:** Perdem granularidade em troca de eficiencia
- **Time-series:** Organizadas por timestamp
- **Baixo custo:** Muito mais eficientes que logs para volume alto
- **Previseis:** Voce sabe com antecedencia o que vai medir

### Tipos Fundamentais de Metricas

#### Counter (Contador)

Valor que **apenas aumenta**. Resetado ao reiniciar o processo.

```
http_requests_total{method="POST", status="200"} 1043
http_requests_total{method="GET",  status="404"} 27
```

> Use para: numero de requisicoes, erros, tarefas processadas

#### Gauge (Medidor)

Valor que pode **subir ou descer** livremente.

```
memory_usage_bytes 1073741824
active_connections  47
queue_size         312
```

> Use para: uso de CPU/memoria, conexoes ativas, tamanho de filas

#### Histogram (Histograma)

Distribui observacoes em **buckets de faixa**. Permite calcular percentis.

```
http_request_duration_seconds_bucket{le="0.1"}  240
http_request_duration_seconds_bucket{le="0.5"}  567
http_request_duration_seconds_bucket{le="1.0"}  890
http_request_duration_seconds_bucket{le="+Inf"} 1000
http_request_duration_seconds_sum   450.7
http_request_duration_seconds_count 1000
```

> Use para: latencia, tamanho de payload, tempo de processamento

#### Summary (Resumo)

Similar ao histograma, mas calcula **percentis no lado do cliente**.

```
rpc_duration_seconds{quantile="0.5"}  0.047
rpc_duration_seconds{quantile="0.9"}  0.143
rpc_duration_seconds{quantile="0.99"} 0.891
```

> Preferir Histogram em ambientes distribuidos (permite agregacao entre instancias)

### As Quatro Sinais de Ouro (Google SRE)

O Google SRE Book define quatro metricas essenciais para qualquer servico:

```
+------------------+------------------------------------------+
| Sinal            | O que mede                               |
+------------------+------------------------------------------+
| Latencia         | Tempo para servir uma requisicao         |
| Trafego          | Volume de demanda (req/s, eventos/s)     |
| Erros            | Taxa de requisicoes que falharam         |
| Saturacao        | Quao "cheio" o servico esta (CPU, RAM)   |
+------------------+------------------------------------------+
```

### RED Method (para servicos)

Framework focado em **servicos de requisicao**:

- **R**ate — Quantas requisicoes por segundo?
- **E**rrors — Quantas requisicoes estao falhando?
- **D**uration — Quanto tempo as requisicoes application-exampleram?

### USE Method (para recursos)

Framework focado em **recursos de infraestrutura**:

- **U**tilization — Qual percentual do recurso esta sendo usado?
- **S**aturation — Ha fila de trabalho acumulando?
- **E**rrors — Ha erros sendo reportados?

### Boas Praticas

- **Use labels/tags com cuidado** — cardinalidade alta explode o armazenamento
- **Prefira percentis a medias** — P99 e mais util que media para latencia
- **Defina SLOs** com base nas metricas que importam para o usuario
- **Nao crie metricas desnecessarias** — mais metricas = mais custo e ruido

---

## 3. Traces (Rastreamento Distribuido)

### O que sao?

Traces representam o **caminho completo de uma requisicao** atraves de um sistema distribuido. Permitem entender como diferentes servicos se comunicam e onde o tempo e gasto.

### Anatomia de um Trace

```
Trace ID: abc-123
|
+-- Span: api-gateway          [0ms -------- 250ms]
    |
    +-- Span: auth-service     [5ms -- 30ms]
    |
    +-- Span: order-service    [35ms -------- 200ms]
        |
        +-- Span: db-query     [40ms -- 80ms]
        |
        +-- Span: cache-lookup [85ms - 90ms]
        |
        +-- Span: payment-svc  [95ms -------- 195ms]
            |
            +-- Span: db-write [100ms -- 150ms]
```

### Conceitos Chave

| Conceito                | Descricao                                                    |
| ----------------------- | ------------------------------------------------------------ |
| **Trace**               | Representacao completa de uma requisicao de ponta a ponta    |
| **Span**                | Unidade de trabalho dentro de um trace (uma operacao)        |
| **Trace ID**            | Identificador unico que une todos os spans de uma requisicao |
| **Span ID**             | Identificador unico de cada span individual                  |
| **Parent Span**         | Span que originou o span atual (relacao pai-filho)           |
| **Context Propagation** | Mecanismo de passar o Trace ID entre servicos via headers    |

### Context Propagation

Para um trace funcionar em sistemas distribuidos, o Trace ID deve ser **propagado entre servicos** via headers HTTP ou mensagens:

```
Cliente -> Servico A -> Servico B -> Servico C
           [Injeta]    [Extrai e   [Extrai e
           headers     re-injeta]   usa]

Headers padrao (W3C TraceContext):
  traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
  tracestate:  vendorkey=opaquevalue
```

### Instrumentacao: Auto vs Manual

**Instrumentacao Automatica** (OpenTelemetry)

- SDKs que interceptam frameworks populares (Express, Django, Spring)
- Zero codigo adicional para cobertura basica
- Cobre HTTP, banco de dados, filas automaticamente

**Instrumentacao Manual**

- Adiciona contexto de negocio que as libs nao conseguem capturar
- Exemplo: qual usuario fez a requisicao, qual produto foi consultado

```javascript
const span = tracer.startSpan("process-payment");
span.setAttribute("payment.amount", 150.0);
span.setAttribute("payment.currency", "BRL");
span.setAttribute("user.id", userId);
// ... logica ...
span.end();
```

### Sampling (Amostragem)

Em sistemas de alto volume, capturar 100% dos traces e inviavel. Estrategias:

| Estrategia        | Descricao                           | Quando usar                 |
| ----------------- | ----------------------------------- | --------------------------- |
| **Head Sampling** | Decisao no inicio da requisicao     | Sistemas de baixo volume    |
| **Tail Sampling** | Decisao apos a requisicao completar | Preservar erros e anomalias |
| **Probabilistic** | X% aleatorio das requisicoes        | Baseline geral              |
| **Rate Limiting** | N traces por segundo                | Controle de custo           |

### Grafana Tempo — backend de traces neste projeto

O **Grafana Tempo** e o backend principal de armazenamento de traces nesta stack. Ele recebe traces via OTLP diretamente do OTel Collector e os disponibiliza para consulta no Grafana.

```
OTel Collector ──OTLP/gRPC──► Tempo:4317 (interno)
                                    │
                              armazena em disco
                                    │
                              Grafana:3001 ◄── datasource Tempo
                                    │
                              busca por Trace ID / servico / duracao
```

**Recursos habilitados no datasource Grafana:**

- **Node Graph** — visualizacao de dependencias entre servicos
- **Trace to Logs** — abre os logs do OpenSearch filtrados pelo TraceID
- **Service Map** — mapa de dependencias gerado a partir das metricas do Prometheus

---

## A Correlacao Entre os Pilares

O verdadeiro poder da observabilidade emerge quando os tres pilares sao **correlacionados**:

```
         ALERT DISPARA: Latencia P99 > 2s
                        |
                  [METRICA aponta]
                  "Qual servico?"
                        |
                  [TRACE mostra]
                  "db-query esta application-examplerando 1.8s"
                        |
                  [LOG revela]
                  "ERROR: table scan on orders (missing index)"
                        |
                  CAUSA RAIZ ENCONTRADA
```

### Como correlacionar na pratica

O `trace_id` e o elo de ligacao entre os tres pilares:

- **Logs** devem incluir `trace_id` e `span_id` em todos os campos
- **Metricas** podem ter `trace_id` exemplificado via **Exemplars** (Prometheus)
- **Traces** referenciam os logs gerados durante aquele span

```json
// Log correlacionado com trace
{
  "timestamp": "2024-01-15T14:23:01Z",
  "level": "error",
  "message": "Database query timeout",
  "service": "order-service",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "duration_ms": 5001,
  "query": "SELECT * FROM orders WHERE user_id = ?"
}
```

---

## OpenTelemetry: O Padrao da Industria

O **OpenTelemetry (OTel)** e o projeto open-source que unifica a instrumentacao dos tres pilares sob uma API e SDK comuns, evitando vendor lock-in.

```
+------------------+        +------------------+        +---------------------+
|   SUA APLICACAO  |        |   OTEL COLLECTOR |        |    BACKENDS         |
|                  |        |                  |        |                     |
| SDK OTel         | -----> | Receive          | -----> | Tempo  (traces)     |
| - Logs           | OTLP   | Process          | -----> | OpenSearch (traces) |
| - Metricas       |        | Export           | -----> | Prometheus (met)    |
| - Traces         |        |                  |        | OpenSearch (logs)   |
+------------------+        +------------------+        | Grafana (visual)    |
                                                        +---------------------+
```

### Componentes principais

- **API:** Interfaces para instrumentar codigo (independente de implementacao)
- **SDK:** Implementacao da API com configuracao de exporters e samplers
- **Collector:** Agente/gateway que recebe, processa e exporta telemetria
- **OTLP:** Protocolo padrao de transporte de dados de telemetria

---

## Maturidade em Observabilidade

Uma forma de avaliar o nivel de observabilidade de uma organizacao:

```
Nivel 1 - REATIVO
  Sabemos quando algo quebrou (alertas de uptime)

Nivel 2 - MONITORAMENTO
  Temos dashboards de metricas e logs centralizados

Nivel 3 - PROATIVO
  Temos traces, correlacionamos os pilares, fazemos SLOs

Nivel 4 - OBSERVABILIDADE
  Poapplication-examples debugar qualquer problema sem instrumentacao adicional
  Usamos dados para decisoes de engenharia e produto
```

---

## Resumo

| Pilar        | Responde                            | Formato               | Custo         | Ferramenta neste projeto   |
| ------------ | ----------------------------------- | --------------------- | ------------- | -------------------------- |
| **Logs**     | O que aconteceu e por que?          | Texto/JSON por evento | Alto (volume) | OpenSearch + Fluent Bit    |
| **Metricas** | Como o sistema esta se comportando? | Numerico time-series  | Baixo         | Prometheus + Grafana       |
| **Traces**   | Onde o tempo esta sendo gasto?      | Grafo de spans        | Medio         | Grafana Tempo + OpenSearch |

Os tres pilares nao sao substitutos uns dos outros — sao **complementares**. Logs dao contexto rico, metricas dao visao sistemica, e traces conectam as pontas em sistemas distribuidos. A observabilidade real acontece quando os tres trabalham juntos.
