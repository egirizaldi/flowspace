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
import { InvitationsService } from './invitations.service';
import { InviteWorkspaceMemberDto } from './dto/invite-workspace-member.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('Invitations')
@ApiCookieAuth('flowspace_session')
@Controller('workspaces/:workspaceId/invitations')
@UseGuards(AuthGuard)
export class WorkspaceInvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite a new member to the workspace' })
  @ApiResponse({
    status: 201,
    description: 'Invitation created successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only workspace owners or admins can invite',
  })
  @ApiResponse({
    status: 404,
    description: 'Workspace not found',
  })
  @ApiResponse({
    status: 409,
    description: 'User is already a member or pending invitation exists',
  })
  async invite(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: InviteWorkspaceMemberDto,
  ) {
    const result = await this.invitationsService.inviteToWorkspace(
      workspaceId,
      userId,
      dto,
    );

    return {
      success: true,
      message: 'Invitation created successfully',
      data: result,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List pending invitations for the workspace' })
  @ApiResponse({
    status: 200,
    description: 'Pending invitations retrieved successfully',
    type: ApiResponseDto,
  })
  async list(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @CurrentUser('id') userId: string,
  ) {
    const list = await this.invitationsService.listByWorkspace(
      workspaceId,
      userId,
    );

    return {
      success: true,
      message: 'Invitations retrieved successfully',
      data: list,
    };
  }
}
