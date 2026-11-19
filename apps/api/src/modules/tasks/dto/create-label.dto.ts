import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLabelDto {
  @ApiProperty({
    example: 'Backend',
    description: 'Name of the label',
    maxLength: 80,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @ApiProperty({
    example: '#3b82f6',
    description: 'Hex color code for the label badge',
  })
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'color must be a valid 6-character hex color code (e.g. #3b82f6)',
  })
  color: string;
}
