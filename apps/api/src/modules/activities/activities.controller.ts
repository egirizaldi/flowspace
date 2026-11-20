import {
  Controller,
  Get,
  Param,
  Query,
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
import { ActivitiesService } from './activities.service';
import { QueryActivitiesDto } from './dto/query-activities.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('Activities')
@ApiCookieAuth('flowspace_session')
@Controller()
@UseGuards(AuthGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get('tasks/:taskId/activities')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get task audit activity log' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiResponse({
    status: 200,
    description: 'Task activities retrieved successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no task access' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getTaskActivities(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser('id') userId: string,
    @Query() query: QueryActivitiesDto,
  ) {
    const result = await this.activitiesService.getTaskActivities(
      taskId,
      userId,
      query,
    );
    return {
      success: true,
      message: 'Task activities retrieved successfully',
      data: result.activities,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  @Get('projects/:projectId/activities')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get project audit activity log' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({
    status: 200,
    description: 'Project activities retrieved successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no project access' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getProjectActivities(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
    @Query() query: QueryActivitiesDto,
  ) {
    const result = await this.activitiesService.getProjectActivities(
      projectId,
      userId,
      query,
    );
    return {
      success: true,
      message: 'Project activities retrieved successfully',
      data: result.activities,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }
}
