import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TraceRepository } from '../common/decorators/trace.decorator.js';
import { Appointment } from './appointment.entity.js';
import { AppointmentModel } from './appointment.model.js';

@TraceRepository('appointments.repository', {
  findAll: {},
  findOne: { attrs: { '0': 'appointment.id' } },
  create: { counter: 'db.appointments.created.total' },
  update: { attrs: { '0': 'appointment.id' } },
  remove: { attrs: { '0': 'appointment.id' }, counter: 'db.appointments.removed.total' },
})
@Injectable()
export class AppointmentRepository {
  constructor(
    @InjectRepository(Appointment)
    private readonly repo: Repository<Appointment>,
  ) {}

  async findAll(): Promise<AppointmentModel[]> {
    const items = await this.repo.find({ order: { scheduledAt: 'ASC' } });
    return items.map((item) => AppointmentModel.fromEntity(item));
  }

  async findOne(id: string): Promise<AppointmentModel | null> {
    const item = await this.repo.findOne({ where: { id } });
    return item ? AppointmentModel.fromEntity(item) : null;
  }

  async create(data: Pick<Appointment, 'title' | 'description' | 'scheduledAt'>): Promise<AppointmentModel> {
    const item = this.repo.create(data);
    const saved = await this.repo.save(item);
    return AppointmentModel.fromEntity(saved);
  }

  async update(
    id: string,
    patch: Partial<Pick<Appointment, 'title' | 'description' | 'scheduledAt'>>,
  ): Promise<AppointmentModel | null> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) return null;
    Object.assign(item, patch);
    const saved = await this.repo.save(item);
    return AppointmentModel.fromEntity(saved);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
