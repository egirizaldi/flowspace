import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QueryActivitiesDto } from './dto/query-activities.dto';
import { OrganizationRole, Prisma } from '@prisma/client';

const actorSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
};

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async checkProjectAccess(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const [projectMember, wsMember, orgMember] = await Promise.all([
      this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
      }),
      this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: project.workspaceId,
            userId,
          },
        },
      }),
      this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: project.organizationId,
            userId,
          },
        },
      }),
    ]);

    const canRead =
      Boolean(projectMember) ||
      Boolean(wsMember) ||
      orgMember?.role === OrganizationRole.OWNER ||
      orgMember?.role === OrganizationRole.ADMIN;

    if (!canRead) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  async checkTaskAccess(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const [projectMember, wsMember, orgMember] = await Promise.all([
      this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: task.projectId, userId } },
      }),
      this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: task.project.workspaceId,
            userId,
          },
        },
      }),
      this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: task.project.organizationId,
            userId,
          },
        },
      }),
    ]);

    const canRead =
      Boolean(projectMember) ||
      Boolean(wsMember) ||
      orgMember?.role === OrganizationRole.OWNER ||
      orgMember?.role === OrganizationRole.ADMIN;

    if (!canRead) {
      throw new ForbiddenException('You do not have access to view this task');
    }

    return task;
  }

  async logActivity(data: {
    organizationId: string;
    projectId?: string | null;
    taskId?: string | null;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, any> | null;
  }) {
    return this.prisma.activity.create({
      data: {
        organizationId: data.organizationId,
        projectId: data.projectId || null,
        taskId: data.taskId || null,
        actorId: data.actorId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: data.metadata || Prisma.JsonNull,
      },
    });
  }

  async getTaskActivities(
    taskId: string,
    userId: string,
    query?: QueryActivitiesDto,
  ) {
    await this.checkTaskAccess(taskId, userId);

    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(100, Math.max(1, query?.limit || 20));
    const skip = (page - 1) * limit;

    const [total, activities] = await Promise.all([
      this.prisma.activity.count({ where: { taskId } }),
      this.prisma.activity.findMany({
        where: { taskId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: actorSelect,
          },
        },
      }),
    ]);

    return {
      activities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getProjectActivities(
    projectId: string,
    userId: string,
    query?: QueryActivitiesDto,
  ) {
    await this.checkProjectAccess(projectId, userId);

    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(100, Math.max(1, query?.limit || 20));
    const skip = (page - 1) * limit;

    const [total, activities] = await Promise.all([
      this.prisma.activity.count({ where: { projectId } }),
      this.prisma.activity.findMany({
        where: { projectId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: actorSelect,
          },
        },
      }),
    ]);

    return {
      activities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
