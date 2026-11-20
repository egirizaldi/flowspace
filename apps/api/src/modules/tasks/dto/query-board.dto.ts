import {
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority } from '@prisma/client';

export const DUE_DATE_STATUSES = [
  'OVERDUE',
  'TODAY',
  'THIS_WEEK',
  'NO_DUE_DATE',
] as const;
export type DueDateStatus = (typeof DUE_DATE_STATUSES)[number];

export class QueryBoardDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filter board tasks by assignee UUID or "UNASSIGNED"',
  })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({
    enum: TaskPriority,
    example: TaskPriority.HIGH,
    description: 'Filter board tasks by priority level',
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Filter board tasks by attached label UUID',
  })
  @IsOptional()
  @IsUUID('4')
  labelId?: string;

  @ApiPropertyOptional({
    enum: DUE_DATE_STATUSES,
    example: 'OVERDUE',
    description: 'Filter board tasks by due date status (OVERDUE, TODAY, THIS_WEEK, NO_DUE_DATE)',
  })
  @IsOptional()
  @IsIn(DUE_DATE_STATUSES)
  dueDateStatus?: DueDateStatus;

  @ApiPropertyOptional({
    example: 'auth',
    description: 'Search string matching task title or description',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether to include subtasks in board columns (defaults to false, showing only root tasks)',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeSubtasks?: boolean = false;
}
