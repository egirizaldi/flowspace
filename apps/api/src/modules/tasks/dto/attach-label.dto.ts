import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AttachLabelDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Label UUID to attach to the task',
  })
  @IsUUID('4')
  labelId: string;
}
