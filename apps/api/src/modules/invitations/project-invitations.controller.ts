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
} from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { InviteProjectMemberDto } from './dto/invite-project-member.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('Invitations')
@ApiCookieAuth('flowspace_session')
@Controller('projects/:projectId/invitations')
@UseGuards(AuthGuard)
export class ProjectInvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite a new member to the project' })
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
    description: 'Forbidden - only project managers or admins can invite',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  @ApiResponse({
    status: 409,
    description: 'User is already a member or pending invitation exists',
  })
  async invite(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: InviteProjectMemberDto,
  ) {
    const result = await this.invitationsService.inviteToProject(
      projectId,
      userId,
      dto,
    );

    return {
      success: true,
      message: 'Invitation created successfully',
      data: result,
    };
  }
}
