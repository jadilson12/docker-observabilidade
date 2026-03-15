import { ConflictException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CepService } from '../cep/cep.service.js';
import { TraceService } from '../common/decorators/trace.decorator.js';
import { PaginatedResponse } from '../common/dto/paginated-response.dto.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserModel } from './user.model.js';
import { validateUserOrThrow } from './user.validator.js';
import { UserCreateData, UserPatchData, UsersRepository } from './users.repository.js';

@Injectable()
@TraceService('users', {
  findAll: { attrs: { '0.page': 'pagination.page', '0.limit': 'pagination.limit' } },
  findOne: { attrs: { '0': 'user.id' } },
  create: { counter: 'users.created.total' },
  update: { attrs: { '0': 'user.id' } },
  remove: { attrs: { '0': 'user.id' }, counter: 'users.deleted.total' },
})
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly cepService: CepService,
  ) {}

  private async findOneOrFail(id: string, context: string): Promise<UserModel> {
    const user = await this.usersRepository.findOne(id);
    if (!user) {
      this.logger.warn(`${context}: usuário ${id} não encontrado`);
      throw new NotFoundException(`Usuário ${id} não encontrado`);
    }
    return user;
  }

  private handleSaveError(err: unknown, context: string, conflictMessage: string): never {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as Record<string, unknown>).code === '23505') {
      this.logger.warn(`${context}: ${conflictMessage}`);
      throw new ConflictException(conflictMessage);
    }
    this.logger.error(`${context}: erro ao salvar`, err instanceof Error ? err.stack : String(err));
    throw err;
  }

  async findAll(pagination: PaginationQueryDto): Promise<PaginatedResponse<UserModel>> {
    const [users, total] = await this.usersRepository.findPaginated(pagination.skip, pagination.limit);
    this.logger.log(`findAll: retornou ${users.length}/${total} usuário(s) (page=${pagination.page})`);
    return new PaginatedResponse(users, total, pagination.page, pagination.limit);
  }

  async findOne(id: string): Promise<UserModel> {
    const user = await this.findOneOrFail(id, 'findOne');
    this.logger.log(`findOne: encontrou usuário ${id}`);
    return user;
  }

  async create(dto: CreateUserDto): Promise<UserModel> {
    validateUserOrThrow(dto);

    const data: UserCreateData = { name: dto.name, email: dto.email };

    if (dto.cep) {
      const addr = await this.cepService.lookup(dto.cep);
      data.cep = addr.cep;
      data.logradouro = addr.logradouro;
      data.bairro = addr.bairro;
      data.cidade = addr.cidade;
      data.estado = addr.estado;
      data.numero = dto.numero ?? null;
      data.complemento = dto.complemento ?? null;
    }

    try {
      const user = await this.usersRepository.create(data);
      this.logger.log(`create: usuário criado id=${user.id} email=${user.email}`);
      return user;
    } catch (err: unknown) {
      this.handleSaveError(err, 'create', `E-mail ${dto.email} já está em uso`);
    }
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserModel> {
    validateUserOrThrow(dto);

    const patch: UserPatchData = Object.fromEntries(
      Object.entries({ name: dto.name, email: dto.email }).filter(([, v]) => v !== undefined),
    );

    if (dto.cep) {
      const addr = await this.cepService.lookup(dto.cep);
      patch.cep = addr.cep;
      patch.logradouro = addr.logradouro;
      patch.bairro = addr.bairro;
      patch.cidade = addr.cidade;
      patch.estado = addr.estado;
      patch.numero = dto.numero ?? null;
      patch.complemento = dto.complemento ?? null;
    } else if (dto.numero !== undefined || dto.complemento !== undefined) {
      // atualiza apenas numero/complemento sem mudar o restante do endereço
      if (dto.numero !== undefined) patch.numero = dto.numero;
      if (dto.complemento !== undefined) patch.complemento = dto.complemento;
    }

    try {
      const updated = await this.usersRepository.update(id, patch);
      if (!updated) {
        this.logger.warn(`update: usuário ${id} não encontrado`);
        throw new NotFoundException(`Usuário ${id} não encontrado`);
      }
      this.logger.log(`update: usuário ${id} atualizado`);
      return updated;
    } catch (err: unknown) {
      if (err instanceof NotFoundException) throw err;
      this.handleSaveError(err, 'update', `E-mail já está em uso por outro usuário`);
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOneOrFail(id, 'remove');
    try {
      await this.usersRepository.remove(id);
      this.logger.log(`remove: usuário ${id} removido`);
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as Record<string, unknown>).code === '23503'
      ) {
        this.logger.warn(`remove: usuário ${id} possui vínculos e não pode ser removido`);
        throw new UnprocessableEntityException(`Usuário ${id} possui vínculos e não pode ser removido`);
      }
      this.logger.error(`remove: erro ao remover usuário id=${id}`, err instanceof Error ? err.stack : String(err));
      throw err;
    }
  }
}
