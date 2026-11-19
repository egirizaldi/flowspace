import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { ProjectLifecycleStatus } from '@prisma/client';

export class CreateProjectDto {
  @ApiProperty({
    example: 'FlowSpace Web Application',
    description: 'Name of the project',
    minLength: 2,
    maxLength: 180,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Project name must be at least 2 characters' })
  @MaxLength(180, { message: 'Project name must not exceed 180 characters' })
  name: string;

  @ApiPropertyOptional({
    example: 'FLOW',
    description: 'Unique project identifier key within workspace (uppercase alphanumeric, 2-10 chars)',
    minLength: 2,
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Project key must be at least 2 characters' })
  @MaxLength(10, { message: 'Project key must not exceed 10 characters' })
  @Matches(/^[A-Za-z0-9]+$/, {
    message: 'Project key must contain only letters and numbers',
  })
  key?: string;

  @ApiPropertyOptional({
    example: 'Core platform web application development and issues',
    description: 'Project description',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description must not exceed 1000 characters' })
  description?: string;

  @ApiPropertyOptional({
    enum: ProjectLifecycleStatus,
    default: ProjectLifecycleStatus.PLANNING,
    description: 'Project lifecycle status',
  })
  @IsOptional()
  @IsEnum(ProjectLifecycleStatus, {
    message: 'Status must be a valid ProjectLifecycleStatus (PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED)',
  })
  status?: ProjectLifecycleStatus;

  @ApiPropertyOptional({
    example: '2026-11-19',
    description: 'Planned project start date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid ISO date string' })
  startDate?: string;

  @ApiPropertyOptional({
    example: '2027-01-30',
    description: 'Planned project due date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'dueDate must be a valid ISO date string' })
  dueDate?: string;
}
