import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';
import { CreateProjectStatusDto } from './dto/create-project-status.dto';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';
import { ReorderProjectStatusesDto } from './dto/reorder-project-statuses.dto';
import {
  ProjectLifecycleStatus,
  ProjectRole,
  WorkspaceRole,
  OrganizationRole,
  Prisma,
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

  async checkProjectAccess(
    projectId: string,
    userId: string,
    requireManage: boolean = false,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: true,
      },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const projectMember = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    const wsMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: project.workspaceId,
          userId,
        },
      },
    });

    const orgMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: project.organizationId,
          userId,
        },
      },
    });

    let isAuthorized = false;

    if (requireManage) {
      if (
        projectMember?.role === ProjectRole.MANAGER ||
        wsMember?.role === WorkspaceRole.OWNER ||
        wsMember?.role === WorkspaceRole.ADMIN ||
        orgMember?.role === OrganizationRole.OWNER ||
        orgMember?.role === OrganizationRole.ADMIN
      ) {
        isAuthorized = true;
      }
    } else {
      if (
        Boolean(projectMember) ||
        Boolean(wsMember) ||
        orgMember?.role === OrganizationRole.OWNER ||
        orgMember?.role === OrganizationRole.ADMIN
      ) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      throw new ForbiddenException(
        requireManage
          ? 'You do not have permission to manage this project'
          : 'You do not have permission to view this project',
      );
    }

    return { project, projectMember, wsMember, orgMember };
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

  async listByWorkspace(
    workspaceId: string,
    userId: string,
    query: QueryProjectsDto,
  ) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
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
            organizationId: workspace.organizationId,
            userId,
          },
        },
      });
      if (
        !orgMember ||
        (orgMember.role !== OrganizationRole.OWNER &&
          orgMember.role !== OrganizationRole.ADMIN)
      ) {
        throw new ForbiddenException('You do not have access to this workspace');
      }
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {
      workspaceId,
    };

    if (!query.includeArchived) {
      where.archivedAt = null;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search?.trim()) {
      const searchTerm = query.search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { key: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [total, projects] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              members: true,
              tasks: true,
            },
          },
          statuses: {
            orderBy: { position: 'asc' },
          },
        },
      }),
    ]);

    return {
      projects,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(projectId: string, userId: string) {
    await this.checkProjectAccess(projectId, userId, false);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
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
          orderBy: { joinedAt: 'asc' },
        },
        statuses: {
          orderBy: { position: 'asc' },
        },
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            organizationId: true,
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async update(projectId: string, userId: string, dto: UpdateProjectDto) {
    await this.checkProjectAccess(projectId, userId, true);

    const data: Prisma.ProjectUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }
    if (dto.startDate !== undefined) {
      data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    }
    if (dto.dueDate !== undefined) {
      data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data,
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
  }

  async archive(projectId: string, userId: string) {
    await this.checkProjectAccess(projectId, userId, true);

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        archivedAt: new Date(),
      },
      include: {
        statuses: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async restore(projectId: string, userId: string) {
    await this.checkProjectAccess(projectId, userId, true);

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        archivedAt: null,
      },
      include: {
        statuses: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async delete(projectId: string, userId: string) {
    await this.checkProjectAccess(projectId, userId, true);

    await this.prisma.project.delete({
      where: { id: projectId },
    });

    return {
      success: true,
      message: 'Project deleted successfully',
    };
  }

  async listMembers(projectId: string, userId: string) {
    await this.checkProjectAccess(projectId, userId, false);

    return this.prisma.projectMember.findMany({
      where: { projectId },
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
    });
  }

  async addMember(
    projectId: string,
    actorId: string,
    dto: AddProjectMemberDto,
  ) {
    const { project } = await this.checkProjectAccess(projectId, actorId, true);

    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const wsMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: project.workspaceId,
          userId: dto.userId,
        },
      },
    });

    if (!wsMember) {
      const orgMember = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: project.organizationId,
            userId: dto.userId,
          },
        },
      });

      if (!orgMember) {
        throw new BadRequestException(
          'User must be a member of the workspace before being added to the project',
        );
      }
    }

    const existingMember = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: dto.userId,
        },
      },
    });
    if (existingMember) {
      throw new ConflictException('User is already a member of this project');
    }

    return this.prisma.projectMember.create({
      data: {
        projectId,
        userId: dto.userId,
        role: dto.role,
      },
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
    });
  }

  async updateMemberRole(
    projectId: string,
    memberId: string,
    actorId: string,
    dto: UpdateProjectMemberDto,
  ) {
    await this.checkProjectAccess(projectId, actorId, true);

    const member = await this.prisma.projectMember.findUnique({
      where: { id: memberId },
    });
    if (!member || member.projectId !== projectId) {
      throw new NotFoundException('Project member not found');
    }

    if (member.role === ProjectRole.MANAGER && dto.role !== ProjectRole.MANAGER) {
      const managerCount = await this.prisma.projectMember.count({
        where: {
          projectId,
          role: ProjectRole.MANAGER,
        },
      });
      if (managerCount <= 1) {
        throw new BadRequestException(
          'Cannot demote the only Manager in this project. Assign another Manager first.',
        );
      }
    }

    return this.prisma.projectMember.update({
      where: { id: memberId },
      data: { role: dto.role },
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
    });
  }

  async removeMember(
    projectId: string,
    memberId: string,
    actorId: string,
  ) {
    const member = await this.prisma.projectMember.findUnique({
      where: { id: memberId },
    });
    if (!member || member.projectId !== projectId) {
      throw new NotFoundException('Project member not found');
    }

    // Allow self-removal or manage permission
    if (member.userId !== actorId) {
      await this.checkProjectAccess(projectId, actorId, true);
    }

    if (member.role === ProjectRole.MANAGER) {
      const managerCount = await this.prisma.projectMember.count({
        where: {
          projectId,
          role: ProjectRole.MANAGER,
        },
      });
      if (managerCount <= 1) {
        throw new BadRequestException(
          'Cannot remove the only Manager in this project. Assign another Manager first.',
        );
      }
    }

    await this.prisma.projectMember.delete({
      where: { id: memberId },
    });

    return {
      success: true,
      message: 'Member removed from project successfully',
    };
  }

  // ==========================================
  // Project Status Configuration Methods (FS-031)
  // ==========================================

  async listStatuses(projectId: string, userId: string) {
    await this.checkProjectAccess(projectId, userId, false);

    return this.prisma.projectStatus.findMany({
      where: { projectId },
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });
  }

  async createStatus(
    projectId: string,
    userId: string,
    dto: CreateProjectStatusDto,
  ) {
    await this.checkProjectAccess(projectId, userId, true);

    let position = dto.position;
    if (position === undefined) {
      const last = await this.prisma.projectStatus.findFirst({
        where: { projectId },
        orderBy: { position: 'desc' },
      });
      position = last ? last.position + 1000 : 1000;
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.projectStatus.updateMany({
          where: { projectId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.projectStatus.create({
        data: {
          projectId,
          name: dto.name.trim(),
          category: dto.category,
          color: dto.color,
          position,
          isDefault: Boolean(dto.isDefault),
        },
        include: {
          _count: {
            select: { tasks: true },
          },
        },
      });
    });
  }

  async updateStatus(
    projectId: string,
    statusId: string,
    userId: string,
    dto: UpdateProjectStatusDto,
  ) {
    await this.checkProjectAccess(projectId, userId, true);

    const existing = await this.prisma.projectStatus.findFirst({
      where: { id: statusId, projectId },
    });
    if (!existing) {
      throw new NotFoundException('Project status not found');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.projectStatus.updateMany({
          where: { projectId, isDefault: true },
          data: { isDefault: false },
        });
      } else if (dto.isDefault === false && existing.isDefault) {
        const otherDefaults = await tx.projectStatus.count({
          where: { projectId, isDefault: true, id: { not: statusId } },
        });
        if (otherDefaults === 0) {
          throw new BadRequestException(
            'Cannot unset default status. Designate another status as default first.',
          );
        }
      }

      return tx.projectStatus.update({
        where: { id: statusId },
        data: {
          ...(dto.name ? { name: dto.name.trim() } : {}),
          ...(dto.category ? { category: dto.category } : {}),
          ...(dto.color ? { color: dto.color } : {}),
          ...(dto.position !== undefined ? { position: dto.position } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        },
        include: {
          _count: {
            select: { tasks: true },
          },
        },
      });
    });
  }

  async deleteStatus(projectId: string, statusId: string, userId: string) {
    await this.checkProjectAccess(projectId, userId, true);

    const existing = await this.prisma.projectStatus.findFirst({
      where: { id: statusId, projectId },
    });
    if (!existing) {
      throw new NotFoundException('Project status not found');
    }

    const totalStatuses = await this.prisma.projectStatus.count({
      where: { projectId },
    });
    if (totalStatuses <= 1) {
      throw new BadRequestException('Cannot delete the only status in the project.');
    }

    if (existing.isDefault) {
      throw new BadRequestException(
        'Cannot delete default status. Designate another status as default first.',
      );
    }

    const tasksCount = await this.prisma.task.count({
      where: { statusId },
    });
    if (tasksCount > 0) {
      throw new ConflictException(
        `Cannot delete status '${existing.name}' because it is assigned to ${tasksCount} task(s). Migrate tasks to another status first.`,
      );
    }

    await this.prisma.projectStatus.delete({
      where: { id: statusId },
    });

    return {
      success: true,
      message: 'Project status deleted successfully',
      deletedId: statusId,
    };
  }

  async reorderStatuses(
    projectId: string,
    userId: string,
    dto: ReorderProjectStatusesDto,
  ) {
    await this.checkProjectAccess(projectId, userId, true);

    const existing = await this.prisma.projectStatus.findMany({
      where: { projectId },
    });
    const existingIds = new Set(existing.map((s) => s.id));

    for (const id of dto.statusIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(
          `Status '${id}' does not belong to this project`,
        );
      }
    }

    await this.prisma.$transaction(
      dto.statusIds.map((id, index) =>
        this.prisma.projectStatus.update({
          where: { id },
          data: { position: (index + 1) * 1000 },
        }),
      ),
    );

    return this.prisma.projectStatus.findMany({
      where: { projectId },
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });
  }
}
