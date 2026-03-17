// Módulo de acesso ao OpenSearch — executado exclusivamente no servidor (SSR via page.tsx).
// NÃO deve ser importado por Client Components.
if (!process.env.OPENSEARCH_URL) {
  throw new Error(
    "OPENSEARCH_URL is required. Add it to your .env file (see web/.env.example).",
  );
}
const OS = process.env.OPENSEARCH_URL;
const TRACES_INDEX = "ss4o_traces-otel-application-example-api";
const LOGS_INDEX = "docker-logs";
const SERVICE_PREFIX = "application-example-";

async function osSearch(index: string, body: object) {
  const res = await fetch(`${OS}/${index}/_search?ignore_unavailable=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`OpenSearch error ${res.status}`);
  return res.json();
}

function timeRange(from: string, to: string) {
  return { gte: from, lte: to };
}

function serviceFilter(serviceName?: string): object[] {
  if (serviceName) {
    return [{ term: { "resource.service.name.keyword": serviceName } }];
  }
  // sem serviço específico → restringe ao prefixo application-example-*
  return [{ wildcard: { "resource.service.name.keyword": `${SERVICE_PREFIX}*` } }];
}

export interface KpiData {
  totalRequests: number;
  totalErrors: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorRate: number;
  usersCreated: number;
  usersDeleted: number;
  usersUpdated: number;
  usersViewed: number;
  appointmentsCreated: number;
  appointmentsDeleted: number;
  appointmentsUpdated: number;
  appointmentsViewed: number;
}

export interface ServiceCapabilities {
  hasUserOps: boolean;
  hasAppointmentOps: boolean;
}

export async function getServices(): Promise<string[]> {
  const body = {
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { "kind.keyword": "Server" } },
          { wildcard: { "resource.service.name.keyword": `${SERVICE_PREFIX}*` } },
        ],
      },
    },
    aggs: {
      services: {
        terms: {
          field: "resource.service.name.keyword",
          size: 20,
          order: { _count: "desc" },
        },
      },
    },
  };
  try {
    const data = await osSearch(TRACES_INDEX, body);
    return (
      data.aggregations?.services?.buckets?.map(
        (b: { key: string }) => b.key,
      ) ?? []
    );
  } catch {
    return [];
  }
}

export async function getServiceCapabilities(
  serviceName: string,
): Promise<ServiceCapabilities> {
  const body = {
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { "kind.keyword": "Server" } },
          { term: { "resource.service.name.keyword": serviceName } },
        ],
      },
    },
    aggs: {
      user_ops: {
        filter: {
          bool: {
            should: [
              { prefix: { "name.keyword": "POST /v1/users" } },
              { prefix: { "name.keyword": "GET /v1/users" } },
              { prefix: { "name.keyword": "DELETE /v1/users" } },
              { prefix: { "name.keyword": "PUT /v1/users" } },
            ],
            minimum_should_match: 1,
          },
        },
      },
      appt_ops: {
        filter: {
          bool: {
            should: [
              { prefix: { "name.keyword": "POST /v1/appointments" } },
              { prefix: { "name.keyword": "GET /v1/appointments" } },
              { prefix: { "name.keyword": "DELETE /v1/appointments" } },
              { prefix: { "name.keyword": "PUT /v1/appointments" } },
            ],
            minimum_should_match: 1,
          },
        },
      },
    },
  };
  try {
    const data = await osSearch(TRACES_INDEX, body);
    return {
      hasUserOps: (data.aggregations?.user_ops?.doc_count ?? 0) > 0,
      hasAppointmentOps: (data.aggregations?.appt_ops?.doc_count ?? 0) > 0,
    };
  } catch {
    return { hasUserOps: false, hasAppointmentOps: false };
  }
}

export async function getKpis(
  from = "now-1h",
  to = "now",
  serviceName?: string,
): Promise<KpiData> {
  const body = {
    size: 0,
    query: {
      bool: {
        must: [{ term: { "kind.keyword": "Server" } }],
        filter: [
          { range: { startTime: timeRange(from, to) } },
          ...serviceFilter(serviceName),
        ],
      },
    },
    aggs: {
      total: { value_count: { field: "startTime" } },
      errors: {
        filter: { range: { "attributes.http.status_code": { gte: 400 } } },
      },
      avg_latency: { avg: { script: { lang: "painless", source: "doc['endTime'].value.toInstant().toEpochMilli() - doc['startTime'].value.toInstant().toEpochMilli()" } } },
      percentiles: {
        percentiles: { script: { lang: "painless", source: "doc['endTime'].value.toInstant().toEpochMilli() - doc['startTime'].value.toInstant().toEpochMilli()" }, percents: [95] },
      },
      users_created: {
        filter: {
          bool: {
            must: [
              { term: { "name.keyword": "POST /v1/users" } },
              {
                range: { "attributes.http.status_code": { gte: 200, lt: 300 } },
              },
            ],
          },
        },
      },
      users_deleted: {
        filter: { term: { "name.keyword": "DELETE /v1/users/:id" } },
      },
      users_updated: {
        filter: { term: { "name.keyword": "PUT /v1/users/:id" } },
      },
      users_viewed: {
        filter: { term: { "name.keyword": "GET /v1/users/:id" } },
      },
      appointments_created: {
        filter: {
          bool: {
            must: [
              { term: { "name.keyword": "POST /v1/appointments" } },
              {
                range: { "attributes.http.status_code": { gte: 200, lt: 300 } },
              },
            ],
          },
        },
      },
      appointments_deleted: {
        filter: { term: { "name.keyword": "DELETE /v1/appointments/:id" } },
      },
      appointments_updated: {
        filter: { term: { "name.keyword": "PUT /v1/appointments/:id" } },
      },
      appointments_viewed: {
        filter: { term: { "name.keyword": "GET /v1/appointments/:id" } },
      },
    },
  };

  try {
    const data = await osSearch(TRACES_INDEX, body);
    const total = data.aggregations?.total?.value ?? 0;
    const errors = data.aggregations?.errors?.doc_count ?? 0;
    const avgLatency = data.aggregations?.avg_latency?.value ?? 0;
    const p95 = data.aggregations?.percentiles?.values?.["95.0"] ?? 0;
    return {
      totalRequests: total,
      totalErrors: errors,
      avgLatencyMs: Math.round(avgLatency),
      p95LatencyMs: Math.round(p95),
      errorRate: total > 0 ? Math.round((errors / total) * 100 * 10) / 10 : 0,
      usersCreated: data.aggregations?.users_created?.doc_count ?? 0,
      usersDeleted: data.aggregations?.users_deleted?.doc_count ?? 0,
      usersUpdated: data.aggregations?.users_updated?.doc_count ?? 0,
      usersViewed: data.aggregations?.users_viewed?.doc_count ?? 0,
      appointmentsCreated:
        data.aggregations?.appointments_created?.doc_count ?? 0,
      appointmentsDeleted:
        data.aggregations?.appointments_deleted?.doc_count ?? 0,
      appointmentsUpdated:
        data.aggregations?.appointments_updated?.doc_count ?? 0,
      appointmentsViewed:
        data.aggregations?.appointments_viewed?.doc_count ?? 0,
    };
  } catch {
    return {
      totalRequests: 0,
      totalErrors: 0,
      avgLatencyMs: 0,
      p95LatencyMs: 0,
      errorRate: 0,
      usersCreated: 0,
      usersDeleted: 0,
      usersUpdated: 0,
      usersViewed: 0,
      appointmentsCreated: 0,
      appointmentsDeleted: 0,
      appointmentsUpdated: 0,
      appointmentsViewed: 0,
    };
  }
}

export interface TimePoint {
  time: string;
  [key: string]: number | string;
}

function autoInterval(from: string, to: string): string {
  const relMap: Record<string, number> = {
    "now-15m": 15,
    "now-1h": 60,
    "now-6h": 360,
    "now-24h": 1440,
    "now-7d": 10080,
    "now-30d": 43200,
  };
  const mins = relMap[from];
  if (mins) {
    if (mins <= 30) return "1m";
    if (mins <= 180) return "5m";
    if (mins <= 720) return "15m";
    if (mins <= 2880) return "30m";
    if (mins <= 20160) return "3h";
    return "12h";
  }
  try {
    const diffMs =
      new Date(to === "now" ? Date.now() : to).getTime() -
      new Date(from).getTime();
    const diffMin = diffMs / 60000;
    if (diffMin <= 30) return "1m";
    if (diffMin <= 180) return "5m";
    if (diffMin <= 720) return "15m";
    if (diffMin <= 2880) return "30m";
    if (diffMin <= 20160) return "3h";
    return "12h";
  } catch {
    return "5m";
  }
}

function formatBucketTime(iso: string, from: string): string {
  const d = new Date(iso);
  const relMap: Record<string, number> = {
    "now-15m": 15,
    "now-1h": 60,
    "now-6h": 360,
    "now-24h": 1440,
  };
  const mins = relMap[from];
  if (!mins || mins > 1440) {
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export async function getRequestsOverTime(
  from = "now-1h",
  to = "now",
  serviceName?: string,
): Promise<TimePoint[]> {
  const body = {
    size: 0,
    query: {
      bool: {
        must: [{ term: { "kind.keyword": "Server" } }],
        filter: [
          { range: { startTime: timeRange(from, to) } },
          ...serviceFilter(serviceName),
        ],
      },
    },
    aggs: {
      over_time: {
        date_histogram: {
          field: "startTime",
          fixed_interval: autoInterval(from, to),
          min_doc_count: 0,
          extended_bounds: { min: from, max: to },
        },
        aggs: {
          by_service: { terms: { field: "resource.service.name.keyword", size: 10 } },
        },
      },
    },
  };

  try {
    const data = await osSearch(TRACES_INDEX, body);
    const buckets = data.aggregations?.over_time?.buckets ?? [];
    return buckets.map((b: Record<string, unknown>) => {
      const point: TimePoint = {
        time: formatBucketTime(b.key_as_string as string, from),
      };
      const services =
        (b.by_service as { buckets: Array<{ key: string; doc_count: number }> })
          ?.buckets ?? [];
      point.total = (b.doc_count as number) ?? 0;
      for (const s of services) point[s.key] = s.doc_count;
      return point;
    });
  } catch {
    return [];
  }
}

export async function getLatencyOverTime(
  from = "now-1h",
  to = "now",
  serviceName?: string,
): Promise<TimePoint[]> {
  const body = {
    size: 0,
    query: {
      bool: {
        must: [
          { term: { "kind.keyword": "Server" } },
          { exists: { field: "endTime" } },
        ],
        filter: [
          { range: { startTime: timeRange(from, to) } },
          ...serviceFilter(serviceName),
        ],
      },
    },
    aggs: {
      over_time: {
        date_histogram: {
          field: "startTime",
          fixed_interval: autoInterval(from, to),
          min_doc_count: 0,
          extended_bounds: { min: from, max: to },
        },
        aggs: {
          latency: {
            percentiles: { script: { lang: "painless", source: "doc['endTime'].value.toInstant().toEpochMilli() - doc['startTime'].value.toInstant().toEpochMilli()" }, percents: [50, 95, 99] },
          },
        },
      },
    },
  };

  try {
    const data = await osSearch(TRACES_INDEX, body);
    const buckets = data.aggregations?.over_time?.buckets ?? [];
    return buckets.map((b: Record<string, unknown>) => {
      const values =
        (b.latency as { values: Record<string, number | null> })?.values ?? {};
      return {
        time: formatBucketTime(b.key_as_string as string, from),
        p50: Math.round(values["50.0"] ?? 0),
        p95: Math.round(values["95.0"] ?? 0),
        p99: Math.round(values["99.0"] ?? 0),
      };
    });
  } catch {
    return [];
  }
}

export async function getStatusOverTime(
  from = "now-1h",
  to = "now",
  serviceName?: string,
): Promise<TimePoint[]> {
  const body = {
    size: 0,
    query: {
      bool: {
        must: [
          { term: { "kind.keyword": "Server" } },
          { exists: { field: "attributes.http.status_code" } },
        ],
        filter: [
          { range: { startTime: timeRange(from, to) } },
          ...serviceFilter(serviceName),
        ],
      },
    },
    aggs: {
      over_time: {
        date_histogram: {
          field: "startTime",
          fixed_interval: autoInterval(from, to),
          min_doc_count: 0,
          extended_bounds: { min: from, max: to },
        },
        aggs: {
          success: {
            filter: {
              range: { "attributes.http.status_code": { gte: 200, lt: 400 } },
            },
          },
          client_errors: {
            filter: {
              range: { "attributes.http.status_code": { gte: 400, lt: 500 } },
            },
          },
          server_errors: {
            filter: { range: { "attributes.http.status_code": { gte: 500 } } },
          },
        },
      },
    },
  };

  try {
    const data = await osSearch(TRACES_INDEX, body);
    const buckets = data.aggregations?.over_time?.buckets ?? [];
    return buckets.map((b: Record<string, unknown>) => ({
      time: formatBucketTime(b.key_as_string as string, from),
      "2xx": (b.success as { doc_count: number })?.doc_count ?? 0,
      "4xx": (b.client_errors as { doc_count: number })?.doc_count ?? 0,
      "5xx": (b.server_errors as { doc_count: number })?.doc_count ?? 0,
    }));
  } catch {
    return [];
  }
}

export async function getLogCountOverTime(
  from = "now-1h",
  to = "now",
): Promise<TimePoint[]> {
  const body = {
    size: 0,
    query: { range: { "@timestamp": timeRange(from, to) } },
    aggs: {
      over_time: {
        date_histogram: {
          field: "@timestamp",
          fixed_interval: autoInterval(from, to),
          min_doc_count: 0,
          extended_bounds: { min: from, max: to },
        },
        aggs: {
          by_container: { terms: { field: "container_name.keyword", size: 5 } },
        },
      },
    },
  };

  try {
    const data = await osSearch(LOGS_INDEX, body);
    const buckets = data.aggregations?.over_time?.buckets ?? [];
    return buckets.map((b: Record<string, unknown>) => {
      const point: TimePoint = {
        time: formatBucketTime(b.key_as_string as string, from),
        total: (b.doc_count as number) ?? 0,
      };
      const containers =
        (
          b.by_container as {
            buckets: Array<{ key: string; doc_count: number }>;
          }
        )?.buckets ?? [];
      for (const c of containers) point[c.key] = c.doc_count;
      return point;
    });
  } catch {
    return [];
  }
}

export async function getThroughputByMethod(
  from = "now-1h",
  to = "now",
  serviceName?: string,
): Promise<TimePoint[]> {
  const body = {
    size: 0,
    query: {
      bool: {
        must: [
          { term: { "kind.keyword": "Server" } },
          { exists: { field: "attributes.http.method" } },
        ],
        filter: [
          { range: { startTime: timeRange(from, to) } },
          ...serviceFilter(serviceName),
        ],
      },
    },
    aggs: {
      over_time: {
        date_histogram: {
          field: "startTime",
          fixed_interval: autoInterval(from, to),
          min_doc_count: 0,
          extended_bounds: { min: from, max: to },
        },
        aggs: {
          by_method: {
            terms: { field: "attributes.http.method.keyword", size: 10 },
          },
        },
      },
    },
  };

  try {
    const data = await osSearch(TRACES_INDEX, body);
    const buckets = data.aggregations?.over_time?.buckets ?? [];
    return buckets.map((b: Record<string, unknown>) => {
      const point: TimePoint = {
        time: formatBucketTime(b.key_as_string as string, from),
      };
      const methods =
        (b.by_method as { buckets: Array<{ key: string; doc_count: number }> })
          ?.buckets ?? [];
      for (const m of methods) point[m.key] = m.doc_count;
      return point;
    });
  } catch {
    return [];
  }
}

export async function getLatencyByRouteOverTime(
  from = "now-1h",
  to = "now",
  serviceName?: string,
): Promise<TimePoint[]> {
  const body = {
    size: 0,
    query: {
      bool: {
        must: [
          { term: { "kind.keyword": "Server" } },
          { exists: { field: "attributes.http.target" } },
        ],
        filter: [
          { range: { startTime: timeRange(from, to) } },
          ...serviceFilter(serviceName),
        ],
      },
    },
    aggs: {
      top_routes: {
        terms: {
          field: "attributes.http.target.keyword",
          size: 5,
          order: { _count: "desc" },
        },
        aggs: {
          over_time: {
            date_histogram: {
              field: "startTime",
              fixed_interval: autoInterval(from, to),
              min_doc_count: 0,
              extended_bounds: { min: from, max: to },
            },
            aggs: {
              avg_latency: { avg: { script: { lang: "painless", source: "doc['endTime'].value.toInstant().toEpochMilli() - doc['startTime'].value.toInstant().toEpochMilli()" } } },
            },
          },
        },
      },
    },
  };

  try {
    const data = await osSearch(TRACES_INDEX, body);
    const routeBuckets: Array<{
      key: string;
      over_time: {
        buckets: Array<{
          key_as_string: string;
          avg_latency: { value: number | null };
        }>;
      };
    }> = data.aggregations?.top_routes?.buckets ?? [];

    const timeMap: Record<string, TimePoint> = {};
    for (const route of routeBuckets) {
      for (const tb of route.over_time?.buckets ?? []) {
        const t = formatBucketTime(tb.key_as_string, from);
        if (!timeMap[t]) timeMap[t] = { time: t };
        timeMap[t][route.key] = Math.round(tb.avg_latency?.value ?? 0);
      }
    }
    return Object.values(timeMap);
  } catch {
    return [];
  }
}

export interface RouteLatency {
  route: string;
  p95: number;
  count: number;
}

export async function getLatencyByRoute(
  from = "now-1h",
  to = "now",
  serviceName?: string,
): Promise<RouteLatency[]> {
  const body = {
    size: 0,
    query: {
      bool: {
        must: [
          { term: { "kind.keyword": "Server" } },
          { exists: { field: "attributes.http.target" } },
        ],
        filter: [
          { range: { startTime: timeRange(from, to) } },
          ...serviceFilter(serviceName),
        ],
      },
    },
    aggs: {
      by_route: {
        terms: {
          field: "attributes.http.target.keyword",
          size: 15,
          order: { _count: "desc" },
        },
        aggs: {
          p95: { percentiles: { script: { lang: "painless", source: "doc['endTime'].value.toInstant().toEpochMilli() - doc['startTime'].value.toInstant().toEpochMilli()" }, percents: [95] } },
        },
      },
    },
  };

  try {
    const data = await osSearch(TRACES_INDEX, body);
    const buckets: Array<{
      key: string;
      doc_count: number;
      p95: { values: Record<string, number | null> };
    }> = data.aggregations?.by_route?.buckets ?? [];
    return buckets.map((b) => ({
      route: b.key,
      p95: Math.round(b.p95?.values?.["95.0"] ?? 0),
      count: b.doc_count,
    }));
  } catch {
    return [];
  }
}

export interface OpEntry {
  name: string;
  count: number;
}

export async function getOpDistribution(
  from = "now-1h",
  to = "now",
  serviceName?: string,
): Promise<OpEntry[]> {
  const body = {
    size: 0,
    query: {
      bool: {
        must: [{ term: { "kind.keyword": "Server" } }],
        filter: [
          { range: { startTime: timeRange(from, to) } },
          ...serviceFilter(serviceName),
        ],
      },
    },
    aggs: {
      by_op: {
        terms: { field: "name.keyword", size: 20, order: { _count: "desc" } },
      },
    },
  };

  try {
    const data = await osSearch(TRACES_INDEX, body);
    const buckets: Array<{ key: string; doc_count: number }> =
      data.aggregations?.by_op?.buckets ?? [];
    return buckets.map((b) => ({ name: b.key, count: b.doc_count }));
  } catch {
    return [];
  }
}

export interface EndpointRow {
  endpoint: string;
  requests: number;
  avgMs: number;
  p95Ms: number;
}

export async function getTopEndpoints(
  from = "now-1h",
  to = "now",
  serviceName?: string,
): Promise<EndpointRow[]> {
  const body = {
    size: 0,
    query: {
      bool: {
        must: [
          { term: { "kind.keyword": "Server" } },
          { exists: { field: "attributes.http.target" } },
        ],
        filter: [
          { range: { startTime: timeRange(from, to) } },
          ...serviceFilter(serviceName),
        ],
      },
    },
    aggs: {
      by_endpoint: {
        terms: {
          field: "attributes.http.target.keyword",
          size: 20,
          order: { _count: "desc" },
        },
        aggs: {
          avg_latency: { avg: { script: { lang: "painless", source: "doc['endTime'].value.toInstant().toEpochMilli() - doc['startTime'].value.toInstant().toEpochMilli()" } } },
          p95: { percentiles: { script: { lang: "painless", source: "doc['endTime'].value.toInstant().toEpochMilli() - doc['startTime'].value.toInstant().toEpochMilli()" }, percents: [95] } },
        },
      },
    },
  };

  try {
    const data = await osSearch(TRACES_INDEX, body);
    const buckets: Array<{
      key: string;
      doc_count: number;
      avg_latency: { value: number | null };
      p95: { values: Record<string, number | null> };
    }> = data.aggregations?.by_endpoint?.buckets ?? [];
    return buckets.map((b) => ({
      endpoint: b.key,
      requests: b.doc_count,
      avgMs: Math.round(b.avg_latency?.value ?? 0),
      p95Ms: Math.round(b.p95?.values?.["95.0"] ?? 0),
    }));
  } catch {
    return [];
  }
}

export async function getAppointmentsOverTime(
  from = "now-1h",
  to = "now",
  serviceName?: string,
): Promise<TimePoint[]> {
  const body = {
    size: 0,
    query: {
      bool: {
        must: [
          { term: { "kind.keyword": "Server" } },
          {
            bool: {
              should: [
                { term: { "name.keyword": "POST /v1/appointments" } },
                { term: { "name.keyword": "GET /v1/appointments/:id" } },
                { term: { "name.keyword": "PUT /v1/appointments/:id" } },
                { term: { "name.keyword": "DELETE /v1/appointments/:id" } },
              ],
            },
          },
        ],
        filter: [
          { range: { startTime: timeRange(from, to) } },
          ...serviceFilter(serviceName),
        ],
      },
    },
    aggs: {
      over_time: {
        date_histogram: {
          field: "startTime",
          fixed_interval: autoInterval(from, to),
          min_doc_count: 0,
          extended_bounds: { min: from, max: to },
        },
        aggs: {
          created: {
            filter: {
              bool: {
                must: [
                  { term: { "name.keyword": "POST /v1/appointments" } },
                  {
                    range: {
                      "attributes.http.status_code": { gte: 200, lt: 300 },
                    },
                  },
                ],
              },
            },
          },
          viewed: {
            filter: { term: { "name.keyword": "GET /v1/appointments/:id" } },
          },
          updated: {
            filter: { term: { "name.keyword": "PUT /v1/appointments/:id" } },
          },
          deleted: {
            filter: { term: { "name.keyword": "DELETE /v1/appointments/:id" } },
          },
        },
      },
    },
  };

  try {
    const data = await osSearch(TRACES_INDEX, body);
    const buckets = data.aggregations?.over_time?.buckets ?? [];
    return buckets.map((b: Record<string, unknown>) => ({
      time: formatBucketTime(b.key_as_string as string, from),
      created: (b.created as { doc_count: number })?.doc_count ?? 0,
      viewed: (b.viewed as { doc_count: number })?.doc_count ?? 0,
      updated: (b.updated as { doc_count: number })?.doc_count ?? 0,
      deleted: (b.deleted as { doc_count: number })?.doc_count ?? 0,
    }));
  } catch {
    return [];
  }
}
