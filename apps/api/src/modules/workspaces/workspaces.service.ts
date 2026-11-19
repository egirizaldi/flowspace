import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Workspace, WorkspaceMember, WorkspaceRole } from '@prisma/client';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

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
}
