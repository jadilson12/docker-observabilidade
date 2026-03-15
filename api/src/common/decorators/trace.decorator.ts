import { metrics, Span, SpanStatusCode, trace } from '@opentelemetry/api';

interface MethodConfig {
  /**
   * Mapeia argumento para atributo do span.
   * Chave pode ser:
   *   - índice numérico: "0" → args[0] (primitivo)
   *   - notação de ponto: "0.page" → args[0].page (campo de objeto)
   */
  attrs?: Record<string, string>;
  /** nome do counter a incrementar após sucesso */
  counter?: string;
}

export type TraceConfig = Record<string, MethodConfig>;

function applyAttrs(span: Span, args: unknown[], attrs: Record<string, string> = {}): void {
  for (const [key, attrName] of Object.entries(attrs)) {
    const dotIdx = key.indexOf('.');
    let value: unknown;
    if (dotIdx === -1) {
      value = args[Number(key)];
    } else {
      const idx = Number(key.slice(0, dotIdx));
      const field = key.slice(dotIdx + 1);
      const obj = args[idx];
      if (obj != null && typeof obj === 'object') {
        value = (obj as Record<string, unknown>)[field];
      }
    }
    if (value != null && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')) {
      span.setAttribute(attrName, value);
    }
  }
}

function createTraceDecorator(histogramSuffix: string, fixedAttrs: Record<string, string> = {}) {
  return (prefix: string, config: TraceConfig = {}): ClassDecorator =>
    (target) => {
      const proto = target.prototype as Record<string, unknown>;
      const meter = metrics.getMeter(prefix);
      const histogram = meter.createHistogram(`${prefix}.${histogramSuffix}`, { unit: 'ms' });

      for (const method of Object.getOwnPropertyNames(proto)) {
        if (method === 'constructor') continue;
        if (!(method in config)) continue;
        const descriptor = Object.getOwnPropertyDescriptor(proto, method);
        if (!descriptor || typeof descriptor.value !== 'function') continue;

        const original = descriptor.value as (...args: unknown[]) => Promise<unknown>;
        const methodConfig = config[method];
        const counter = methodConfig.counter ? meter.createCounter(methodConfig.counter) : null;

        descriptor.value = async function (...args: unknown[]): Promise<unknown> {
          return trace.getTracer(prefix).startActiveSpan(`${prefix}.${method}`, async (span) => {
            for (const [k, v] of Object.entries(fixedAttrs)) span.setAttribute(k, v);
            span.setAttribute('operation', method);
            applyAttrs(span, args, methodConfig.attrs);

            const start = Date.now();
            let status = 'success';
            try {
              const result = await Reflect.apply(original, this, args);
              counter?.add(1);
              return result;
            } catch (error) {
              status = 'error';
              span.recordException(error instanceof Error ? error : new Error(String(error)));
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error instanceof Error ? error.message : String(error),
              });
              throw error;
            } finally {
              histogram.record(Date.now() - start, { operation: method, status });
              span.end();
            }
          });
        };

        Object.defineProperty(proto, method, descriptor);
      }
    };
}

export const TraceService = createTraceDecorator('operation.duration_ms');
export const TraceRepository = createTraceDecorator('query.duration_ms', { 'db.system': 'postgresql' });
