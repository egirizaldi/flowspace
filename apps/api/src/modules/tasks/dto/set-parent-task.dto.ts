import { IsUUID, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetParentTaskDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Parent task UUID, or null to detach from parent',
  })
  @IsOptional()
  @IsUUID('4')
  parentTaskId?: string | null;

  @ApiProperty({
    example: 1,
    description: 'Current version of the task for optimistic concurrency check',
  })
  @IsInt()
  @Min(1)
  version: number;
}
