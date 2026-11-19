import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('Projects')
@ApiCookieAuth('flowspace_session')
@Controller('projects/:projectId/members')
@UseGuards(AuthGuard)
export class ProjectMembersController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List members of a project' })
  @ApiResponse({
    status: 200,
    description: 'Project members retrieved successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have permission to view project',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  async list(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
  ) {
    const members = await this.projectsService.listMembers(projectId, userId);

    return {
      success: true,
      message: 'Project members retrieved successfully',
      data: members,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new member to the project' })
  @ApiResponse({
    status: 201,
    description: 'Member added to project successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or user is not a workspace member',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have permission to manage project',
  })
  @ApiResponse({
    status: 404,
    description: 'Project or user not found',
  })
  @ApiResponse({
    status: 409,
    description: 'User is already a member of this project',
  })
  async add(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: AddProjectMemberDto,
  ) {
    const member = await this.projectsService.addMember(
      projectId,
      actorId,
      dto,
    );

    return {
      success: true,
      message: 'Member added to project successfully',
      data: member,
    };
  }

  @Patch(':memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update project member role' })
  @ApiResponse({
    status: 200,
    description: 'Project member role updated successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot demote the only Manager in this project',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have permission to manage project',
  })
  @ApiResponse({
    status: 404,
    description: 'Project or member not found',
  })
  async updateRole(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: UpdateProjectMemberDto,
  ) {
    const updated = await this.projectsService.updateMemberRole(
      projectId,
      memberId,
      actorId,
      dto,
    );

    return {
      success: true,
      message: 'Project member role updated successfully',
      data: updated,
    };
  }

  @Delete(':memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove member from project' })
  @ApiResponse({
    status: 200,
    description: 'Member removed from project successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot remove the only Manager in this project',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have permission to remove member',
  })
  @ApiResponse({
    status: 404,
    description: 'Project or member not found',
  })
  async remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser('id') actorId: string,
  ) {
    await this.projectsService.removeMember(projectId, memberId, actorId);

    return {
      success: true,
      message: 'Member removed from project successfully',
    };
  }
}
