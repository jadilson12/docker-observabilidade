/**
 * Smoke Test - Validacao basica: Users + Appointments CRUD
 *
 * Valida o fluxo completo de ambos os recursos via API key.
 * Qualquer erro de 4xx/5xx inesperado e reportado.
 *
 * Alvo: api:8082 (direto) ou LB
 * Uso:
 *   docker compose -f stress-test/docker-compose.k6.yml run --rm k6 run /scripts/smoke.js
 *   BASE_URL=http://localhost:8088 k6 run smoke.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://api:8082';
const API_KEY  = __ENV.API_KEY  || 'api-secret-key';
const API_V1   = `${BASE_URL}/v1`;

const responseTime = new Trend('custom_response_time', true);
const serverErrors = new Counter('custom_server_errors');

export const options = {
  vus: 2,
  iterations: 10,
  thresholds: {
    custom_server_errors: ['count==0'],
    http_req_duration:    ['p(95)<2000'],
  },
};

const jsonHeaders = { headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY } };

function uniqueEmail() {
  return `smoke_vu${__VU}_i${__ITER}@test.com`;
}

function futureDate(daysAhead = 1) {
  return new Date(Date.now() + daysAhead * 86400000).toISOString();
}

function fail(label, res) {
  serverErrors.add(1);
  console.error(`[FAIL] ${label} -> status=${res.status} body=${res.body.substring(0, 200)}`);
}

export function setup() {
  const maxWait = 60;
  for (let i = 0; i < maxWait; i++) {
    try {
      const res = http.get(`${BASE_URL}/health/liveness`, { timeout: '3s' });
      if (res.status > 0) { console.log(`api pronta (status ${res.status})`); return; }
    } catch (_) {}
    console.log(`aguardando api... (${i + 1}/${maxWait})`);
    sleep(1);
  }
  throw new Error('api nao ficou disponivel em 60s');
}

export default function () {

  // ── Health ──────────────────────────────────────────────────────────
  const healthRes = http.get(`${BASE_URL}/health/liveness`);
  responseTime.add(healthRes.timings.duration);
  if (!check(healthRes, { 'GET / - 200': (r) => r.status === 200 }))
    fail('GET /', healthRes);

  sleep(0.2);

  // ── Users CRUD ──────────────────────────────────────────────────────
  const listUsersRes = http.get(`${API_V1}/users`, jsonHeaders);
  responseTime.add(listUsersRes.timings.duration);
  if (!check(listUsersRes, {
    'GET /users - 200':   (r) => r.status === 200,
    'GET /users - array': (r) => { try { const b = JSON.parse(r.body); return Array.isArray(b) || Array.isArray(b.data); } catch { return false; } },
  })) fail('GET /users', listUsersRes);

  sleep(0.2);

  const createUserRes = http.post(
    `${API_V1}/users`,
    JSON.stringify({ name: `Smoke VU${__VU} IT${__ITER}`, email: uniqueEmail() }),
    jsonHeaders,
  );
  responseTime.add(createUserRes.timings.duration);
  if (!check(createUserRes, {
    'POST /users - 201': (r) => r.status === 201,
    'POST /users - id':  (r) => { try { return typeof JSON.parse(r.body).id === 'string'; } catch { return false; } },
  })) { fail('POST /users', createUserRes); return; }

  const userId = JSON.parse(createUserRes.body).id;
  sleep(0.1);

  const getUserRes = http.get(`${API_V1}/users/${userId}`, jsonHeaders);
  responseTime.add(getUserRes.timings.duration);
  if (!check(getUserRes, { 'GET /users/:id - 200': (r) => r.status === 200 }))
    fail(`GET /users/${userId}`, getUserRes);

  sleep(0.1);

  const putUserRes = http.put(
    `${API_V1}/users/${userId}`,
    JSON.stringify({ name: 'Smoke Updated' }),
    jsonHeaders,
  );
  responseTime.add(putUserRes.timings.duration);
  if (!check(putUserRes, { 'PUT /users/:id - 200': (r) => r.status === 200 }))
    fail(`PUT /users/${userId}`, putUserRes);

  sleep(0.1);

  const delUserRes = http.del(`${API_V1}/users/${userId}`, null, jsonHeaders);
  responseTime.add(delUserRes.timings.duration);
  if (!check(delUserRes, { 'DELETE /users/:id - 204': (r) => r.status === 204 }))
    fail(`DELETE /users/${userId}`, delUserRes);

  sleep(0.3);

  // ── Appointments CRUD ────────────────────────────────────────────────
  const listApptRes = http.get(`${API_V1}/appointments`, jsonHeaders);
  responseTime.add(listApptRes.timings.duration);
  if (!check(listApptRes, {
    'GET /appointments - 200':   (r) => r.status === 200,
    'GET /appointments - array': (r) => { try { return Array.isArray(JSON.parse(r.body)); } catch { return false; } },
  })) fail('GET /appointments', listApptRes);

  sleep(0.2);

  const createApptRes = http.post(
    `${API_V1}/appointments`,
    JSON.stringify({
      title: `Smoke Meeting VU${__VU} IT${__ITER}`,
      description: 'Smoke test appointment',
      scheduledAt: futureDate(1),
    }),
    jsonHeaders,
  );
  responseTime.add(createApptRes.timings.duration);
  if (!check(createApptRes, {
    'POST /appointments - 201': (r) => r.status === 201,
    'POST /appointments - id':  (r) => { try { return typeof JSON.parse(r.body).id === 'string'; } catch { return false; } },
  })) { fail('POST /appointments', createApptRes); return; }

  const apptId = JSON.parse(createApptRes.body).id;
  sleep(0.1);

  const getApptRes = http.get(`${API_V1}/appointments/${apptId}`, jsonHeaders);
  responseTime.add(getApptRes.timings.duration);
  if (!check(getApptRes, { 'GET /appointments/:id - 200': (r) => r.status === 200 }))
    fail(`GET /appointments/${apptId}`, getApptRes);

  sleep(0.1);

  const putApptRes = http.put(
    `${API_V1}/appointments/${apptId}`,
    JSON.stringify({ title: 'Smoke Updated Meeting', scheduledAt: futureDate(2) }),
    jsonHeaders,
  );
  responseTime.add(putApptRes.timings.duration);
  if (!check(putApptRes, { 'PUT /appointments/:id - 200': (r) => r.status === 200 }))
    fail(`PUT /appointments/${apptId}`, putApptRes);

  sleep(0.1);

  const delApptRes = http.del(`${API_V1}/appointments/${apptId}`, null, jsonHeaders);
  responseTime.add(delApptRes.timings.duration);
  if (!check(delApptRes, { 'DELETE /appointments/:id - 204': (r) => r.status === 204 }))
    fail(`DELETE /appointments/${apptId}`, delApptRes);

  sleep(0.5);
}

export function handleSummary(data) {
  const total     = data.metrics.http_reqs.values.count;
  const srvErrors = data.metrics.custom_server_errors?.values?.count ?? 0;
  const p95       = data.metrics.http_req_duration.values['p(95)'].toFixed(0);
  const failRate  = (data.metrics.http_req_failed.values.rate * 100).toFixed(1);

  console.log('\n=== SMOKE TEST - RESUMO ===');
  console.log(`Total requests:       ${total}`);
  console.log(`p95 duration:         ${p95}ms`);
  console.log(`Erros detectados:     ${srvErrors}`);
  console.log(`http_req_failed rate: ${failRate}%`);
  console.log(srvErrors === 0
    ? '\n[OK] Sem erros. Users + Appointments CRUD funcionando.'
    : `\n[ATENCAO] ${srvErrors} erros detectados. Verifique os [FAIL] acima.`
  );
  return {};
}
