import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({
    example: 'developer@example.com',
    description: 'Email address of the invitee',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    example: 'MEMBER',
    description: 'Role assigned upon accepting invitation',
  })
  @IsString()
  @IsNotEmpty({ message: 'Role is required' })
  role: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Target Organization ID',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Organization ID must be a valid UUID' })
  organizationId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Target Workspace ID',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Workspace ID must be a valid UUID' })
  workspaceId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440002',
    description: 'Target Project ID',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Project ID must be a valid UUID' })
  projectId?: string;
}
