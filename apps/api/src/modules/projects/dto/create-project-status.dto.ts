import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsEnum,
  Matches,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatusCategory } from '@prisma/client';

export class CreateProjectStatusDto {
  @ApiProperty({
    example: 'In QA',
    description: 'Name of the status',
    maxLength: 80,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @ApiProperty({
    enum: ProjectStatusCategory,
    example: ProjectStatusCategory.IN_PROGRESS,
    description: 'Workflow category for this status',
  })
  @IsEnum(ProjectStatusCategory)
  category: ProjectStatusCategory;

  @ApiProperty({
    example: '#8b5cf6',
    description: 'Hex color code for the status badge',
  })
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'color must be a valid 6-character hex color code (e.g. #8b5cf6)',
  })
  color: string;

  @ApiPropertyOptional({
    example: 3000,
    description: 'Position order of the status in the board workflow',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether this status is the default initial status for new tasks',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
