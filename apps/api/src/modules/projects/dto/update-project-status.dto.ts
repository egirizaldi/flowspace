import {
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
  Matches,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatusCategory } from '@prisma/client';

export class UpdateProjectStatusDto {
  @ApiPropertyOptional({
    example: 'Quality Assurance',
    description: 'Updated name of the status',
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({
    enum: ProjectStatusCategory,
    example: ProjectStatusCategory.IN_PROGRESS,
    description: 'Updated category for this status',
  })
  @IsOptional()
  @IsEnum(ProjectStatusCategory)
  category?: ProjectStatusCategory;

  @ApiPropertyOptional({
    example: '#a855f7',
    description: 'Updated hex color code for the status badge',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'color must be a valid 6-character hex color code (e.g. #a855f7)',
  })
  color?: string;

  @ApiPropertyOptional({
    example: 3500,
    description: 'Updated position order of the status',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Designate this status as the default initial status for new tasks',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
