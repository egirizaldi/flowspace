import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  Invitation,
  InvitationStatus,
  OrganizationRole,
  WorkspaceRole,
  ProjectRole,
} from '@prisma/client';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InviteOrganizationMemberDto } from './dto/invite-organization-member.dto';
import { InviteWorkspaceMemberDto } from './dto/invite-workspace-member.dto';
import { InviteProjectMemberDto } from './dto/invite-project-member.dto';
import * as crypto from 'crypto';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface CreateInvitationResult {
  invitation: Invitation;
  rawToken: string;
}

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  generateRawToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async create(
    invitedBy: string,
    dto: CreateInvitationDto,
    expiresInMs: number = SEVEN_DAYS_MS,
  ): Promise<CreateInvitationResult> {
    const email = dto.email.toLowerCase().trim();

    // 1. Validate scope: At least one target scope must be provided
    if (!dto.organizationId && !dto.workspaceId && !dto.projectId) {
      throw new BadRequestException(
        'Invitation must target an organization, workspace, or project',
      );
    }

    // 2. Validate target scope existence
    if (dto.organizationId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: dto.organizationId },
      });
      if (!org) {
        throw new NotFoundException('Target organization not found');
      }
    }

    if (dto.workspaceId) {
      const ws = await this.prisma.workspace.findUnique({
        where: { id: dto.workspaceId },
      });
      if (!ws) {
        throw new NotFoundException('Target workspace not found');
      }
    }

    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: dto.projectId },
      });
      if (!project) {
        throw new NotFoundException('Target project not found');
      }
    }

    // 3. Check for existing pending invitation with same email and scope
    const existing = await this.prisma.invitation.findFirst({
      where: {
        email,
        status: InvitationStatus.PENDING,
        organizationId: dto.organizationId ?? null,
        workspaceId: dto.workspaceId ?? null,
        projectId: dto.projectId ?? null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existing) {
      throw new ConflictException(
        'An active pending invitation for this email and scope already exists',
      );
    }

    // 4. Generate token and hash
    const rawToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + expiresInMs);

    // 5. Persist invitation
    const invitation = await this.prisma.invitation.create({
      data: {
        email,
        tokenHash,
        organizationId: dto.organizationId ?? null,
        workspaceId: dto.workspaceId ?? null,
        projectId: dto.projectId ?? null,
        role: dto.role,
        status: InvitationStatus.PENDING,
        invitedBy,
        expiresAt,
      },
      include: {
        organization: true,
        workspace: true,
        project: true,
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      invitation,
      rawToken,
    };
  }

  async inviteToOrganization(
    organizationId: string,
    inviterUserId: string,
    dto: InviteOrganizationMemberDto,
  ): Promise<CreateInvitationResult> {
    const email = dto.email.toLowerCase().trim();

    // 1. Verify organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // 2. Check caller permission: Only Org OWNER or ADMIN can invite
    const orgMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: inviterUserId,
        },
      },
    });
    if (
      !orgMember ||
      (orgMember.role !== OrganizationRole.OWNER &&
        orgMember.role !== OrganizationRole.ADMIN)
    ) {
      throw new ForbiddenException(
        'Only organization owners and admins can invite members',
      );
    }

    // 3. Check if user is already a member of this organization
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      const alreadyMember = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: existingUser.id,
          },
        },
      });
      if (alreadyMember) {
        throw new ConflictException(
          'User is already a member of this organization',
        );
      }
    }

    // 4. Create invitation
    return this.create(inviterUserId, {
      email,
      role: dto.role || OrganizationRole.MEMBER,
      organizationId,
    });
  }

  async inviteToWorkspace(
    workspaceId: string,
    inviterUserId: string,
    dto: InviteWorkspaceMemberDto,
  ): Promise<CreateInvitationResult> {
    const email = dto.email.toLowerCase().trim();

    // 1. Verify workspace exists
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // 2. Check caller permission: Workspace OWNER/ADMIN or Org OWNER/ADMIN
    const wsMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: inviterUserId,
        },
      },
    });
    const isWsAdminOrOwner =
      wsMember &&
      (wsMember.role === WorkspaceRole.OWNER ||
        wsMember.role === WorkspaceRole.ADMIN);

    let isAuthorized = Boolean(isWsAdminOrOwner);
    if (!isAuthorized) {
      const orgMember = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: workspace.organizationId,
            userId: inviterUserId,
          },
        },
      });
      if (
        orgMember &&
        (orgMember.role === OrganizationRole.OWNER ||
          orgMember.role === OrganizationRole.ADMIN)
      ) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      throw new ForbiddenException(
        'Only workspace or organization owners and admins can invite workspace members',
      );
    }

    // 3. Check if user is already a member of this workspace
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      const alreadyMember = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: existingUser.id,
          },
        },
      });
      if (alreadyMember) {
        throw new ConflictException(
          'User is already a member of this workspace',
        );
      }
    }

    // 4. Create invitation
    return this.create(inviterUserId, {
      email,
      role: dto.role || WorkspaceRole.MEMBER,
      workspaceId,
    });
  }

  async inviteToProject(
    projectId: string,
    inviterUserId: string,
    dto: InviteProjectMemberDto,
  ): Promise<CreateInvitationResult> {
    const email = dto.email.toLowerCase().trim();

    // 1. Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // 2. Check caller permission: Project MANAGER, Workspace OWNER/ADMIN, or Org OWNER/ADMIN
    const pMember = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: inviterUserId,
        },
      },
    });
    let isAuthorized = pMember && pMember.role === ProjectRole.MANAGER;

    if (!isAuthorized) {
      const wsMember = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: project.workspaceId,
            userId: inviterUserId,
          },
        },
      });
      if (
        wsMember &&
        (wsMember.role === WorkspaceRole.OWNER ||
          wsMember.role === WorkspaceRole.ADMIN)
      ) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      const orgMember = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: project.organizationId,
            userId: inviterUserId,
          },
        },
      });
      if (
        orgMember &&
        (orgMember.role === OrganizationRole.OWNER ||
          orgMember.role === OrganizationRole.ADMIN)
      ) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      throw new ForbiddenException(
        'Only project managers or workspace/organization admins can invite project members',
      );
    }

    // 3. Check if user is already a member of this project
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      const alreadyMember = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: existingUser.id,
          },
        },
      });
      if (alreadyMember) {
        throw new ConflictException(
          'User is already a member of this project',
        );
      }
    }

    // 4. Create invitation
    return this.create(inviterUserId, {
      email,
      role: dto.role || ProjectRole.MEMBER,
      projectId,
    });
  }

  async findValidByRawToken(rawToken: string): Promise<Invitation> {
    const tokenHash = this.hashToken(rawToken);

    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
      include: {
        organization: true,
        workspace: true,
        project: true,
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invalid invitation token');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `Invitation is no longer pending (status: ${invitation.status})`,
      );
    }

    // Check expiration
    if (new Date() > invitation.expiresAt) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestException('Invitation has expired');
    }

    return invitation;
  }

  async findById(id: string): Promise<Invitation | null> {
    return this.prisma.invitation.findUnique({
      where: { id },
      include: {
        organization: true,
        workspace: true,
        project: true,
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async revoke(id: string, userId: string): Promise<Invitation> {
    const invitation = await this.findById(id);
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `Cannot revoke invitation with status ${invitation.status}`,
      );
    }

    // Only inviter can revoke directly
    if (invitation.invitedBy !== userId) {
      throw new ForbiddenException(
        'You do not have permission to revoke this invitation',
      );
    }

    return this.prisma.invitation.update({
      where: { id },
      data: {
        status: InvitationStatus.REVOKED,
        revokedAt: new Date(),
      },
    });
  }

  async accept(rawToken: string, userId: string): Promise<Invitation> {
    const invitation = await this.findValidByRawToken(rawToken);

    return this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });
  }
}
