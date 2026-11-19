import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AcceptInvitationDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f6...',
    description: 'Raw invitation token received via email or link',
  })
  @IsString()
  @IsNotEmpty({ message: 'Invitation token is required' })
  token: string;
}
