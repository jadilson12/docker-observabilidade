# ADR-001 — Acesso ao OpenSearch via SSR (Server Components) em vez de Route Handlers `/api`

**Data:** 2026-03-15
**Status:** Aceito
**Contexto:** Dashboard de observabilidade (`/web`) — Next.js 15 App Router

---

## Contexto

O dashboard precisa consultar o OpenSearch para exibir métricas em tempo real de serviços instrumentados via OpenTelemetry. A questão central foi: **onde esse acesso deve acontecer?**

Existem duas abordagens possíveis no Next.js:

1. **Route Handlers** — criar endpoints em `/app/api/*` e ter o Client Component fazendo `fetch` para esses endpoints.
2. **React Server Components (RSC)** — buscar os dados diretamente no `page.tsx` (Server Component) e passar como `props` para o Client Component.

---

## Decisão

**Utilizamos React Server Components (RSC) via `page.tsx`.**

Todo acesso ao OpenSearch ocorre exclusivamente no servidor, dentro do ciclo de renderização da página (SSR). O Client Component (`dashboard-client.tsx`) recebe apenas dados serializados como `props` — nunca executa queries nem conhece a URL ou credenciais do OpenSearch.

---

## Diagrama de fluxo

### ❌ Abordagem descartada — Route Handlers `/api`

```
Browser (Client Component)
  │
  ├─► fetch("GET /api/dashboard/kpis")
  ├─► fetch("GET /api/dashboard/latency")
  ├─► fetch("GET /api/dashboard/services")
  │        │
  │        └─► /app/api/dashboard/kpis/route.ts
  │              └─► OpenSearch (http://opensearch:9200)
  │                    └─► retorna JSON
  │              └─► retorna Response JSON
  │
  └─► renderiza com dados recebidos
```

**N fetches paralelos do browser → N handlers no servidor → N queries ao OpenSearch**

---

### ✅ Abordagem adotada — React Server Components

```
Browser
  │
  └─► GET /dashboard?from=now-1h&service=application-example-api
        │
        └─► page.tsx (Server Component — executa no servidor)
              │
              ├─► Promise.allSettled([
              │     getServices(),
              │     getServiceCapabilities(service),
              │     getKpis(from, to, service),
              │     getRequestsOverTime(from, to, service),
              │     getLatencyOverTime(from, to, service),
              │     ...
              │   ])
              │     └─► actions.ts → OpenSearch (direto, sem HTTP)
              │
              └─► renderiza HTML com dados já incorporados
                    └─► envia ao browser (uma resposta)
```

**Uma request do browser → uma renderização server-side → múltiplas queries ao OpenSearch (em paralelo, na mesma rede interna)**

---

## Por que essa decisão é mais interessante

### 1. Menos latência

Com Route Handlers, o ciclo seria:

```
Browser → Internet/LAN → Next.js API → Rede interna → OpenSearch
```

Com Server Components, o browser faz uma única request HTTP. Dentro do servidor, `page.tsx` chama o OpenSearch **diretamente na rede interna do Docker** (sem HTTP externo), recebe todos os dados e retorna o HTML pronto.

| Abordagem                     | Round-trips do browser | Latência total                |
| ----------------------------- | ---------------------- | ----------------------------- |
| Route Handlers (10 endpoints) | 10+ requests paralelas | Overhead de 10 conexões HTTP  |
| Server Component              | 1 request              | 1 render + N queries internas |

---

### 2. Segurança — credenciais nunca chegam ao cliente

Com Route Handlers, o código do handler roda no servidor, mas **a existência do endpoint é pública**. Qualquer pessoa com o DevTools pode ver as URLs das suas APIs, os parâmetros aceitos e tentar acessá-las diretamente.

Com Server Components:

- A URL do OpenSearch (`http://opensearch:9200`) **nunca aparece no bundle JavaScript** enviado ao browser.
- As credenciais (`OPENSEARCH_URL`, futuramente `OPENSEARCH_USER`, `OPENSEARCH_PASS`) existem apenas como variáveis de ambiente do servidor.
- O Client Component não tem nenhum mecanismo para chamar o OpenSearch — ele só recebe `props` com dados já processados.

---

### 3. Autenticação e autorização centralizadas

Quando há controle de acesso por usuário, o fluxo fica:

```
Request
  → middleware.ts     (verifica sessão — redireciona se inválida)
    → page.tsx        (verifica permissão do usuário para aquele recurso)
      → actions.ts    (acessa OpenSearch com credenciais do SERVIÇO)
```

A verificação acontece **antes** de qualquer dado ser buscado. Se o usuário não tem permissão, a página não renderiza e o OpenSearch nem é consultado.

Com Route Handlers, essa verificação teria que ser replicada em cada endpoint individualmente — risco de esquecer algum.

---

### 4. Estado da UI na URL — sem estado no servidor

Filtros (período de tempo) e serviço selecionado vivem nos **query params da URL**:

```
/dashboard?from=now-6h&service=application-example-api
```

Isso significa:

- **Compartilhável**: copiar a URL abre o mesmo dashboard com o mesmo filtro.
- **Bookmarkável**: salvar nos favoritos preserva o contexto.
- **Sem estado no servidor**: não há sessão de dados, cache customizado nem WebSocket — o servidor sempre renderiza a partir da URL, que é a fonte de verdade.

Quando o usuário troca o filtro, `router.push()` navega para a nova URL. O Next.js re-renderiza o Server Component com os novos `searchParams`, buscando dados frescos do OpenSearch.

---

### 5. `router.refresh()` — re-render sem mudar URL

Para o auto-refresh, `router.refresh()` instrui o Next.js a re-executar o Server Component **sem mudar a URL**. O resultado:

- Os dados são rebuscados do OpenSearch no servidor.
- O HTML atualizado substitui apenas as partes que mudaram (React reconciliation).
- O cliente não precisa saber nada sobre OpenSearch.

---

### 6. Coesão do código

Com Route Handlers, o fluxo de dados fica espalhado:

```
/app/api/dashboard/kpis/route.ts
/app/api/dashboard/latency/route.ts
/app/api/dashboard/services/route.ts
... (um arquivo por endpoint)
```

Com Server Components, toda a lógica de fetch está em dois arquivos:

```
/app/dashboard/page.tsx      — orquestra o que buscar (baseado na URL)
/app/dashboard/actions.ts    — como buscar (queries OpenSearch)
```

---

## Quando Route Handlers AINDA fazem sentido

A decisão acima é específica para **dados lidos na renderização da página**. Route Handlers continuam sendo a escolha correta para:

| Caso de uso                                         | Por quê não Server Component                      |
| --------------------------------------------------- | ------------------------------------------------- |
| Webhooks externos (GitHub, Stripe)                  | Precisam responder com status HTTP específicos    |
| Endpoints consumidos por apps mobile ou outras SPAs | Cliente externo não pode chamar Server Components |
| Server-Sent Events (SSE) / streaming                | Precisam de controle total do Response stream     |
| Downloads de arquivos (CSV, PDF)                    | Precisam de headers `Content-Disposition`         |
| Integrações com ferramentas que precisam de REST    | Postman, curl, scripts externos                   |

---

## Estrutura final adotada

```
web/
├── app/
│   └── dashboard/
│       ├── page.tsx              ← Server Component
│       │   • lê searchParams (from, to, service)
│       │   • verifica auth/permissão (quando implementado)
│       │   • chama actions.ts em paralelo
│       │   • passa dados como props para DashboardClient
│       │
│       ├── actions.ts            ← Funções de servidor puras
│       │   • sem "use server" (não são Server Actions)
│       │   • nunca incluídas no bundle do cliente
│       │   • acessam OpenSearch via variável de ambiente
│       │
│       └── _components/
│           └── dashboard-client.tsx   ← Client Component
│               • import type { ... } from actions  (apagado em build)
│               • recebe dados via props
│               • usa router.push() para trocar filtro/serviço
│               • usa router.refresh() para auto-refresh
│               • ZERO acesso ao OpenSearch
```

---

## Referências

- [Next.js — Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js — When to use Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Next.js — Data Fetching Patterns](https://nextjs.org/docs/app/building-your-application/data-fetching/patterns)
- [React — Server and Client Composition Patterns](https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023)
