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
  ApiParam,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { AttachLabelDto } from './dto/attach-label.dto';
import { SetParentTaskDto } from './dto/set-parent-task.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('Tasks')
@ApiCookieAuth('flowspace_session')
@Controller('tasks')
@UseGuards(AuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get(':taskId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get task details by ID' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiResponse({
    status: 200,
    description: 'Task details retrieved successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have permission to view this task',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  async getTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser('id') userId: string,
  ) {
    const task = await this.tasksService.findTaskById(taskId, userId);
    return {
      success: true,
      message: 'Task retrieved successfully',
      data: task,
    };
  }

  @Patch(':taskId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update task general details' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
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
    description: 'Forbidden - user does not have permission to edit this task',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - optimistic concurrency version mismatch',
  })
  async updateTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser('id') userId: string,
  ) {
    const task = await this.tasksService.updateTask(taskId, userId, dto);
    return {
      success: true,
      message: 'Task updated successfully',
      data: task,
    };
  }

  @Patch(':taskId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update task workflow status' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiResponse({
    status: 200,
    description: 'Task status updated successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid status or validation failure',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have permission to edit this task',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - optimistic concurrency version mismatch',
  })
  async updateTaskStatus(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser('id') userId: string,
  ) {
    const task = await this.tasksService.updateTaskStatus(taskId, userId, dto);
    return {
      success: true,
      message: 'Task status updated successfully',
      data: task,
    };
  }

  @Patch(':taskId/assignee')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update or clear task assignee' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiResponse({
    status: 200,
    description: 'Task assignee updated successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid assignee or validation failure',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have permission to edit this task',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - optimistic concurrency version mismatch',
  })
  async assignTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: AssignTaskDto,
    @CurrentUser('id') userId: string,
  ) {
    const task = await this.tasksService.assignTask(taskId, userId, dto);
    return {
      success: true,
      message: 'Task assignee updated successfully',
      data: task,
    };
  }

  @Delete(':taskId/assignee')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove assignee from task' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiResponse({
    status: 200,
    description: 'Task assignee removed successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have permission to edit this task',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  async removeAssignee(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser('id') userId: string,
  ) {
    const task = await this.tasksService.removeAssignee(taskId, userId);
    return {
      success: true,
      message: 'Task assignee removed successfully',
      data: task,
    };
  }

  @Get(':taskId/activities')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get task audit activity log' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiResponse({
    status: 200,
    description: 'Task activities retrieved successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have access to view this task',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  async getTaskActivities(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser('id') userId: string,
  ) {
    const activities = await this.tasksService.getTaskActivities(
      taskId,
      userId,
    );
    return {
      success: true,
      message: 'Task activities retrieved successfully',
      data: activities,
    };
  }

  @Patch(':taskId/move')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move task position within or between workflow columns' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiResponse({
    status: 200,
    description: 'Task position moved successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid status or validation failure',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have permission to edit this task',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - optimistic concurrency version mismatch',
  })
  async moveTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: MoveTaskDto,
    @CurrentUser('id') userId: string,
  ) {
    const task = await this.tasksService.moveTask(taskId, userId, dto);
    return {
      success: true,
      message: 'Task moved successfully',
      data: task,
    };
  }

  @Post(':taskId/labels')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Attach a label to a task' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiResponse({
    status: 200,
    description: 'Label attached to task successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - label does not belong to project or validation failure',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have permission to edit this task',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  async attachLabel(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: AttachLabelDto,
    @CurrentUser('id') userId: string,
  ) {
    const task = await this.tasksService.attachTaskLabel(taskId, userId, dto);
    return {
      success: true,
      message: 'Label attached to task successfully',
      data: task,
    };
  }

  @Delete(':taskId/labels/:labelId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a label from a task' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiParam({ name: 'labelId', description: 'Label UUID' })
  @ApiResponse({
    status: 200,
    description: 'Label removed from task successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have permission to edit this task',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  async detachLabel(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.tasksService.detachTaskLabel(
      taskId,
      labelId,
      userId,
    );
    return {
      success: true,
      message: 'Label removed from task successfully',
      data: result,
    };
  }

  @Post(':taskId/subtasks')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a subtask directly under this task' })
  @ApiParam({ name: 'taskId', description: 'Parent Task UUID' })
  @ApiResponse({
    status: 201,
    description: 'Subtask created successfully',
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
    description: 'Forbidden - user does not have permission to edit this task',
  })
  @ApiResponse({
    status: 404,
    description: 'Parent task not found',
  })
  async createSubtask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser('id') userId: string,
  ) {
    const subtask = await this.tasksService.createSubtask(taskId, userId, dto);
    return {
      success: true,
      message: 'Subtask created successfully',
      data: subtask,
    };
  }

  @Patch(':taskId/parent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set or update the parent task with circular check' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiResponse({
    status: 200,
    description: 'Parent task updated successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - circular parent relationship or invalid parent',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have permission to edit this task',
  })
  @ApiResponse({
    status: 404,
    description: 'Task or parent task not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - optimistic concurrency version mismatch',
  })
  async setParentTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: SetParentTaskDto,
    @CurrentUser('id') userId: string,
  ) {
    const task = await this.tasksService.setParentTask(taskId, userId, dto);
    return {
      success: true,
      message: 'Parent task updated successfully',
      data: task,
    };
  }

  @Delete(':taskId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a task' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiResponse({
    status: 200,
    description: 'Task deleted successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have permission to delete this task',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  async deleteTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.tasksService.deleteTask(taskId, userId);
    return {
      success: true,
      message: 'Task deleted successfully',
      data: result,
    };
  }
}
