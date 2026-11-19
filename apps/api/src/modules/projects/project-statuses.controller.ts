import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
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
  ApiParam,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectStatusDto } from './dto/create-project-status.dto';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';
import { ReorderProjectStatusesDto } from './dto/reorder-project-statuses.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('Projects')
@ApiCookieAuth('flowspace_session')
@Controller('projects/:projectId/statuses')
@UseGuards(AuthGuard)
export class ProjectStatusesController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all workflow statuses of a project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({
    status: 200,
    description: 'Project statuses retrieved successfully',
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
  async listStatuses(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
  ) {
    const statuses = await this.projectsService.listStatuses(projectId, userId);
    return {
      success: true,
      message: 'Project statuses retrieved successfully',
      data: statuses,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new workflow status for a project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({
    status: 201,
    description: 'Project status created successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - validation failure',
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
  async createStatus(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectStatusDto,
    @CurrentUser('id') userId: string,
  ) {
    const status = await this.projectsService.createStatus(
      projectId,
      userId,
      dto,
    );
    return {
      success: true,
      message: 'Project status created successfully',
      data: status,
    };
  }

  @Put('reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder workflow statuses of a project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({
    status: 200,
    description: 'Project statuses reordered successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid status IDs provided',
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
  async reorderStatuses(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: ReorderProjectStatusesDto,
    @CurrentUser('id') userId: string,
  ) {
    const statuses = await this.projectsService.reorderStatuses(
      projectId,
      userId,
      dto,
    );
    return {
      success: true,
      message: 'Project statuses reordered successfully',
      data: statuses,
    };
  }

  @Patch(':statusId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a workflow status' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'statusId', description: 'Status UUID' })
  @ApiResponse({
    status: 200,
    description: 'Project status updated successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - validation failure',
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
    description: 'Project or status not found',
  })
  async updateStatus(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('statusId', ParseUUIDPipe) statusId: string,
    @Body() dto: UpdateProjectStatusDto,
    @CurrentUser('id') userId: string,
  ) {
    const status = await this.projectsService.updateStatus(
      projectId,
      statusId,
      userId,
      dto,
    );
    return {
      success: true,
      message: 'Project status updated successfully',
      data: status,
    };
  }

  @Delete(':statusId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an unused workflow status' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'statusId', description: 'Status UUID' })
  @ApiResponse({
    status: 200,
    description: 'Project status deleted successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - cannot delete default status or only status',
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
    description: 'Project or status not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - status currently assigned to existing tasks',
  })
  async deleteStatus(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('statusId', ParseUUIDPipe) statusId: string,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.projectsService.deleteStatus(
      projectId,
      statusId,
      userId,
    );
    return {
      success: true,
      message: 'Project status deleted successfully',
      data: result,
    };
  }
}
