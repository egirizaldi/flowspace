import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLabelDto {
  @ApiPropertyOptional({
    example: 'Platform Core',
    description: 'Updated name of the label',
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({
    example: '#2563eb',
    description: 'Updated hex color code for the label badge',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'color must be a valid 6-character hex color code (e.g. #2563eb)',
  })
  color?: string;
}
