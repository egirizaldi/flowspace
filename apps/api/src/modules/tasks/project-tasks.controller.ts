import {
  Controller,
  Post,
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
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('Tasks')
@ApiCookieAuth('flowspace_session')
@Controller('projects/:projectId/tasks')
@UseGuards(AuthGuard)
export class ProjectTasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new task in a project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - validation failure or invalid related resources',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have permission to create tasks in this project',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  async createTask(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser('id') userId: string,
  ) {
    const task = await this.tasksService.createTask(projectId, userId, dto);
    return {
      success: true,
      message: 'Task created successfully',
      data: task,
    };
  }
}
