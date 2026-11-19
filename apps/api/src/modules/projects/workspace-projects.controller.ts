import {
  Controller,
  Post,
  Get,
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
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('Projects')
@ApiCookieAuth('flowspace_session')
@Controller('workspaces/:workspaceId/projects')
@UseGuards(AuthGuard)
export class WorkspaceProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new project within a workspace' })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or invalid key',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have permission in this workspace',
  })
  @ApiResponse({
    status: 404,
    description: 'Workspace not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Project key already exists in this workspace',
  })
  async create(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProjectDto,
  ) {
    const project = await this.projectsService.create(workspaceId, userId, dto);

    return {
      success: true,
      message: 'Project created successfully',
      data: project,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List projects in a workspace' })
  @ApiResponse({
    status: 200,
    description: 'Projects retrieved successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have access to this workspace',
  })
  @ApiResponse({
    status: 404,
    description: 'Workspace not found',
  })
  async list(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @CurrentUser('id') userId: string,
    @Query() query: QueryProjectsDto,
  ) {
    const { projects, meta } = await this.projectsService.listByWorkspace(
      workspaceId,
      userId,
      query,
    );

    return {
      success: true,
      message: 'Projects retrieved successfully',
      data: projects,
      meta,
    };
  }
}
