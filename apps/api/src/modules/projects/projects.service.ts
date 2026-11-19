import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import {
  ProjectLifecycleStatus,
  ProjectRole,
  WorkspaceRole,
  OrganizationRole,
} from '@prisma/client';
import { DEFAULT_PROJECT_STATUSES } from '@flowspace/shared';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  generateKey(name: string): string {
    const cleaned = name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
    const words = cleaned.split(/\s+/).filter(Boolean);

    let key = '';
    if (words.length > 1) {
      key = words.map((w) => w[0].toUpperCase()).join('');
      if (key.length < 2) {
        key = words[0].substring(0, 3).toUpperCase();
      }
    } else if (words.length === 1) {
      key = words[0].substring(0, Math.min(4, words[0].length)).toUpperCase();
    }

    if (key.length < 2) {
      key = (key + 'PR').substring(0, 3);
    }

    return key.substring(0, 10);
  }

  async create(workspaceId: string, userId: string, dto: CreateProjectDto) {
    // 1. Verify workspace exists
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // 2. Verify authorization
    const wsMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    let isAuthorized = false;
    if (wsMember) {
      if (wsMember.role !== WorkspaceRole.VIEWER) {
        isAuthorized = true;
      }
    } else {
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
        'You do not have permission to create projects in this workspace',
      );
    }

    // 3. Determine and sanitize key
    const rawKey = dto.key ? dto.key.trim().toUpperCase() : this.generateKey(dto.name);
    if (!/^[A-Z0-9]{2,10}$/.test(rawKey)) {
      throw new BadRequestException(
        'Project key must be 2 to 10 uppercase alphanumeric characters',
      );
    }

    // 4. Verify key uniqueness in workspace
    const existing = await this.prisma.project.findUnique({
      where: {
        workspaceId_key: {
          workspaceId,
          key: rawKey,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `Project with key '${rawKey}' already exists in this workspace`,
      );
    }

    // 5. Transactional project creation
    return this.prisma.$transaction(async (tx) => {
      // If user is Org Owner/Admin but not in workspace_members, add them
      if (!wsMember) {
        await tx.workspaceMember.create({
          data: {
            workspaceId,
            userId,
            role: WorkspaceRole.ADMIN,
          },
        });
      }

      const startDate = dto.startDate ? new Date(dto.startDate) : null;
      const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

      // Create project
      const project = await tx.project.create({
        data: {
          organizationId: workspace.organizationId,
          workspaceId,
          name: dto.name.trim(),
          key: rawKey,
          description: dto.description?.trim() || null,
          status: dto.status || ProjectLifecycleStatus.PLANNING,
          startDate,
          dueDate,
          createdBy: userId,
        },
      });

      // Creator becomes Project Manager
      await tx.projectMember.create({
        data: {
          projectId: project.id,
          userId,
          role: ProjectRole.MANAGER,
        },
      });

      // Seed initial default statuses
      await tx.projectStatus.createMany({
        data: DEFAULT_PROJECT_STATUSES.map((status) => ({
          projectId: project.id,
          name: status.name,
          category: status.category,
          color: status.color,
          position: status.position,
          isDefault: status.isDefault,
        })),
      });

      const found = await tx.project.findUnique({
        where: { id: project.id },
        include: {
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
          },
          statuses: {
            orderBy: { position: 'asc' },
          },
        },
      });

      return found!;
    });
  }
}
