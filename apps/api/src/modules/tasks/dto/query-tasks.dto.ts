import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsUUID,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority } from '@prisma/client';
import { DUE_DATE_STATUSES, DueDateStatus } from './query-board.dto';

export class QueryTasksDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Page number for pagination',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Number of items per page',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'auth',
    description: 'Search string matching title or description',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filter by workflow status ID',
  })
  @IsOptional()
  @IsUUID('4')
  statusId?: string;

  @ApiPropertyOptional({
    enum: TaskPriority,
    example: TaskPriority.HIGH,
    description: 'Filter by priority level',
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Filter by assignee user ID or "UNASSIGNED"',
  })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440002',
    description: 'Filter by label ID',
  })
  @IsOptional()
  @IsUUID('4')
  labelId?: string;

  @ApiPropertyOptional({
    enum: DUE_DATE_STATUSES,
    example: 'OVERDUE',
    description: 'Filter tasks by due date status (OVERDUE, TODAY, THIS_WEEK, NO_DUE_DATE)',
  })
  @IsOptional()
  @IsIn(DUE_DATE_STATUSES)
  dueDateStatus?: DueDateStatus;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440002',
    description: 'Filter by parent task ID',
  })
  @IsOptional()
  @IsUUID('4')
  parentTaskId?: string;
}
