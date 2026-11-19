import { IsUUID, IsInt, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignTaskDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'User UUID to assign to the task, or null to unassign',
  })
  @IsOptional()
  @IsUUID('4')
  assigneeId?: string | null;

  @ApiProperty({
    example: 1,
    description: 'Current version of the task for optimistic concurrency check',
  })
  @IsInt()
  @Min(1)
  version: number;
}
