import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsUrl,
  ValidateIf,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'Ada Lovelace',
    description: 'Updated user full name',
    minLength: 2,
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(120, { message: 'Name must not exceed 120 characters' })
  name?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.png',
    description: 'Updated avatar URL, or null to clear',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUrl({}, { message: 'Avatar URL must be a valid URL' })
  avatarUrl?: string | null;
}
