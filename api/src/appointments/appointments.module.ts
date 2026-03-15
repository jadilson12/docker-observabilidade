import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './appointment.entity.js';
import { AppointmentController } from './appointment.controller.js';
import { AppointmentRepository } from './appointment.repository.js';
import { AppointmentService } from './appointment.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment])],
  controllers: [AppointmentController],
  providers: [AppointmentService, AppointmentRepository],
})
export class AppointmentsModule {}
