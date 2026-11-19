import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { ProjectRole } from '@prisma/client';

export class InviteProjectMemberDto {
  @ApiProperty({
    example: 'developer@example.com',
    description: 'Email of the user to invite to the project',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiPropertyOptional({
    enum: ProjectRole,
    default: ProjectRole.MEMBER,
    description: 'Role to assign in the project',
  })
  @IsOptional()
  @IsEnum(ProjectRole, { message: 'Invalid project role' })
  role?: ProjectRole = ProjectRole.MEMBER;
}
