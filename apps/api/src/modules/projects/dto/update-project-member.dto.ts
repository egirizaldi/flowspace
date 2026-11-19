import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum } from 'class-validator';
import { ProjectRole } from '@prisma/client';

export class UpdateProjectMemberDto {
  @ApiProperty({
    enum: ProjectRole,
    example: ProjectRole.VIEWER,
    description: 'Updated role of the member in the project (MANAGER, MEMBER, VIEWER)',
  })
  @IsEnum(ProjectRole, {
    message: 'role must be a valid ProjectRole (MANAGER, MEMBER, VIEWER)',
  })
  @IsNotEmpty({ message: 'role is required' })
  role: ProjectRole;
}
