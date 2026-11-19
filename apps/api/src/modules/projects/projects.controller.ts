import {
  Controller,
  Get,
  Patch,
  Post,
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
import { UpdateProjectDto } from './dto/update-project.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('Projects')
@ApiCookieAuth('flowspace_session')
@Controller('projects')
@UseGuards(AuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get(':projectId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get project details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Project details retrieved successfully',
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
  async findById(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
  ) {
    const project = await this.projectsService.findById(projectId, userId);

    return {
      success: true,
      message: 'Project retrieved successfully',
      data: project,
    };
  }

  @Patch(':projectId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update project details' })
  @ApiResponse({
    status: 200,
    description: 'Project updated successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
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
    description: 'Project not found',
  })
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const updated = await this.projectsService.update(projectId, userId, dto);

    return {
      success: true,
      message: 'Project updated successfully',
      data: updated,
    };
  }

  @Post(':projectId/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive project' })
  @ApiResponse({
    status: 200,
    description: 'Project archived successfully',
    type: ApiResponseDto,
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
    description: 'Project not found',
  })
  async archive(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
  ) {
    const archived = await this.projectsService.archive(projectId, userId);

    return {
      success: true,
      message: 'Project archived successfully',
      data: archived,
    };
  }

  @Post(':projectId/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore archived project' })
  @ApiResponse({
    status: 200,
    description: 'Project restored successfully',
    type: ApiResponseDto,
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
    description: 'Project not found',
  })
  async restore(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
  ) {
    const restored = await this.projectsService.restore(projectId, userId);

    return {
      success: true,
      message: 'Project restored successfully',
      data: restored,
    };
  }

  @Delete(':projectId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete project' })
  @ApiResponse({
    status: 200,
    description: 'Project deleted successfully',
    type: ApiResponseDto,
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
    description: 'Project not found',
  })
  async delete(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.projectsService.delete(projectId, userId);

    return {
      success: true,
      message: 'Project deleted successfully',
    };
  }
}
