import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateWorkspaceDto {
  @ApiProperty({
    example: 'Frontend Engineering',
    description: 'Name of the workspace',
    minLength: 2,
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Workspace name must be at least 2 characters' })
  @MaxLength(150, { message: 'Workspace name must not exceed 150 characters' })
  name: string;

  @ApiPropertyOptional({
    example: 'frontend-eng',
    description: 'URL slug for workspace (unique per organization)',
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
    example: 'Workspace for Next.js web application and UI components',
    description: 'Brief description of the workspace',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;
}
