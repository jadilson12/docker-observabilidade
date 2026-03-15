/**
 * Error Scenarios Test - Força retornos de erro HTTP específicos
 *
 * Cenários cobertos:
 *  - 201 Created               → POST /appointments com API key válida
 *  - 400 Bad Request           → POST /users com campos ausentes/inválidos (NestJS ValidationPipe)
 *  - 401 Unauthorized          → POST /appointments sem API key ou com chave errada
 *  - 404 Not Found             → GET /appointments/:id inexistente com API key válida
 *  - 409 Conflict              → POST /users com e-mail já cadastrado (ConflictException)
 *  - 500 Internal Server Error → GET /debug/error/500
 *  - 502 Bad Gateway           → GET /debug/error/502
 *
 * Alvo: api1:8082 (direto, sem LB)
 * Uso:  docker compose -f stress-test/docker-compose.k6.yml run --rm k6 run /scripts/errors.js
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://api1:8082';
const API_KEY  = __ENV.API_KEY  || 'api-secret-key';

const got201 = new Counter('errors_201');
const got400 = new Counter('errors_400');
const got401 = new Counter('errors_401');
const got404 = new Counter('errors_404');
const got409 = new Counter('errors_409');
const got500 = new Counter('errors_500');
const got502 = new Counter('errors_502');
const unexpected = new Rate('unexpected_status_rate');

export const options = {
  vus: 3,
  iterations: 20,
  thresholds: {
    errors_201: ['count>0'],
    errors_400: ['count>0'],
    errors_401: ['count>0'],
    errors_404: ['count>0'],
    errors_409: ['count>0'],
    errors_500: ['count>0'],
    errors_502: ['count>0'],
  },
};

const jsonHeaders     = { headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY } };
const noKeyHeaders    = { headers: { 'Content-Type': 'application/json' } };
const wrongKeyHeaders = { headers: { 'Content-Type': 'application/json', 'x-api-key': 'chave-errada' } };

// E-mail fixo para garantir 409
const DUPE_EMAIL = 'conflict_errors_test@k6.local';

// UUID inexistente para garantir 404
const GHOST_ID = '00000000-0000-0000-0000-000000000000';

export function setup() {
  const maxWait = 60;
  for (let i = 0; i < maxWait; i++) {
    try {
      const res = http.get(`${BASE_URL}/`, { timeout: '3s' });
      if (res.status > 0) {
        console.log(`api pronta (status ${res.status})`);
        // Seed para o 409 (usa key válida)
        const seed = http.post(
          `${BASE_URL}/users`,
          JSON.stringify({ name: 'Conflict Seed', email: DUPE_EMAIL }),
          { headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY } },
        );
        console.log(`seed 409: status=${seed.status}`);
        return;
      }
    } catch (_) {}
    console.log(`aguardando api... (${i + 1}/${maxWait})`);
    sleep(1);
  }
  throw new Error('api nao ficou disponivel em 60s');
}

export default function () {

  // ------------------------------------------------------------------ 201
  // POST /appointments com API key válida → 201 Created
  group('force_201', () => {
    const r = http.post(
      `${BASE_URL}/appointments`,
      JSON.stringify({
        title: `Reunião VU${__VU} IT${__ITER}`,
        description: 'Gerado pelo k6 error scenarios',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      }),
      jsonHeaders,
    );
    if (check(r, { '201 - agenda criada': (r) => r.status === 201 })) {
      got201.add(1);
    } else {
      unexpected.add(1);
      console.warn(`[201] esperado 201, recebido ${r.status} | ${r.body.substring(0, 200)}`);
    }
  });

  sleep(0.2);

  // ------------------------------------------------------------------ 400
  // POST /users sem campos obrigatórios → NestJS ValidationPipe retorna 400
  group('force_400', () => {
    const r1 = http.post(`${BASE_URL}/users`, JSON.stringify({}), jsonHeaders);
    if (check(r1, { '400 - body vazio': (r) => r.status === 400 })) {
      got400.add(1);
    } else {
      unexpected.add(1);
      console.warn(`[400-a] esperado 400, recebido ${r1.status}`);
    }

    sleep(0.1);

    const r2 = http.post(
      `${BASE_URL}/users`,
      JSON.stringify({ name: 'Sem Email' }),
      jsonHeaders,
    );
    if (check(r2, { '400 - sem email': (r) => r.status === 400 })) {
      got400.add(1);
    } else {
      unexpected.add(1);
      console.warn(`[400-b] esperado 400, recebido ${r2.status}`);
    }
  });

  sleep(0.2);

  // ------------------------------------------------------------------ 401
  // Qualquer rota protegida sem key ou com key errada → ApiKeyGuard lança 401
  group('force_401', () => {
    // Sem x-api-key
    const r1 = http.get(`${BASE_URL}/users`, noKeyHeaders);
    if (check(r1, { '401 - sem x-api-key': (r) => r.status === 401 })) {
      got401.add(1);
    } else {
      unexpected.add(1);
      console.warn(`[401-a] esperado 401, recebido ${r1.status}`);
    }

    sleep(0.1);

    // Com key errada
    const r2 = http.get(`${BASE_URL}/users`, wrongKeyHeaders);
    if (check(r2, { '401 - x-api-key errada': (r) => r.status === 401 })) {
      got401.add(1);
    } else {
      unexpected.add(1);
      console.warn(`[401-b] esperado 401, recebido ${r2.status}`);
    }
  });

  sleep(0.2);

  // ------------------------------------------------------------------ 404
  // GET /appointments/:id com UUID que não existe → NotFoundException → 404
  group('force_404', () => {
    const r = http.get(`${BASE_URL}/appointments/${GHOST_ID}`, authHeaders);
    if (check(r, { '404 - agenda inexistente': (r) => r.status === 404 })) {
      got404.add(1);
    } else {
      unexpected.add(1);
      console.warn(`[404] esperado 404, recebido ${r.status}`);
    }
  });

  sleep(0.2);

  // ------------------------------------------------------------------ 409
  // POST /users com e-mail duplicado → ConflictException → 409
  group('force_409', () => {
    const r = http.post(
      `${BASE_URL}/users`,
      JSON.stringify({ name: 'Conflict User', email: DUPE_EMAIL }),
      jsonHeaders,
    );
    if (check(r, { '409 - email duplicado': (r) => r.status === 409 })) {
      got409.add(1);
    } else {
      unexpected.add(1);
      console.warn(`[409] esperado 409, recebido ${r.status} | ${r.body.substring(0, 200)}`);
    }
  });

  sleep(0.2);

  // ------------------------------------------------------------------ 500
  group('force_500', () => {
    const r = http.get(`${BASE_URL}/debug/error/500`, jsonHeaders);
    if (check(r, { '500 - erro interno simulado': (r) => r.status === 500 })) {
      got500.add(1);
    } else {
      unexpected.add(1);
      console.warn(`[500] esperado 500, recebido ${r.status}`);
    }
  });

  sleep(0.2);

  // ------------------------------------------------------------------ 502
  group('force_502', () => {
    const r = http.get(`${BASE_URL}/debug/error/502`, jsonHeaders);
    if (check(r, { '502 - bad gateway simulado': (r) => r.status === 502 })) {
      got502.add(1);
    } else {
      unexpected.add(1);
      console.warn(`[502] esperado 502, recebido ${r.status}`);
    }
  });

  sleep(0.5);
}

export function handleSummary(data) {
  const c201 = data.metrics.errors_201?.values?.count ?? 0;
  const c400 = data.metrics.errors_400?.values?.count ?? 0;
  const c401 = data.metrics.errors_401?.values?.count ?? 0;
  const c404 = data.metrics.errors_404?.values?.count ?? 0;
  const c409 = data.metrics.errors_409?.values?.count ?? 0;
  const c500 = data.metrics.errors_500?.values?.count ?? 0;
  const c502 = data.metrics.errors_502?.values?.count ?? 0;
  const unexpectedPct = ((data.metrics.unexpected_status_rate?.values?.rate ?? 0) * 100).toFixed(1);

  console.log('\n=== ERROR SCENARIOS TEST - RESUMO ===');
  console.log(`201 provocados:    ${c201}`);
  console.log(`400 provocados:    ${c400}`);
  console.log(`401 provocados:    ${c401}`);
  console.log(`404 provocados:    ${c404}`);
  console.log(`409 provocados:    ${c409}`);
  console.log(`500 provocados:    ${c500}`);
  console.log(`502 provocados:    ${c502}`);
  console.log(`Status inesperado: ${unexpectedPct}%`);

  const all = [c201, c400, c401, c404, c409, c500, c502];
  const labels = ['201', '400', '401', '404', '409', '500', '502'];
  const failed = labels.filter((_, i) => all[i] === 0);

  if (failed.length === 0) {
    console.log('\n[OK] Todos os cenarios foram disparados com sucesso.');
  } else {
    for (const code of failed) {
      console.log(`[FALHOU] ${code} nao foi provocado.`);
    }
  }

  return {};
}
