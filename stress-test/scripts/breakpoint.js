/**
 * Breakpoint Test - Encontra o ponto exato de ruptura
 *
 * Sobe VUs gradualmente misturando Users + Appointments.
 * Calibrado para api isolada: 0.3 vCPU / 500m RAM / poolSize=20 / pg max_connections=100
 *
 * Metricas observadas:
 *   - A partir de quantos VUs a taxa de erro dispara
 *   - A partir de quantos VUs a latencia p95 ultrapassa 2s
 *   - Qual o throughput maximo sustentavel
 *
 * Alvo: api:8082
 * Uso:  docker compose -f stress-test/docker-compose.k6.yml run --rm k6 run /scripts/breakpoint.js
 */
import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Gauge, Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://api:8082';
const API_KEY  = __ENV.API_KEY  || 'api-secret-key';
const API_V1   = `${BASE_URL}/v1`;

const errorRate    = new Rate('bp_error_rate');
const reqDuration  = new Trend('bp_req_duration', true);
const errorCount   = new Counter('bp_errors_total');
const successCount = new Counter('bp_success_total');
const activeVUs    = new Gauge('bp_active_vus');

export const options = {
  stages: [
    { duration: '20s', target: 5   },
    { duration: '30s', target: 10  },
    { duration: '30s', target: 20  },
    { duration: '30s', target: 30  },
    { duration: '30s', target: 40  },
    { duration: '30s', target: 50  },
    { duration: '30s', target: 75  },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 150 },
    { duration: '20s', target: 0   },
  ],
  thresholds: {
    bp_error_rate:    [{ threshold: 'rate<0.50', abortOnFail: true }],
    http_req_duration:[{ threshold: 'p(99)<30000', abortOnFail: true }],
  },
  noConnectionReuse: false,
  userAgent: 'k6-breakpoint/1.0',
};

const jsonHeaders = { headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY } };

const userIds = [];
const apptIds = [];

function uniqueEmail() { return `bp_vu${__VU}_i${__ITER}_${Date.now()}@break.com`; }
function futureDate()  { return new Date(Date.now() + 86400000).toISOString(); }
function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function setup() {
  const maxWait = 30;
  for (let i = 0; i < maxWait; i++) {
    try {
      const res = http.get(`${BASE_URL}/health/liveness`, { timeout: '3s' });
      if (res.status > 0) { console.log(`api pronta (status ${res.status})`); return; }
    } catch (_) {}
    console.log(`aguardando api... (${i + 1}/${maxWait})`);
    sleep(1);
  }
  throw new Error('api nao ficou disponivel em 30s');
}

export default function () {
  activeVUs.add(1);
  const roll = Math.random();

  if (roll < 0.25) {
    // 25% - list users
    const res = http.get(`${API_V1}/users`, jsonHeaders);
    reqDuration.add(res.timings.duration);
    const ok = res.status === 200;
    errorRate.add(res.status >= 500 ? 1 : 0);
    ok ? successCount.add(1) : res.status >= 500 && errorCount.add(1);
    check(res, { '[LIST USERS] nao 5xx': (r) => r.status < 500 });

  } else if (roll < 0.45) {
    // 20% - list appointments
    const res = http.get(`${API_V1}/appointments`, jsonHeaders);
    reqDuration.add(res.timings.duration);
    const ok = res.status === 200;
    errorRate.add(res.status >= 500 ? 1 : 0);
    ok ? successCount.add(1) : res.status >= 500 && errorCount.add(1);
    check(res, { '[LIST APPTS] nao 5xx': (r) => r.status < 500 });

  } else if (roll < 0.60) {
    // 15% - create user (pressiona pool + CPU)
    const res = http.post(
      `${API_V1}/users`,
      JSON.stringify({ name: `BP VU${__VU} IT${__ITER}`, email: uniqueEmail() }),
      jsonHeaders,
    );
    reqDuration.add(res.timings.duration);
    if (res.status === 201) {
      successCount.add(1); errorRate.add(0);
      try { const b = JSON.parse(res.body); if (b.id) { userIds.push(b.id); if (userIds.length > 200) userIds.shift(); } } catch { /* ignore */ }
    } else if (res.status >= 500) {
      errorCount.add(1); errorRate.add(1);
      console.error(`[5xx] POST /users -> ${res.status} VU:${__VU}`);
    } else { errorRate.add(0); }
    check(res, { '[CREATE USER] nao 5xx': (r) => r.status < 500 });

  } else if (roll < 0.75) {
    // 15% - create appointment (pressiona pool + CPU)
    const res = http.post(
      `${API_V1}/appointments`,
      JSON.stringify({ title: `BP Appt VU${__VU} IT${__ITER}`, scheduledAt: futureDate() }),
      jsonHeaders,
    );
    reqDuration.add(res.timings.duration);
    if (res.status === 201) {
      successCount.add(1); errorRate.add(0);
      try { const b = JSON.parse(res.body); if (b.id) { apptIds.push(b.id); if (apptIds.length > 200) apptIds.shift(); } } catch { /* ignore */ }
    } else if (res.status >= 500) {
      errorCount.add(1); errorRate.add(1);
      console.error(`[5xx] POST /appointments -> ${res.status} VU:${__VU}`);
    } else { errorRate.add(0); }
    check(res, { '[CREATE APPT] nao 5xx': (r) => r.status < 500 });

  } else if (roll < 0.88) {
    // 13% - get user
    if (userIds.length === 0) { errorRate.add(0); return; }
    const id  = randomItem(userIds);
    const res = http.get(`${API_V1}/users/${id}`, jsonHeaders);
    reqDuration.add(res.timings.duration);
    if (res.status === 200) { successCount.add(1); errorRate.add(0); }
    else if (res.status >= 500) { errorCount.add(1); errorRate.add(1); console.error(`[5xx] GET /users/${id} -> ${res.status}`); }
    else { errorRate.add(0); }
    check(res, { '[GET USER] nao 5xx': (r) => r.status < 500 });

  } else if (roll < 0.97) {
    // 9% - get appointment
    if (apptIds.length === 0) { errorRate.add(0); return; }
    const id  = randomItem(apptIds);
    const res = http.get(`${API_V1}/appointments/${id}`, jsonHeaders);
    reqDuration.add(res.timings.duration);
    if (res.status === 200) { successCount.add(1); errorRate.add(0); }
    else if (res.status >= 500) { errorCount.add(1); errorRate.add(1); console.error(`[5xx] GET /appointments/${id} -> ${res.status}`); }
    else { errorRate.add(0); }
    check(res, { '[GET APPT] nao 5xx': (r) => r.status < 500 });

  } else {
    // 3% - health
    const res = http.get(`${BASE_URL}/health/liveness`);
    reqDuration.add(res.timings.duration);
    const ok  = res.status === 200;
    errorRate.add(ok ? 0 : 1);
    if (!ok) { errorCount.add(1); console.error(`[CRITICO] GET / -> ${res.status}`); }
    else { successCount.add(1); }
    check(res, { '[HEALTH] 200': (r) => r.status === 200 });
  }

  sleep(Math.random() * 0.15 + 0.05);
}

export function handleSummary(data) {
  const total   = data.metrics.http_reqs.values.count;
  const rps     = data.metrics.http_reqs.values.rate.toFixed(2);
  const errRate = (data.metrics.bp_error_rate.values.rate * 100).toFixed(2);
  const errors  = data.metrics.bp_errors_total?.values?.count  ?? 0;
  const success = data.metrics.bp_success_total?.values?.count ?? 0;
  const p95     = data.metrics.http_req_duration.values['p(95)'].toFixed(0);
  const p99     = data.metrics.http_req_duration.values['p(99)'].toFixed(0);
  const max     = data.metrics.http_req_duration.values.max.toFixed(0);

  console.log('\n======================================');
  console.log('   BREAKPOINT TEST — RESUMO FINAL');
  console.log('======================================');
  console.log(`Total requests:    ${total}`);
  console.log(`Throughput (avg):  ${rps} req/s`);
  console.log(`Sucesso:           ${success}`);
  console.log(`Erros 5xx:         ${errors}  (${errRate}%)`);
  console.log(`p95/p99/max:       ${p95}ms / ${p99}ms / ${max}ms`);
  console.log('');

  const errNum = parseFloat(errRate);
  if (errNum === 0)        console.log('[RESULTADO] Sistema aguentou o teto (150 VUs) sem erros.');
  else if (errNum < 1)     console.log('[RESULTADO] Sistema chegou proximo ao limite (<1% erros).');
  else if (errNum < 5)     console.log('[RESULTADO] Degradacao detectada (1-5% erros).');
  else if (errNum < 20)    console.log('[RESULTADO] RUPTURA ENCONTRADA: sistema falhou significativamente.');
  else                     console.log('[RESULTADO] COLAPSO TOTAL: sistema nao suportou a carga.');

  console.log('\nAcompanhe em tempo real:');
  console.log('  Grafana:    http://localhost:3001');
  console.log('  Prometheus: http://localhost:9292');
  console.log('======================================');
  return {};
}
