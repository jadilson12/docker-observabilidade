import type { AppointmentModel } from './appointment.model.js';

export interface AppointmentPresenter {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
}

export function toAppointmentPresenter(model: AppointmentModel): AppointmentPresenter {
  return {
    id: model.id,
    title: model.title,
    description: model.description,
    scheduledAt: model.scheduledAt.toISOString(),
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
  };
}

export function toAppointmentPresenterList(models: AppointmentModel[]): AppointmentPresenter[] {
  return models.map(toAppointmentPresenter);
}
