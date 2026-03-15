import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppointmentService } from './appointment.service.js';
import { AppointmentPresenter, toAppointmentPresenter, toAppointmentPresenterList } from './appointment.presenter.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { UpdateAppointmentDto } from './dto/update-appointment.dto.js';

@ApiTags('appointments')
@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Get()
  @ApiOperation({ summary: 'List all appointments' })
  @ApiResponse({ status: 200, description: 'List of appointments' })
  @ApiResponse({ status: 401, description: 'Invalid or missing API key' })
  async findAll(): Promise<AppointmentPresenter[]> {
    const items = await this.appointmentService.findAll();
    return toAppointmentPresenterList(items);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment by ID' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @ApiResponse({ status: 200, description: 'Appointment found' })
  @ApiResponse({ status: 401, description: 'Invalid or missing API key' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  async findOne(@Param('id') id: string): Promise<AppointmentPresenter> {
    const item = await this.appointmentService.findOne(id);
    return toAppointmentPresenter(item);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create appointment' })
  @ApiResponse({ status: 201, description: 'Appointment created' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 401, description: 'Invalid or missing API key' })
  async create(@Body() dto: CreateAppointmentDto): Promise<AppointmentPresenter> {
    const item = await this.appointmentService.create(dto);
    return toAppointmentPresenter(item);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update appointment' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @ApiResponse({ status: 200, description: 'Appointment updated' })
  @ApiResponse({ status: 401, description: 'Invalid or missing API key' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto): Promise<AppointmentPresenter> {
    const item = await this.appointmentService.update(id, dto);
    return toAppointmentPresenter(item);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete appointment' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @ApiResponse({ status: 204, description: 'Appointment deleted' })
  @ApiResponse({ status: 401, description: 'Invalid or missing API key' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  remove(@Param('id') id: string): Promise<void> {
    return this.appointmentService.remove(id);
  }
}
