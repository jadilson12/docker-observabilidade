import 'dotenv/config';
import { initTelemetry } from '../src/telemetry.js';

if (process.env.OTEL_SDK_DISABLED !== 'true') {
  initTelemetry();
}
