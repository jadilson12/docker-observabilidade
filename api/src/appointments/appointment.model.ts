import { Appointment } from './appointment.entity.js';

export class AppointmentModel {
  constructor(
    readonly id: string,
    readonly title: string,
    readonly description: string | null,
    readonly scheduledAt: Date,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static fromEntity(e: Appointment): AppointmentModel {
    return new AppointmentModel(e.id, e.title, e.description, e.scheduledAt, e.createdAt, e.updatedAt);
  }
}
