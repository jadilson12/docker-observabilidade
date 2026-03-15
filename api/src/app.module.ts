import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorrelationIdMiddleware } from './common/middlewares/correlation-id.middleware.js';
import { RequestLoggerMiddleware } from './common/middlewares/request-logger.middleware.js';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { DebugController } from './debug/debug.controller.js';
import { ApiKeyGuard } from './common/guards/api-key.guard.js';
import { UsersModule } from './users/users.module.js';
import { HealthModule } from './health/health.module.js';
import { validateEnv, type Env } from './config/env.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get('DB_PORT'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        autoLoadEntities: true,
        ...(config.get('NODE_ENV') !== 'test' && {
          migrations: [__dirname + '/database/migrations/*.js'],
          migrationsRun: true,
        }),
        poolSize: 20,
        dropSchema: config.get('NODE_ENV') === 'test',
        synchronize: config.get('NODE_ENV') === 'test',
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    UsersModule,
    AppointmentsModule,
    HealthModule,
  ],
  controllers: [DebugController],
  providers: [{ provide: APP_GUARD, useClass: ApiKeyGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware, RequestLoggerMiddleware).forRoutes('*');
  }
}
