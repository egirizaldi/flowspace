import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { ProjectLifecycleStatus } from '@prisma/client';

export class UpdateProjectDto {
  @ApiPropertyOptional({
    example: 'FlowSpace Web Core Application',
    description: 'Updated name of the project',
    minLength: 2,
    maxLength: 180,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Project name must be at least 2 characters' })
  @MaxLength(180, { message: 'Project name must not exceed 180 characters' })
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated project description',
    description: 'Project description',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description must not exceed 1000 characters' })
  description?: string;

  @ApiPropertyOptional({
    enum: ProjectLifecycleStatus,
    description: 'Project lifecycle status',
  })
  @IsOptional()
  @IsEnum(ProjectLifecycleStatus, {
    message: 'Status must be a valid ProjectLifecycleStatus',
  })
  status?: ProjectLifecycleStatus;

  @ApiPropertyOptional({
    example: '2026-11-20',
    description: 'Planned project start date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid ISO date string' })
  startDate?: string;

  @ApiPropertyOptional({
    example: '2027-02-15',
    description: 'Planned project due date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'dueDate must be a valid ISO date string' })
  dueDate?: string;
}
