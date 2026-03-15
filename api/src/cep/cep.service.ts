import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

export interface CepResult {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
}

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: string | boolean;
}

@Injectable()
export class CepService {
  async lookup(cep: string): Promise<CepResult> {
    const normalized = cep.replace(/\D/g, '');
    if (normalized.length !== 8) {
      throw new BadRequestException('CEP inválido: deve conter 8 dígitos');
    }

    let data: ViaCepResponse;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${normalized}/json/`);
      if (!res.ok) {
        throw new BadGatewayException('Serviço de CEP indisponível');
      }
      data = (await res.json()) as ViaCepResponse;
    } catch (err) {
      if (err instanceof BadGatewayException) throw err;
      throw new BadGatewayException('Erro ao consultar serviço de CEP');
    }

    if (data.erro) {
      throw new NotFoundException(`CEP ${normalized} não encontrado`);
    }

    return {
      cep: normalized,
      logradouro: data.logradouro ?? '',
      bairro: data.bairro ?? '',
      cidade: data.localidade ?? '',
      estado: data.uf ?? '',
    };
  }
}
