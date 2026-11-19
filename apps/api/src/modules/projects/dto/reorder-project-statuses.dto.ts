import { IsArray, ArrayMinSize, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderProjectStatusesDto {
  @ApiProperty({
    example: [
      'c7b2e3e2-8924-4db2-901a-874dbd20ad2b',
      'e1a5a828-569d-4395-8a90-8747bc2a0c4f',
    ],
    description: 'Ordered list of status IDs representing the new workflow sequence',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  statusIds: string[];
}
