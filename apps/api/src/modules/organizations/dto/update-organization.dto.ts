import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsUrl,
  ValidateIf,
} from 'class-validator';

export class UpdateOrganizationDto {
  @ApiPropertyOptional({
    example: 'Acme Global Corp',
    description: 'Updated organization name',
    minLength: 2,
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Organization name must be at least 2 characters' })
  @MaxLength(150, { message: 'Organization name must not exceed 150 characters' })
  name?: string;

  @ApiPropertyOptional({
    example: 'Leading provider of next-generation collaborative workflows',
    description: 'Updated organization description',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/new-logo.png',
    description: 'Updated logo URL, or null to clear',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUrl({}, { message: 'Logo URL must be a valid URL' })
  logoUrl?: string | null;
}
