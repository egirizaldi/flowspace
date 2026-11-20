import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
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
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { QueryCommentsDto } from './dto/query-comments.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('Comments')
@ApiCookieAuth('flowspace_session')
@Controller('tasks/:taskId/comments')
@UseGuards(AuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a comment on a task' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no task access' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async createComment(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    const comment = await this.commentsService.createComment(taskId, userId, dto);
    return {
      success: true,
      message: 'Comment created successfully',
      data: comment,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List comments on a task with pagination' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no task access' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getComments(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser('id') userId: string,
    @Query() query: QueryCommentsDto,
  ) {
    const result = await this.commentsService.getTaskComments(taskId, userId, query);
    return {
      success: true,
      message: 'Comments retrieved successfully',
      data: result.comments,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  @Patch(':commentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a comment (author or project manager)' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiParam({ name: 'commentId', description: 'Comment UUID' })
  @ApiResponse({
    status: 200,
    description: 'Comment updated successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not author or manager' })
  @ApiResponse({ status: 404, description: 'Comment or task not found' })
  async updateComment(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    const comment = await this.commentsService.updateComment(
      taskId,
      commentId,
      userId,
      dto,
    );
    return {
      success: true,
      message: 'Comment updated successfully',
      data: comment,
    };
  }

  @Delete(':commentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a comment (author or project manager)' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiParam({ name: 'commentId', description: 'Comment UUID' })
  @ApiResponse({
    status: 200,
    description: 'Comment deleted successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not author or manager' })
  @ApiResponse({ status: 404, description: 'Comment or task not found' })
  async deleteComment(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.commentsService.deleteComment(
      taskId,
      commentId,
      userId,
    );
    return {
      success: true,
      message: result.message,
    };
  }
}
