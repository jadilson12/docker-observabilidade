import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateAppointmentDto {
  @ApiPropertyOptional({ example: 'Planning meeting' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Discuss Q2 goals' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: '2026-03-20T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
