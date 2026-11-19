import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsUrl,
  ValidateIf,
} from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({
    example: 'Acme Corporation',
    description: 'Name of the organization',
    minLength: 2,
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Organization name must be at least 2 characters' })
  @MaxLength(150, { message: 'Organization name must not exceed 150 characters' })
  name: string;

  @ApiPropertyOptional({
    example: 'acme-corp',
    description: 'URL slug for the organization (must be lowercase alphanumeric with hyphens)',
    minLength: 2,
    maxLength: 180,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Slug must be at least 2 characters' })
  @MaxLength(180, { message: 'Slug must not exceed 180 characters' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug can only contain lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @ApiPropertyOptional({
    example: 'Fast-growing software consultancy',
    description: 'Brief description of the organization',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/logo.png',
    description: 'URL to the organization logo',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUrl({}, { message: 'Logo URL must be a valid URL' })
  logoUrl?: string | null;
}
