import {
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority } from '@prisma/client';

export class UpdateTaskDto {
  @ApiPropertyOptional({
    example: 'Updated task title',
    description: 'Updated title of the task',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    example: 'Updated detailed description',
    description: 'Updated description of the task',
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    enum: TaskPriority,
    example: TaskPriority.HIGH,
    description: 'Updated priority level',
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    example: '2026-03-01',
    description: 'Planned start date in YYYY-MM-DD format',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @ApiPropertyOptional({
    example: '2026-03-15',
    description: 'Due date in YYYY-MM-DD format',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiProperty({
    example: 1,
    description: 'Current version of the task for optimistic concurrency check',
  })
  @IsInt()
  @Min(1)
  version: number;
}
