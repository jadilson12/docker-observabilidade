/**
 * Stress Test - Empurra Users + Appointments alem do limite
 *
 * Sobe VUs progressivamente ate ruptura.
 * Mede taxa de erro e latencia separados por recurso.
 *
 * Alvo: api:8082
 * Uso:  docker compose -f stress-test/docker-compose.k6.yml run --rm k6 run /scripts/stress.js
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Gauge, Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://api:8082';
const API_KEY  = __ENV.API_KEY  || 'api-secret-key';
const API_V1   = `${BASE_URL}/v1`;

const serverErrorRate = new Rate('stress_server_error_rate');
const errorCount      = new Counter('stress_errors_total');
const successCount    = new Counter('stress_success_total');
const activeVUs       = new Gauge('stress_active_vus');

const createUserDuration = new Trend('stress_duration_create_user',        true);
const listUserDuration   = new Trend('stress_duration_list_users',         true);
const createApptDuration = new Trend('stress_duration_create_appointment', true);
const listApptDuration   = new Trend('stress_duration_list_appointments',  true);
const getApptDuration    = new Trend('stress_duration_get_appointment',    true);

export const options = {
  stages: [
    { duration: '30s', target: 500   },
    { duration: '1m',  target: 1000  },
    { duration: '1m',  target: 2000  },
    { duration: '1m',  target: 5000  },
    { duration: '1m',  target: 10000 },
    { duration: '2m',  target: 10000 },
    { duration: '1m',  target: 25000 },
    { duration: '2m',  target: 50000 },
    { duration: '1m',  target: 75000 },
    { duration: '2m',  target: 100000},
    { duration: '2m',  target: 0     },
  ],
  thresholds: {
    stress_server_error_rate:           ['rate<0.05'],
    http_req_duration:                  ['p(95)<5000'],
    stress_duration_create_user:        ['p(95)<6000'],
    stress_duration_list_users:         ['p(95)<4000'],
    stress_duration_create_appointment: ['p(95)<6000'],
    stress_duration_list_appointments:  ['p(95)<4000'],
  },
  noConnectionReuse: false,
  userAgent: 'k6-stress/1.0',
};

const jsonHeaders = { headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY } };

const userIds = [];
const apptIds = [];

function uniqueEmail() { return `stress_vu${__VU}_i${__ITER}_${Date.now()}@test.com`; }
function futureDate()  { return new Date(Date.now() + 86400000).toISOString(); }
function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

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
  activeVUs.add(1);
  const roll = Math.random();

  if (roll < 0.25) {
    group('list_users', () => {
      const res = http.get(`${API_V1}/users`, jsonHeaders);
      listUserDuration.add(res.timings.duration);
      check(res, { 'list users - nao 5xx': (r) => r.status < 500 });
      serverErrorRate.add(res.status >= 500 ? 1 : 0);
      res.status >= 500 ? errorCount.add(1) : successCount.add(1);
    });

  } else if (roll < 0.45) {
    group('list_appointments', () => {
      const res = http.get(`${API_V1}/appointments`, jsonHeaders);
      listApptDuration.add(res.timings.duration);
      check(res, { 'list appts - nao 5xx': (r) => r.status < 500 });
      serverErrorRate.add(res.status >= 500 ? 1 : 0);
      res.status >= 500 ? errorCount.add(1) : successCount.add(1);
    });

  } else if (roll < 0.60) {
    group('create_user', () => {
      const res = http.post(
        `${API_V1}/users`,
        JSON.stringify({ name: `Stress VU${__VU}`, email: uniqueEmail() }),
        jsonHeaders,
      );
      createUserDuration.add(res.timings.duration);
      if (res.status === 201) {
        successCount.add(1); serverErrorRate.add(0);
        try { const b = JSON.parse(res.body); if (b.id) { userIds.push(b.id); if (userIds.length > 1000) userIds.shift(); } } catch { /* ignore */ }
      } else if (res.status >= 500) {
        errorCount.add(1); serverErrorRate.add(1);
        console.error(`[FAIL] POST /users -> ${res.status}`);
      } else { serverErrorRate.add(0); }
      check(res, { 'create user - nao 5xx': (r) => r.status < 500 });
    });

  } else if (roll < 0.75) {
    group('create_appointment', () => {
      const res = http.post(
        `${API_V1}/appointments`,
        JSON.stringify({ title: `Stress Appt VU${__VU}`, scheduledAt: futureDate() }),
        jsonHeaders,
      );
      createApptDuration.add(res.timings.duration);
      if (res.status === 201) {
        successCount.add(1); serverErrorRate.add(0);
        try { const b = JSON.parse(res.body); if (b.id) { apptIds.push(b.id); if (apptIds.length > 1000) apptIds.shift(); } } catch { /* ignore */ }
      } else if (res.status >= 500) {
        errorCount.add(1); serverErrorRate.add(1);
        console.error(`[FAIL] POST /appointments -> ${res.status}`);
      } else { serverErrorRate.add(0); }
      check(res, { 'create appt - nao 5xx': (r) => r.status < 500 });
    });

  } else if (roll < 0.88) {
    group('get_appointment', () => {
      if (apptIds.length === 0) { serverErrorRate.add(0); return; }
      const id  = randomItem(apptIds);
      const res = http.get(`${API_V1}/appointments/${id}`, jsonHeaders);
      getApptDuration.add(res.timings.duration);
      serverErrorRate.add(res.status >= 500 ? 1 : 0);
      res.status >= 500 ? errorCount.add(1) : successCount.add(1);
      check(res, { 'get appt - nao 5xx': (r) => r.status < 500 });
    });

  } else {
    group('health_check', () => {
      const res = http.get(`${BASE_URL}/health/liveness`);
      serverErrorRate.add(res.status >= 500 ? 1 : 0);
      check(res, { 'health - 200': (r) => r.status === 200 });
      if (!check(res, { 'health - nao 5xx': (r) => r.status < 500 })) {
        errorCount.add(1);
        console.error(`[CRITICO] GET / -> ${res.status}`);
      } else { successCount.add(1); }
    });
  }

  sleep(Math.random() * 0.5 + 0.1);
}

export function handleSummary(data) {
  const total   = data.metrics.http_reqs.values.count;
  const rps     = data.metrics.http_reqs.values.rate.toFixed(2);
  const srvErr  = (data.metrics.stress_server_error_rate.values.rate * 100).toFixed(2);
  const errors  = data.metrics.stress_errors_total?.values?.count  ?? 0;
  const success = data.metrics.stress_success_total?.values?.count ?? 0;
  const p95     = data.metrics.http_req_duration.values['p(95)'].toFixed(0);
  const p99     = data.metrics.http_req_duration.values['p(99)'].toFixed(0);

  const p95cu = data.metrics.stress_duration_create_user?.values?.['p(95)']?.toFixed(0)        ?? 'n/a';
  const p95lu = data.metrics.stress_duration_list_users?.values?.['p(95)']?.toFixed(0)         ?? 'n/a';
  const p95ca = data.metrics.stress_duration_create_appointment?.values?.['p(95)']?.toFixed(0) ?? 'n/a';
  const p95la = data.metrics.stress_duration_list_appointments?.values?.['p(95)']?.toFixed(0)  ?? 'n/a';

  console.log('\n======================================');
  console.log('   STRESS TEST - RESUMO FINAL');
  console.log('======================================');
  console.log(`Total requests:    ${total}`);
  console.log(`Throughput (avg):  ${rps} req/s`);
  console.log(`Sucesso:           ${success}`);
  console.log(`Erros (5xx):       ${errors}  (${srvErr}%)`);
  console.log(`p95/p99:           ${p95}ms / ${p99}ms`);
  console.log('');
  console.log('--- p95 por operacao ---');
  console.log(`create user:        ${p95cu}ms`);
  console.log(`list  users:        ${p95lu}ms`);
  console.log(`create appointment: ${p95ca}ms`);
  console.log(`list  appointments: ${p95la}ms`);
  console.log('');
  const errNum = parseFloat(srvErr);
  if (errNum === 0)        console.log('[RESULTADO] Sistema aguentou o stress sem erros.');
  else if (errNum < 2)     console.log('[RESULTADO] Sistema estavel com erros minimos (<2%).');
  else if (errNum < 5)     console.log('[ATENCAO] Sistema degradou (2-5% erros).');
  else                     console.log('[CRITICO] Taxa de erros acima de 5%.');
  console.log('======================================');
  return {};
}
