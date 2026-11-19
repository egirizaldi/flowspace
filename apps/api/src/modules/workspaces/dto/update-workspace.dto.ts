import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class UpdateWorkspaceDto {
  @ApiPropertyOptional({
    example: 'Frontend Architecture',
    description: 'Updated workspace name',
    minLength: 2,
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Workspace name must be at least 2 characters' })
  @MaxLength(150, { message: 'Workspace name must not exceed 150 characters' })
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated workspace description for frontend team and components',
    description: 'Updated description of the workspace',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;
}
