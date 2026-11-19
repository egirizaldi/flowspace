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
import { TasksService } from './tasks.service';
import { QueryBoardDto } from './dto/query-board.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('Kanban Board')
@ApiCookieAuth('flowspace_session')
@Controller('projects/:projectId/board')
@UseGuards(AuthGuard)
export class ProjectBoardController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get project kanban board grouped by workflow status columns',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({
    status: 200,
    description: 'Kanban board retrieved successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have permission to view this project',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  async getBoard(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: QueryBoardDto,
    @CurrentUser('id') userId: string,
  ) {
    const board = await this.tasksService.getKanbanBoard(
      projectId,
      userId,
      query,
    );
    return {
      success: true,
      message: 'Kanban board retrieved successfully',
      data: board,
    };
  }
}
