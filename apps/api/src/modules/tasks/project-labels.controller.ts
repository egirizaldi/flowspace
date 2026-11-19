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
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('Labels')
@ApiCookieAuth('flowspace_session')
@Controller('projects/:projectId/labels')
@UseGuards(AuthGuard)
export class ProjectLabelsController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all labels in a project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({
    status: 200,
    description: 'Labels retrieved successfully',
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
  async listLabels(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
  ) {
    const labels = await this.tasksService.listProjectLabels(projectId, userId);
    return {
      success: true,
      message: 'Project labels retrieved successfully',
      data: labels,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new label in a project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({
    status: 201,
    description: 'Label created successfully',
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
    status: 409,
    description: 'Conflict - label with this name already exists in this project',
  })
  async createLabel(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateLabelDto,
    @CurrentUser('id') userId: string,
  ) {
    const label = await this.tasksService.createProjectLabel(
      projectId,
      userId,
      dto,
    );
    return {
      success: true,
      message: 'Project label created successfully',
      data: label,
    };
  }

  @Patch(':labelId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a project label' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'labelId', description: 'Label UUID' })
  @ApiResponse({
    status: 200,
    description: 'Label updated successfully',
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
    description: 'Label not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - label with this name already exists in this project',
  })
  async updateLabel(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
    @Body() dto: UpdateLabelDto,
    @CurrentUser('id') userId: string,
  ) {
    const label = await this.tasksService.updateProjectLabel(
      projectId,
      labelId,
      userId,
      dto,
    );
    return {
      success: true,
      message: 'Project label updated successfully',
      data: label,
    };
  }

  @Delete(':labelId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a project label' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'labelId', description: 'Label UUID' })
  @ApiResponse({
    status: 200,
    description: 'Label deleted successfully',
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
    description: 'Label not found',
  })
  async deleteLabel(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.tasksService.deleteProjectLabel(
      projectId,
      labelId,
      userId,
    );
    return {
      success: true,
      message: 'Project label deleted successfully',
      data: result,
    };
  }
}
