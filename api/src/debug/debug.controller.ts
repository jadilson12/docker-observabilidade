import { Controller, Get, HttpException, HttpStatus, InternalServerErrorException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

/**
 * Endpoints de simulação de erros para testes de observabilidade.
 * Permite que scripts k6 provoquem status HTTP específicos de forma determinística.
 * Ambos lançam HttpException para que o HttpExceptionFilter grave o status no span OTel.
 */
@ApiTags('debug')
@Controller('debug')
export class DebugController {
  @Get('error/500')
  @ApiOperation({ summary: 'Força um erro 500 Internal Server Error' })
  @ApiResponse({ status: 500, description: 'Erro interno simulado' })
  forceInternalError(): never {
    throw new InternalServerErrorException('Erro interno simulado para testes de observabilidade');
  }

  @Get('error/502')
  @ApiOperation({ summary: 'Força um erro 502 Bad Gateway' })
  @ApiResponse({ status: 502, description: 'Bad gateway simulado' })
  forceBadGateway(): never {
    throw new HttpException('Bad gateway simulado para testes de observabilidade', HttpStatus.BAD_GATEWAY);
  }
}
