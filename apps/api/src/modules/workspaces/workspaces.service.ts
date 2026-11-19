import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  OrganizationRole,
} from '@prisma/client';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  generateSlug(name: string): string {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    return slug || 'workspace';
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreateWorkspaceDto,
  ): Promise<Workspace & { members: WorkspaceMember[] }> {
    // 1. Verify organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // 2. Verify user is a member of this organization
    const orgMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });
    if (!orgMember) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    const slug = dto.slug
      ? dto.slug.toLowerCase().trim()
      : this.generateSlug(dto.name);

    // 3. Verify slug is unique within this organization
    const existing = await this.prisma.workspace.findUnique({
      where: {
        organizationId_slug: {
          organizationId,
          slug,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        'Workspace with this slug already exists in this organization',
      );
    }

    // 4. Create workspace and auto-assign creator as OWNER in transaction
    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          organizationId,
          name: dto.name.trim(),
          slug,
          description: dto.description?.trim() ?? null,
          createdBy: userId,
        },
      });

      const member = await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: WorkspaceRole.OWNER,
        },
      });

      return {
        ...workspace,
        members: [member],
      };
    });
  }

  async findById(id: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
      },
    });
  }

  async findMember(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null> {
    return this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });
  }

  async addMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole = WorkspaceRole.MEMBER,
  ): Promise<WorkspaceMember> {
    const existing = await this.findMember(workspaceId, userId);
    if (existing) {
      throw new ConflictException('User is already a member of this workspace');
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return this.prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId,
        role,
      },
    });
  }

  async listWorkspacesByOrganization(organizationId: string, userId: string) {
    // 1. Verify user is a member of this organization
    const orgMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });
    if (!orgMember) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    const isOrgAdminOrOwner =
      orgMember.role === OrganizationRole.OWNER ||
      orgMember.role === OrganizationRole.ADMIN;

    if (isOrgAdminOrOwner) {
      const workspaces = await this.prisma.workspace.findMany({
        where: {
          organizationId,
          archivedAt: null,
        },
        include: {
          _count: {
            select: {
              members: true,
              projects: true,
            },
          },
          members: {
            where: { userId },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return workspaces.map((ws) => {
        const userWsMember = ws.members[0];
        const { members, ...workspaceData } = ws;
        return {
          ...workspaceData,
          userRole: userWsMember
            ? userWsMember.role
            : orgMember.role === OrganizationRole.OWNER
              ? WorkspaceRole.OWNER
              : WorkspaceRole.ADMIN,
          joinedAt: userWsMember ? userWsMember.joinedAt : ws.createdAt,
        };
      });
    }

    // Return all workspaces in organization where user is a member
    const memberships = await this.prisma.workspaceMember.findMany({
      where: {
        userId,
        workspace: {
          organizationId,
          archivedAt: null,
        },
      },
      include: {
        workspace: {
          include: {
            _count: {
              select: {
                members: true,
                projects: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((m) => ({
      ...m.workspace,
      userRole: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  async findByIdForUser(workspaceId: string, userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const wsMember = workspace.members.find((m) => m.userId === userId);
    let currentUserRole: WorkspaceRole | null = wsMember ? wsMember.role : null;

    if (!wsMember) {
      const orgMember = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: workspace.organizationId,
            userId,
          },
        },
      });

      if (!orgMember) {
        throw new ForbiddenException('You do not have access to this workspace');
      }

      if (
        orgMember.role !== OrganizationRole.OWNER &&
        orgMember.role !== OrganizationRole.ADMIN
      ) {
        throw new ForbiddenException('You do not have access to this workspace');
      }

      currentUserRole =
        orgMember.role === OrganizationRole.OWNER
          ? WorkspaceRole.OWNER
          : WorkspaceRole.ADMIN;
    }

    return {
      ...workspace,
      currentUserRole,
    };
  }

  async update(
    workspaceId: string,
    userId: string,
    dto: UpdateWorkspaceDto,
  ): Promise<Workspace> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const wsMember = await this.findMember(workspaceId, userId);
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
            userId,
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
        'Only workspace owners or admins can update workspace details',
      );
    }

    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        description:
          dto.description !== undefined
            ? dto.description?.trim() ?? null
            : undefined,
      },
    });
  }

  async delete(workspaceId: string, userId: string): Promise<boolean> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const wsMember = await this.findMember(workspaceId, userId);
    const isWsOwner = wsMember && wsMember.role === WorkspaceRole.OWNER;

    let isAuthorized = Boolean(isWsOwner);
    if (!isAuthorized) {
      const orgMember = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: workspace.organizationId,
            userId,
          },
        },
      });
      if (orgMember && orgMember.role === OrganizationRole.OWNER) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      throw new ForbiddenException(
        'Only the workspace owner can delete the workspace',
      );
    }

    await this.prisma.workspace.delete({
      where: { id: workspaceId },
    });

    return true;
  }
}
