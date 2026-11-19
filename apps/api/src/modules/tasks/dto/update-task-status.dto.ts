import { IsUUID, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTaskStatusDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Target workflow status UUID',
  })
  @IsUUID('4')
  statusId: string;

  @ApiProperty({
    example: 1,
    description: 'Current version of the task for optimistic concurrency check',
  })
  @IsInt()
  @Min(1)
  version: number;
}
