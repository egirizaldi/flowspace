import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsEnum } from 'class-validator';
import { ProjectRole } from '@prisma/client';

export class AddProjectMemberDto {
  @ApiProperty({
    example: 'd9b29e14-a035-4a64-a1f7-3e8a4a11f7c2',
    description: 'UUID of the user to add as project member',
  })
  @IsUUID('4', { message: 'userId must be a valid UUID' })
  @IsNotEmpty({ message: 'userId is required' })
  userId: string;

  @ApiProperty({
    enum: ProjectRole,
    example: ProjectRole.MEMBER,
    description: 'Role of the member in the project (MANAGER, MEMBER, VIEWER)',
  })
  @IsEnum(ProjectRole, {
    message: 'role must be a valid ProjectRole (MANAGER, MEMBER, VIEWER)',
  })
  @IsNotEmpty({ message: 'role is required' })
  role: ProjectRole;
}
