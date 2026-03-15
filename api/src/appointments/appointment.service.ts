import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TraceService } from '../common/decorators/trace.decorator.js';
import { AppointmentModel } from './appointment.model.js';
import { AppointmentRepository } from './appointment.repository.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { UpdateAppointmentDto } from './dto/update-appointment.dto.js';

@Injectable()
@TraceService('appointments', {
  findAll: {},
  findOne: { attrs: { '0': 'appointment.id' } },
  create: { counter: 'appointments.created.total' },
  update: { attrs: { '0': 'appointment.id' } },
  remove: { attrs: { '0': 'appointment.id' }, counter: 'appointments.deleted.total' },
})
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(private readonly appointmentRepository: AppointmentRepository) {}

  async findAll(): Promise<AppointmentModel[]> {
    const items = await this.appointmentRepository.findAll();
    this.logger.log(`findAll: returned ${items.length} appointment(s)`);
    return items;
  }

  async findOne(id: string): Promise<AppointmentModel> {
    const item = await this.appointmentRepository.findOne(id);
    if (!item) {
      this.logger.warn(`findOne: appointment ${id} not found`);
      throw new NotFoundException(`Appointment ${id} not found`);
    }
    this.logger.log(`findOne: appointment ${id} found`);
    return item;
  }

  async create(dto: CreateAppointmentDto): Promise<AppointmentModel> {
    const item = await this.appointmentRepository.create({
      title: dto.title,
      description: dto.description ?? null,
      scheduledAt: new Date(dto.scheduledAt),
    });
    this.logger.log(`create: appointment created id=${item.id}`);
    return item;
  }

  async update(id: string, dto: UpdateAppointmentDto): Promise<AppointmentModel> {
    const patch: Partial<{ title: string; description: string | null; scheduledAt: Date }> = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.scheduledAt !== undefined) patch.scheduledAt = new Date(dto.scheduledAt);

    const updated = await this.appointmentRepository.update(id, patch);
    if (!updated) {
      this.logger.warn(`update: appointment ${id} not found`);
      throw new NotFoundException(`Appointment ${id} not found`);
    }
    this.logger.log(`update: appointment ${id} updated`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const item = await this.appointmentRepository.findOne(id);
    if (!item) {
      this.logger.warn(`remove: appointment ${id} not found`);
      throw new NotFoundException(`Appointment ${id} not found`);
    }
    await this.appointmentRepository.remove(id);
    this.logger.log(`remove: appointment ${id} removed`);
  }
}
