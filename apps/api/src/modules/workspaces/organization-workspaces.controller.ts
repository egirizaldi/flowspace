import {
  Controller,
  Post,
  Get,
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
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('Workspaces')
@ApiCookieAuth('flowspace_session')
@Controller('organizations/:organizationId/workspaces')
@UseGuards(AuthGuard)
export class OrganizationWorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new workspace within an organization' })
  @ApiResponse({
    status: 201,
    description: 'Workspace created successfully',
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
    description: 'Forbidden - user does not belong to organization',
  })
  @ApiResponse({
    status: 409,
    description: 'Workspace with this slug already exists in this organization',
  })
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWorkspaceDto,
  ) {
    const workspace = await this.workspacesService.create(
      organizationId,
      userId,
      dto,
    );

    return {
      success: true,
      message: 'Workspace created successfully',
      data: workspace,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List accessible workspaces in an organization for current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Workspaces retrieved successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not belong to organization',
  })
  async list(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    const workspaces =
      await this.workspacesService.listWorkspacesByOrganization(
        organizationId,
        userId,
      );

    return {
      success: true,
      message: 'Workspaces retrieved successfully',
      data: workspaces,
    };
  }
}
