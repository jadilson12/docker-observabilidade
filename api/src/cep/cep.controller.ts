import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CepResult, CepService } from './cep.service.js';

@ApiTags('cep')
@Controller('cep')
export class CepController {
  constructor(private readonly cepService: CepService) {}

  @Get(':cep')
  @ApiOperation({ summary: 'Consultar endereço por CEP' })
  @ApiParam({ name: 'cep', description: 'CEP (8 dígitos, com ou sem traço)', example: '01310-100' })
  @ApiResponse({ status: 200, description: 'Endereço encontrado' })
  @ApiResponse({ status: 400, description: 'CEP inválido' })
  @ApiResponse({ status: 404, description: 'CEP não encontrado' })
  @ApiResponse({ status: 502, description: 'Serviço de CEP indisponível' })
  lookup(@Param('cep') cep: string): Promise<CepResult> {
    return this.cepService.lookup(cep);
  }
}
