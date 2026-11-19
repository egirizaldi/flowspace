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

  async getInvitationInfo(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            key: true,
          },
        },
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
      throw new NotFoundException('Invitation not found');
    }

    const isExpired =
      invitation.status === InvitationStatus.EXPIRED ||
      new Date() > invitation.expiresAt;

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: isExpired ? InvitationStatus.EXPIRED : invitation.status,
      expiresAt: invitation.expiresAt,
      isExpired,
      organization: invitation.organization,
      workspace: invitation.workspace,
      project: invitation.project,
      inviter: invitation.inviter,
    };
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

    return this.prisma.$transaction(async (tx) => {
      // 1. Organization Scope
      if (invitation.organizationId) {
        const existingOrgMember = await tx.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: invitation.organizationId,
              userId,
            },
          },
        });
        if (!existingOrgMember) {
          await tx.organizationMember.create({
            data: {
              organizationId: invitation.organizationId,
              userId,
              role: invitation.role as OrganizationRole,
            },
          });
        }
      }

      // 2. Workspace Scope
      if (invitation.workspaceId) {
        const ws = await tx.workspace.findUnique({
          where: { id: invitation.workspaceId },
        });
        if (!ws) {
          throw new NotFoundException('Target workspace not found');
        }

        // Ensure user is an OrganizationMember of parent organization
        const existingOrgMember = await tx.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: ws.organizationId,
              userId,
            },
          },
        });
        if (!existingOrgMember) {
          await tx.organizationMember.create({
            data: {
              organizationId: ws.organizationId,
              userId,
              role: OrganizationRole.MEMBER,
            },
          });
        }

        const existingWsMember = await tx.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: invitation.workspaceId,
              userId,
            },
          },
        });
        if (!existingWsMember) {
          await tx.workspaceMember.create({
            data: {
              workspaceId: invitation.workspaceId,
              userId,
              role: invitation.role as WorkspaceRole,
            },
          });
        }
      }

      // 3. Project Scope
      if (invitation.projectId) {
        const project = await tx.project.findUnique({
          where: { id: invitation.projectId },
        });
        if (!project) {
          throw new NotFoundException('Target project not found');
        }

        // Auto-join parent organization
        const existingOrgMember = await tx.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: project.organizationId,
              userId,
            },
          },
        });
        if (!existingOrgMember) {
          await tx.organizationMember.create({
            data: {
              organizationId: project.organizationId,
              userId,
              role: OrganizationRole.MEMBER,
            },
          });
        }

        // Auto-join parent workspace
        const existingWsMember = await tx.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: project.workspaceId,
              userId,
            },
          },
        });
        if (!existingWsMember) {
          await tx.workspaceMember.create({
            data: {
              workspaceId: project.workspaceId,
              userId,
              role: WorkspaceRole.MEMBER,
            },
          });
        }

        // Join project
        const existingPMember = await tx.projectMember.findUnique({
          where: {
            projectId_userId: {
              projectId: invitation.projectId,
              userId,
            },
          },
        });
        if (!existingPMember) {
          await tx.projectMember.create({
            data: {
              projectId: invitation.projectId,
              userId,
              role: invitation.role as ProjectRole,
            },
          });
        }
      }

      // 4. Transition invitation status to ACCEPTED
      const updated = await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
        include: {
          organization: true,
          workspace: true,
          project: true,
        },
      });

      return updated;
    });
  }

  async listByOrganization(organizationId: string, userId: string) {
    const orgMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });
    if (!orgMember) {
      throw new ForbiddenException(
        'You do not have access to this organization',
      );
    }

    return this.prisma.invitation.findMany({
      where: {
        organizationId,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listByWorkspace(workspaceId: string, userId: string) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!ws) {
      throw new NotFoundException('Workspace not found');
    }

    const wsMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });
    if (!wsMember) {
      const orgMember = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: ws.organizationId,
            userId,
          },
        },
      });
      if (!orgMember) {
        throw new ForbiddenException('You do not have access to this workspace');
      }
    }

    return this.prisma.invitation.findMany({
      where: {
        workspaceId,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
