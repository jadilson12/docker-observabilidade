import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TraceRepository } from '../common/decorators/trace.decorator.js';
import { User } from './user.entity.js';
import { UserModel } from './user.model.js';

export type UserCreateData = Pick<User, 'name' | 'email'> &
  Partial<Pick<User, 'cep' | 'logradouro' | 'numero' | 'complemento' | 'bairro' | 'cidade' | 'estado'>>;

export type UserPatchData = Partial<
  Pick<User, 'name' | 'email' | 'cep' | 'logradouro' | 'numero' | 'complemento' | 'bairro' | 'cidade' | 'estado'>
>;

@TraceRepository('users.repository', {
  findPaginated: { attrs: { '0': 'db.query.skip', '1': 'db.query.take' } },
  findOne: { attrs: { '0': 'user.id' } },
  create: { counter: 'db.users.created.total' },
  update: { attrs: { '0': 'user.id' } },
  remove: { attrs: { '0': 'user.id' }, counter: 'db.users.removed.total' },
})
@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findPaginated(skip: number, take: number): Promise<[UserModel[], number]> {
    const [users, total] = await this.repo.findAndCount({
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
    return [users.map((u) => UserModel.fromEntity(u)), total];
  }

  async findOne(id: string): Promise<UserModel | null> {
    const user = await this.repo.findOne({ where: { id } });
    return user ? UserModel.fromEntity(user) : null;
  }

  async create(data: UserCreateData): Promise<UserModel> {
    const user = this.repo.create(data);
    const saved = await this.repo.save(user);
    return UserModel.fromEntity(saved);
  }

  async update(id: string, patch: UserPatchData): Promise<UserModel | null> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) return null;
    Object.assign(user, patch);
    const saved = await this.repo.save(user);
    return UserModel.fromEntity(saved);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
