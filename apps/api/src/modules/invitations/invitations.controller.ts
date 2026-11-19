import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Public()
  @Get('info')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get invitation details and preview by token' })
  @ApiResponse({
    status: 200,
    description: 'Invitation info retrieved successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Token query parameter is required',
  })
  @ApiResponse({
    status: 404,
    description: 'Invitation not found',
  })
  async getInfo(@Query('token') token?: string) {
    if (!token) {
      throw new BadRequestException('Invitation token is required');
    }

    const info = await this.invitationsService.getInvitationInfo(token);

    return {
      success: true,
      message: 'Invitation details retrieved successfully',
      data: info,
    };
  }

  @Post('accept')
  @UseGuards(AuthGuard)
  @ApiCookieAuth('flowspace_session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invitation and join target scope' })
  @ApiResponse({
    status: 200,
    description: 'Invitation accepted successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invitation is expired or already accepted',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - must be logged in to accept invitation',
  })
  @ApiResponse({
    status: 404,
    description: 'Invitation not found',
  })
  async accept(
    @CurrentUser('id') userId: string,
    @Body() dto: AcceptInvitationDto,
  ) {
    const accepted = await this.invitationsService.accept(dto.token, userId);

    return {
      success: true,
      message: 'Invitation accepted successfully',
      data: accepted,
    };
  }
}
