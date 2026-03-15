import { User } from './user.entity.js';

export interface UserFields {
  name: string;
  email: string;
}

export interface AddressData {
  cep: string;
  logradouro: string;
  numero: string | null;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
}

export class UserModel {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly email: string,
    readonly address: AddressData | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static fromEntity(entity: User): UserModel {
    const address: AddressData | null = entity.cep
      ? {
          cep: entity.cep,
          logradouro: entity.logradouro ?? '',
          numero: entity.numero,
          complemento: entity.complemento,
          bairro: entity.bairro ?? '',
          cidade: entity.cidade ?? '',
          estado: entity.estado ?? '',
        }
      : null;

    return new UserModel(entity.id, entity.name, entity.email, address, entity.createdAt, entity.updatedAt);
  }
}
