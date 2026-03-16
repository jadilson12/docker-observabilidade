export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { NodeSDK } = await import("@opentelemetry/sdk-node")
    const { getNodeAutoInstrumentations } = await import(
      "@opentelemetry/auto-instrumentations-node"
    )
    const { OTLPTraceExporter } = await import(
      "@opentelemetry/exporter-trace-otlp-http"
    )
    const { Resource } = await import("@opentelemetry/resources")
    const { ATTR_SERVICE_NAME } = await import(
      "@opentelemetry/semantic-conventions"
    )

    const serviceName = process.env.OTEL_SERVICE_NAME
    if (!serviceName) {
      throw new Error("OTEL_SERVICE_NAME is required. Add it to your .env file (see web/.env.example).")
    }

    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    if (!otlpEndpoint) {
      throw new Error("OTEL_EXPORTER_OTLP_ENDPOINT is required. Add it to your .env file (see web/.env.example).")
    }

    const sdk = new NodeSDK({
      resource: new Resource({
        [ATTR_SERVICE_NAME]: serviceName,
      }),
      traceExporter: new OTLPTraceExporter({
        url: `${otlpEndpoint}/v1/traces`,
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          "@opentelemetry/instrumentation-fs": { enabled: false },
        }),
      ],
    })

    sdk.start()
  }
}
