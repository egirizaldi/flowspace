import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority } from '@prisma/client';

export class CreateTaskDto {
  @ApiProperty({
    example: 'Setup authentication and session management',
    description: 'Title of the task',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    example: 'Implement Argon2id hashing, cookie sessions, and guards',
    description: 'Detailed description of the task',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Target workflow status ID. Defaults to the project default status if omitted',
  })
  @IsOptional()
  @IsUUID('4')
  statusId?: string;

  @ApiPropertyOptional({
    enum: TaskPriority,
    example: TaskPriority.MEDIUM,
    description: 'Priority level of the task',
    default: TaskPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'User ID of the assigned team member',
  })
  @IsOptional()
  @IsUUID('4')
  assigneeId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440002',
    description: 'Parent task ID if this task is a subtask',
  })
  @IsOptional()
  @IsUUID('4')
  parentTaskId?: string;

  @ApiPropertyOptional({
    example: '2026-03-01',
    description: 'Planned start date in YYYY-MM-DD format',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-03-15',
    description: 'Due date in YYYY-MM-DD format',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
