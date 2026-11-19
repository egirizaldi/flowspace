import {
  Controller,
  Post,
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
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('Organizations')
@ApiCookieAuth('flowspace_session')
@Controller('organizations')
@UseGuards(AuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
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
    status: 409,
    description: 'Organization with this slug already exists',
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrganizationDto,
  ) {
    const org = await this.organizationsService.create(userId, dto);

    return {
      success: true,
      message: 'Organization created successfully',
      data: org,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all organizations current user belongs to' })
  @ApiResponse({
    status: 200,
    description: 'User organizations retrieved successfully',
    type: ApiResponseDto,
  })
  async listUserOrganizations(@CurrentUser('id') userId: string) {
    const orgs = await this.organizationsService.listUserOrganizations(userId);

    return {
      success: true,
      message: 'Organizations retrieved successfully',
      data: orgs,
    };
  }

  @Get(':organizationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get details of an organization user belongs to' })
  @ApiResponse({
    status: 200,
    description: 'Organization details retrieved successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user is not a member of this organization',
  })
  async getOrganizationDetail(
    @CurrentUser('id') userId: string,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    const org = await this.organizationsService.findByIdForUser(organizationId, userId);

    return {
      success: true,
      message: 'Organization details retrieved successfully',
      data: org,
    };
  }

  @Patch(':organizationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update organization details (Owner/Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async updateOrganization(
    @CurrentUser('id') userId: string,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    const updated = await this.organizationsService.update(organizationId, userId, dto);

    return {
      success: true,
      message: 'Organization updated successfully',
      data: updated,
    };
  }

  @Delete(':organizationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete organization (Owner only)' })
  @ApiResponse({
    status: 200,
    description: 'Organization deleted successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only owner can delete organization',
  })
  async deleteOrganization(
    @CurrentUser('id') userId: string,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    await this.organizationsService.delete(organizationId, userId);

    return {
      success: true,
      message: 'Organization deleted successfully',
    };
  }
}
