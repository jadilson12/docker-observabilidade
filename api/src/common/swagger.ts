import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('docker-observabilidade API')
    .setDescription('API de exemplo instrumentada com OpenTelemetry')
    .setVersion('1.0')
    .addServer(`http://localhost:${process.env.PORT ?? 8082}`)
    .build();

  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config), {
    swaggerOptions: { persistAuthorization: true },
  });
}
