import {
  Controller,
  Get,
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
} from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('Workspaces')
@ApiCookieAuth('flowspace_session')
@Controller('workspaces')
@UseGuards(AuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get(':workspaceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get workspace details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Workspace details retrieved successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have access to this workspace',
  })
  @ApiResponse({
    status: 404,
    description: 'Workspace not found',
  })
  async getWorkspaceDetail(
    @CurrentUser('id') userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ) {
    const workspace = await this.workspacesService.findByIdForUser(
      workspaceId,
      userId,
    );

    return {
      success: true,
      message: 'Workspace details retrieved successfully',
      data: workspace,
    };
  }

  @Patch(':workspaceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update workspace details (Owner/Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Workspace updated successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only workspace owners or admins can update',
  })
  @ApiResponse({
    status: 404,
    description: 'Workspace not found',
  })
  async updateWorkspace(
    @CurrentUser('id') userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    const workspace = await this.workspacesService.update(
      workspaceId,
      userId,
      dto,
    );

    return {
      success: true,
      message: 'Workspace updated successfully',
      data: workspace,
    };
  }

  @Delete(':workspaceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete workspace (Owner only)' })
  @ApiResponse({
    status: 200,
    description: 'Workspace deleted successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only workspace owner can delete',
  })
  @ApiResponse({
    status: 404,
    description: 'Workspace not found',
  })
  async deleteWorkspace(
    @CurrentUser('id') userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ) {
    await this.workspacesService.delete(workspaceId, userId);

    return {
      success: true,
      message: 'Workspace deleted successfully',
    };
  }
}
