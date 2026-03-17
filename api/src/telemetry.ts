import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import * as promClient from 'prom-client';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import * as http from 'http';
import type { IncomingMessage } from 'http';

let sdk: NodeSDK | undefined;

export async function shutdownTelemetry() {
  await sdk?.shutdown();
  sdk = undefined;
}

export function initTelemetry() {
  if (sdk) {
    return;
  }

  const serviceName = process.env.OTEL_SERVICE_NAME ?? process.env.APP_NAME!;
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT!;
  const metricsPort = Number(process.env.OTEL_PROMETHEUS_PORT ?? 9464);

  const prometheusExporter = new PrometheusExporter({ preventServerStart: true });

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      'service.version': process.env.npm_package_version ?? 'unknown',
      'deployment.environment': process.env.NODE_ENV ?? 'development',
    }),
    traceExporter: new OTLPTraceExporter({ url: endpoint }),
    metricReader: prometheusExporter,
    logRecordProcessor: new BatchLogRecordProcessor(new OTLPLogExporter({ url: endpoint })),
    instrumentations: [
      new HttpInstrumentation({
        requestHook: (span, req) => {
          const cid = (req as IncomingMessage).headers['x-correlation-id'];
          if (cid) span.setAttribute('http.request.correlation_id', String(cid));
        },
      }),
      new ExpressInstrumentation(),
      new PgInstrumentation(),
    ],
  });

  promClient.collectDefaultMetrics();

  sdk.start();

  const metricsServer = http.createServer((req, res) => {
    if (req.url === '/metrics') {
      prometheusExporter.getMetricsRequestHandler(req, res);
      return;
    }
    if (req.url === '/metrics/nodejs') {
      void promClient.register.metrics().then((metrics) => {
        res.setHeader('Content-Type', promClient.register.contentType);
        res.end(metrics);
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });

  metricsServer.listen(metricsPort);

  const shutdown = async () => {
    try {
      await sdk?.shutdown();
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => {
    void shutdown();
  });
  process.on('SIGINT', () => {
    void shutdown();
  });
}
