import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { CORRELATION_ID_HEADER } from './correlation-id.middleware.js';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') ?? '-';
    const start = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - start;
      const rawCid = req.headers[CORRELATION_ID_HEADER];
      const correlationId = Array.isArray(rawCid) ? rawCid[0] : (rawCid ?? '-');

      this.logger.log(
        `${method} ${originalUrl} ${statusCode} ${duration}ms — ip=${ip} ua="${userAgent}" cid=${correlationId}`,
      );
    });

    next();
  }
}
