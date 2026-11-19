import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { OrganizationRole } from '@prisma/client';

export class InviteOrganizationMemberDto {
  @ApiProperty({
    example: 'developer@example.com',
    description: 'Email of the user to invite to the organization',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiPropertyOptional({
    enum: OrganizationRole,
    default: OrganizationRole.MEMBER,
    description: 'Role to assign in the organization',
  })
  @IsOptional()
  @IsEnum(OrganizationRole, { message: 'Invalid organization role' })
  role?: OrganizationRole = OrganizationRole.MEMBER;
}
