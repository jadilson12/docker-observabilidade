import { Module } from '@nestjs/common';
import { CepController } from './cep.controller.js';
import { CepService } from './cep.service.js';

@Module({
  controllers: [CepController],
  providers: [CepService],
  exports: [CepService],
})
export class CepModule {}
