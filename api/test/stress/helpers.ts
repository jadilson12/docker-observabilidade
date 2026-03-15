/**
 * Utilitários para testes de stress.
 *
 * measureConcurrent: dispara N requisições simultâneas e retorna
 * métricas de latência (p50, p95, p99) e throughput.
 */

export interface StressResult {
  total: number;
  success: number;
  errors: number;
  /** Latências em ms de cada requisição bem-sucedida */
  latencies: number[];
  p50: number;
  p95: number;
  p99: number;
  /** Requisições bem-sucedidas por segundo */
  rps: number;
  durationMs: number;
}

/**
 * Executa `concurrency` chamadas simultâneas a `fn` e mede as latências.
 * @param concurrency número de chamadas paralelas
 * @param fn função que executa uma requisição e retorna o status HTTP
 */
export async function measureConcurrent(concurrency: number, fn: () => Promise<number>): Promise<StressResult> {
  const start = Date.now();
  const results = await Promise.allSettled(
    Array.from({ length: concurrency }, async () => {
      const t0 = Date.now();
      const status = await fn();
      return { status, latency: Date.now() - t0 };
    }),
  );
  const durationMs = Date.now() - start;

  const latencies: number[] = [];
  let errors = 0;

  for (const r of results) {
    if (r.status === 'fulfilled') {
      // Consideramos erro apenas status >= 500
      if (r.value.status >= 500) {
        errors++;
      } else {
        latencies.push(r.value.latency);
      }
    } else {
      errors++;
    }
  }

  latencies.sort((a, b) => a - b);

  function percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const idx = Math.ceil((p / 100) * arr.length) - 1;
    return arr[Math.max(0, idx)];
  }

  const success = latencies.length;

  return {
    total: concurrency,
    success,
    errors,
    latencies,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    rps: success / (durationMs / 1000),
    durationMs,
  };
}
