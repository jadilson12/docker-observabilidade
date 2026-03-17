import { ConsoleLogger } from '@nestjs/common';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';

export class OtelLogger extends ConsoleLogger {
  private get otelLogger() {
    return logs.getLogger('nestjs');
  }

  private emitLog(severity: SeverityNumber, severityText: string, message: unknown, context?: string, stack?: string) {
    this.otelLogger.emit({
      severityNumber: severity,
      severityText,
      body: typeof message === 'string' ? message : JSON.stringify(message),
      attributes: {
        'code.namespace': context ?? 'NestJS',
        ...(stack ? { 'exception.stacktrace': stack } : {}),
      },
    });
  }

  override log(message: unknown, context?: string) {
    super.log(message, context);
    this.emitLog(SeverityNumber.INFO, 'INFO', message, context);
  }

  override warn(message: unknown, context?: string) {
    super.warn(message, context);
    this.emitLog(SeverityNumber.WARN, 'WARN', message, context);
  }

  override error(message: unknown, stack?: string, context?: string) {
    super.error(message, stack, context);
    this.emitLog(SeverityNumber.ERROR, 'ERROR', message, context, stack);
  }

  override debug(message: unknown, context?: string) {
    super.debug(message, context);
    this.emitLog(SeverityNumber.DEBUG, 'DEBUG', message, context);
  }

  override verbose(message: unknown, context?: string) {
    super.verbose(message, context);
    this.emitLog(SeverityNumber.TRACE, 'TRACE', message, context);
  }

  override fatal(message: unknown, context?: string) {
    super.fatal(message, context);
    this.emitLog(SeverityNumber.FATAL, 'FATAL', message, context);
  }
}
