import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { WorkspaceRole } from '@prisma/client';

export class InviteWorkspaceMemberDto {
  @ApiProperty({
    example: 'developer@example.com',
    description: 'Email of the user to invite to the workspace',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiPropertyOptional({
    enum: WorkspaceRole,
    default: WorkspaceRole.MEMBER,
    description: 'Role to assign in the workspace',
  })
  @IsOptional()
  @IsEnum(WorkspaceRole, { message: 'Invalid workspace role' })
  role?: WorkspaceRole = WorkspaceRole.MEMBER;
}
