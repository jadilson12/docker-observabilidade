/**
 * Spike Test - Pico repentino de trafego: Users + Appointments
 *
 * Linha de base baixa → SPIKE → sustenta → QUEDA → recuperacao.
 * Verifica se o sistema absorve o pico sem erros 5xx.
 *
 * Alvo: api:8082
 * Uso:  docker compose -f stress-test/docker-compose.k6.yml run --rm k6 run /scripts/spike.js
 */
import { check, sleep } from "k6";
import http from "k6/http";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://api:8082";
const API_KEY  = __ENV.API_KEY  || "api-secret-key";
const API_V1   = `${BASE_URL}/v1`;

const serverErrorRate = new Rate("spike_server_error_rate");
const reqDuration     = new Trend("spike_req_duration", true);

export const options = {
  stages: [
    { duration: "20s", target: 10  },  // linha de base
    { duration: "10s", target: 200 },  // SPIKE
    { duration: "1m",  target: 200 },  // mantém pico
    { duration: "10s", target: 10  },  // QUEDA
    { duration: "30s", target: 10  },  // recuperacao
    { duration: "10s", target: 0   },  // encerramento
  ],
  thresholds: {
    spike_server_error_rate: ["rate<0.05"],
    http_req_duration:       ["p(99)<8000"],
    spike_req_duration:      ["p(95)<5000"],
  },
};

const jsonHeaders = { headers: { "Content-Type": "application/json", "x-api-key": API_KEY } };

const apptIds = [];

function uniqueEmail() { return `spike_vu${__VU}_i${__ITER}_${Date.now()}@test.com`; }
function futureDate()  { return new Date(Date.now() + 86400000).toISOString(); }
function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function setup() {
  const maxWait = 60;
  for (let i = 0; i < maxWait; i++) {
    try {
      const res = http.get(`${BASE_URL}/health/liveness`, { timeout: "3s" });
      if (res.status > 0) { console.log(`api pronta (status ${res.status})`); return; }
    } catch (_) {}
    console.log(`aguardando api... (${i + 1}/${maxWait})`);
    sleep(1);
  }
  throw new Error("api nao ficou disponivel em 60s");
}

export default function () {
  const roll = Math.random();

  if (roll < 0.25) {
    // 25% - list users
    const res = http.get(`${API_V1}/users`, jsonHeaders);
    reqDuration.add(res.timings.duration);
    check(res, { "spike list users - nao 5xx": (r) => r.status < 500 });
    serverErrorRate.add(res.status >= 500 ? 1 : 0);

  } else if (roll < 0.50) {
    // 25% - list appointments
    const res = http.get(`${API_V1}/appointments`, jsonHeaders);
    reqDuration.add(res.timings.duration);
    check(res, { "spike list appts - nao 5xx": (r) => r.status < 500 });
    serverErrorRate.add(res.status >= 500 ? 1 : 0);

  } else if (roll < 0.65) {
    // 15% - create user
    const res = http.post(
      `${API_V1}/users`,
      JSON.stringify({ name: `Spike VU${__VU}`, email: uniqueEmail() }),
      jsonHeaders,
    );
    reqDuration.add(res.timings.duration);
    check(res, { "spike create user - nao 5xx": (r) => r.status < 500 });
    serverErrorRate.add(res.status >= 500 ? 1 : 0);

  } else if (roll < 0.80) {
    // 15% - create appointment
    const res = http.post(
      `${API_V1}/appointments`,
      JSON.stringify({ title: `Spike Appt VU${__VU}`, scheduledAt: futureDate() }),
      jsonHeaders,
    );
    reqDuration.add(res.timings.duration);
    check(res, { "spike create appt - nao 5xx": (r) => r.status < 500 });
    serverErrorRate.add(res.status >= 500 ? 1 : 0);
    if (res.status === 201) {
      try { const b = JSON.parse(res.body); if (b.id) { apptIds.push(b.id); if (apptIds.length > 500) apptIds.shift(); } } catch { /* ignore */ }
    }

  } else if (roll < 0.92) {
    // 12% - get appointment
    if (apptIds.length === 0) { serverErrorRate.add(0); return; }
    const res = http.get(`${API_V1}/appointments/${randomItem(apptIds)}`, jsonHeaders);
    reqDuration.add(res.timings.duration);
    check(res, { "spike get appt - nao 5xx": (r) => r.status < 500 });
    serverErrorRate.add(res.status >= 500 ? 1 : 0);

  } else {
    // 8% - health
    const res = http.get(`${BASE_URL}/health/liveness`);
    reqDuration.add(res.timings.duration);
    check(res, { "spike health - 200": (r) => r.status === 200 });
    serverErrorRate.add(res.status >= 500 ? 1 : 0);
  }

  sleep(Math.random() * 0.3 + 0.1);
}

export function handleSummary(data) {
  const srvErr = (data.metrics.spike_server_error_rate.values.rate * 100).toFixed(2);
  const p95    = data.metrics.http_req_duration.values["p(95)"].toFixed(0);
  const max    = data.metrics.http_req_duration.values.max.toFixed(0);
  const rps    = data.metrics.http_reqs.values.rate.toFixed(2);

  console.log("\n=== SPIKE TEST - RESUMO ===");
  console.log(`Total requests:    ${data.metrics.http_reqs.values.count}`);
  console.log(`Server errors 5xx: ${srvErr}%`);
  console.log(`p95 duration:      ${p95}ms`);
  console.log(`Max duration:      ${max}ms`);
  console.log(`Req/s (avg):       ${rps}`);
  console.log(parseFloat(srvErr) > 5
    ? "\n[ATENCAO] Sistema nao absorveu o spike - considere rate limiting ou fila"
    : "\n[OK] Sistema absorveu o spike sem erros de servidor"
  );
  return {};
}
