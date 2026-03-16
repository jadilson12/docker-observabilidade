/**
 * Load Test - Carga normal/esperada em producao
 * Mistura Users + Appointments com rampa gradual e descida controlada.
 *
 * Distribuicao:
 *   25% list users | 15% list appointments
 *   15% get user   | 10% get appointment
 *   12% create user| 10% create appointment
 *    5% update appointment | 5% delete appointment
 *    3% health check
 *
 * Alvo: api:8082
 * Uso:  docker compose -f stress-test/docker-compose.k6.yml run --rm k6 run /scripts/load.js
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://api:8082';
const API_KEY  = __ENV.API_KEY  || 'api-secret-key';
const API_V1   = `${BASE_URL}/v1`;

const serverErrorRate       = new Rate('server_error_rate');
const createUserDuration    = new Trend('duration_create_user',        true);
const listUserDuration      = new Trend('duration_list_users',         true);
const getUserDuration       = new Trend('duration_get_user',           true);
const createApptDuration    = new Trend('duration_create_appointment', true);
const listApptDuration      = new Trend('duration_list_appointments',  true);
const getApptDuration       = new Trend('duration_get_appointment',    true);

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m',  target: 30 },
    { duration: '2m',  target: 30 },
    { duration: '30s', target: 10 },
    { duration: '15s', target: 0  },
  ],
  thresholds: {
    server_error_rate:           ['rate==0'],
    http_req_duration:           ['p(90)<1500', 'p(95)<2500', 'p(99)<4000'],
    duration_create_user:        ['p(95)<3000'],
    duration_list_users:         ['p(95)<2000'],
    duration_get_user:           ['p(95)<1500'],
    duration_create_appointment: ['p(95)<3000'],
    duration_list_appointments:  ['p(95)<2000'],
    duration_get_appointment:    ['p(95)<1500'],
  },
};

const jsonHeaders = { headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY } };

const userIds = [];
const apptIds = [];

function uniqueEmail() {
  return `load_vu${__VU}_i${__ITER}_${Date.now()}@test.com`;
}

function futureDate(daysAhead = 1) {
  return new Date(Date.now() + daysAhead * 86400000).toISOString();
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
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
  const roll = Math.random();

  if (roll < 0.25) {
    // 25% - list users
    group('list_users', () => {
      const res = http.get(`${API_V1}/users`, jsonHeaders);
      listUserDuration.add(res.timings.duration);
      serverErrorRate.add(res.status >= 500 ? 1 : 0);
      check(res, { 'list users - 200': (r) => r.status === 200 });
      if (res.status >= 500) console.error(`[FAIL] GET /users -> ${res.status}`);
    });

  } else if (roll < 0.40) {
    // 15% - list appointments
    group('list_appointments', () => {
      const res = http.get(`${API_V1}/appointments`, jsonHeaders);
      listApptDuration.add(res.timings.duration);
      serverErrorRate.add(res.status >= 500 ? 1 : 0);
      check(res, { 'list appts - 200': (r) => r.status === 200 });
      if (res.status >= 500) console.error(`[FAIL] GET /appointments -> ${res.status}`);
    });

  } else if (roll < 0.55) {
    // 15% - get user
    group('get_user', () => {
      if (userIds.length === 0) { serverErrorRate.add(0); return; }
      const id  = randomItem(userIds);
      const res = http.get(`${API_V1}/users/${id}`, jsonHeaders);
      getUserDuration.add(res.timings.duration);
      serverErrorRate.add(res.status >= 500 ? 1 : 0);
      check(res, { 'get user - 200': (r) => r.status === 200 });
      if (res.status >= 500) console.error(`[FAIL] GET /users/${id} -> ${res.status}`);
    });

  } else if (roll < 0.65) {
    // 10% - get appointment
    group('get_appointment', () => {
      if (apptIds.length === 0) { serverErrorRate.add(0); return; }
      const id  = randomItem(apptIds);
      const res = http.get(`${API_V1}/appointments/${id}`, jsonHeaders);
      getApptDuration.add(res.timings.duration);
      serverErrorRate.add(res.status >= 500 ? 1 : 0);
      check(res, { 'get appt - 200': (r) => r.status === 200 });
      if (res.status >= 500) console.error(`[FAIL] GET /appointments/${id} -> ${res.status}`);
    });

  } else if (roll < 0.77) {
    // 12% - create user
    group('create_user', () => {
      const res = http.post(
        `${API_V1}/users`,
        JSON.stringify({ name: `Load VU${__VU}-${__ITER}`, email: uniqueEmail() }),
        jsonHeaders,
      );
      createUserDuration.add(res.timings.duration);
      serverErrorRate.add(res.status >= 500 ? 1 : 0);
      check(res, { 'create user - 201': (r) => r.status === 201 });
      if (res.status === 201) {
        try { const b = JSON.parse(res.body); if (b.id) { userIds.push(b.id); if (userIds.length > 500) userIds.shift(); } } catch { /* ignore */ }
      } else {
        console.error(`[FAIL] POST /users -> ${res.status}`);
      }
    });

  } else if (roll < 0.87) {
    // 10% - create appointment
    group('create_appointment', () => {
      const res = http.post(
        `${API_V1}/appointments`,
        JSON.stringify({ title: `Load Meeting VU${__VU}-${__ITER}`, scheduledAt: futureDate(1) }),
        jsonHeaders,
      );
      createApptDuration.add(res.timings.duration);
      serverErrorRate.add(res.status >= 500 ? 1 : 0);
      check(res, { 'create appt - 201': (r) => r.status === 201 });
      if (res.status === 201) {
        try { const b = JSON.parse(res.body); if (b.id) { apptIds.push(b.id); if (apptIds.length > 500) apptIds.shift(); } } catch { /* ignore */ }
      } else {
        console.error(`[FAIL] POST /appointments -> ${res.status}`);
      }
    });

  } else if (roll < 0.92) {
    // 5% - update appointment
    group('update_appointment', () => {
      if (apptIds.length === 0) { serverErrorRate.add(0); return; }
      const id  = randomItem(apptIds);
      const res = http.put(
        `${API_V1}/appointments/${id}`,
        JSON.stringify({ title: `Updated VU${__VU}`, scheduledAt: futureDate(2) }),
        jsonHeaders,
      );
      serverErrorRate.add(res.status >= 500 ? 1 : 0);
      check(res, { 'update appt - 200': (r) => r.status === 200 || r.status === 404 });
      if (res.status >= 500) console.error(`[FAIL] PUT /appointments/${id} -> ${res.status}`);
    });

  } else if (roll < 0.97) {
    // 5% - delete appointment
    group('delete_appointment', () => {
      if (apptIds.length === 0) { serverErrorRate.add(0); return; }
      const id = apptIds.pop();
      const res = http.del(`${API_V1}/appointments/${id}`, null, jsonHeaders);
      serverErrorRate.add(res.status >= 500 ? 1 : 0);
      check(res, { 'delete appt - 204': (r) => r.status === 204 || r.status === 404 });
      if (res.status >= 500) console.error(`[FAIL] DELETE /appointments/${id} -> ${res.status}`);
    });

  } else {
    // 3% - health check
    group('health_check', () => {
      const res = http.get(`${BASE_URL}/health/liveness`);
      serverErrorRate.add(res.status >= 500 ? 1 : 0);
      check(res, { 'health - 200': (r) => r.status === 200 });
      if (res.status >= 500) console.error(`[FAIL] GET / -> ${res.status}`);
    });
  }

  sleep(Math.random() * 1 + 0.5);
}

export function handleSummary(data) {
  const total  = data.metrics.http_reqs.values.count;
  const srvErr = (data.metrics.server_error_rate.values.rate * 100).toFixed(2);
  const p90    = data.metrics.http_req_duration.values['p(90)'].toFixed(0);
  const p95    = data.metrics.http_req_duration.values['p(95)'].toFixed(0);
  const p99    = data.metrics.http_req_duration.values['p(99)'].toFixed(0);
  const rps    = data.metrics.http_reqs.values.rate.toFixed(2);

  const p95cu  = data.metrics.duration_create_user?.values?.['p(95)']?.toFixed(0)        ?? 'n/a';
  const p95lu  = data.metrics.duration_list_users?.values?.['p(95)']?.toFixed(0)         ?? 'n/a';
  const p95ca  = data.metrics.duration_create_appointment?.values?.['p(95)']?.toFixed(0) ?? 'n/a';
  const p95la  = data.metrics.duration_list_appointments?.values?.['p(95)']?.toFixed(0)  ?? 'n/a';

  console.log('\n=== LOAD TEST - RESUMO ===');
  console.log(`Total requests:    ${total}`);
  console.log(`Server errors:     ${srvErr}%`);
  console.log(`Req/s (avg):       ${rps}`);
  console.log(`p90/p95/p99:       ${p90}ms / ${p95}ms / ${p99}ms`);
  console.log('');
  console.log('--- p95 por operacao ---');
  console.log(`create user:        ${p95cu}ms`);
  console.log(`list  users:        ${p95lu}ms`);
  console.log(`create appointment: ${p95ca}ms`);
  console.log(`list  appointments: ${p95la}ms`);
  return {};
}
