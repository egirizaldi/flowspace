import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import {
  TaskPriority,
  ProjectRole,
  WorkspaceRole,
  OrganizationRole,
  Prisma,
} from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async createTask(projectId: string, userId: string, dto: CreateTaskDto) {
    // 1. Verify project existence and tenant boundary
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // 2. Verify authorization
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

    let canCreate = false;

    if (
      projectMember?.role === ProjectRole.MANAGER ||
      projectMember?.role === ProjectRole.MEMBER
    ) {
      canCreate = true;
    } else if (
      wsMember?.role === WorkspaceRole.OWNER ||
      wsMember?.role === WorkspaceRole.ADMIN ||
      wsMember?.role === WorkspaceRole.MEMBER
    ) {
      // If user is workspace member and has no explicit restricted role (VIEWER) in project
      if (projectMember?.role !== ProjectRole.VIEWER) {
        canCreate = true;
      }
    } else if (
      orgMember?.role === OrganizationRole.OWNER ||
      orgMember?.role === OrganizationRole.ADMIN
    ) {
      if (projectMember?.role !== ProjectRole.VIEWER) {
        canCreate = true;
      }
    }

    if (!canCreate) {
      throw new ForbiddenException(
        'You do not have permission to create tasks in this project',
      );
    }

    // 3. Resolve status
    let resolvedStatusId: string;
    if (dto.statusId) {
      const status = await this.prisma.projectStatus.findFirst({
        where: { id: dto.statusId, projectId },
      });
      if (!status) {
        throw new BadRequestException(
          'Invalid status: status does not belong to this project',
        );
      }
      resolvedStatusId = status.id;
    } else {
      const defaultStatus = await this.prisma.projectStatus.findFirst({
        where: { projectId, isDefault: true },
      });
      if (defaultStatus) {
        resolvedStatusId = defaultStatus.id;
      } else {
        const firstStatus = await this.prisma.projectStatus.findFirst({
          where: { projectId },
          orderBy: { position: 'asc' },
        });
        if (!firstStatus) {
          throw new BadRequestException('Project has no workflow statuses defined');
        }
        resolvedStatusId = firstStatus.id;
      }
    }

    // 4. Validate assignee if provided
    if (dto.assigneeId) {
      const assigneeWsMember = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: project.workspaceId,
            userId: dto.assigneeId,
          },
        },
      });

      if (!assigneeWsMember) {
        throw new BadRequestException(
          'Assignee must be a member of this workspace',
        );
      }
    }

    // 5. Validate parent task if provided
    if (dto.parentTaskId) {
      const parentTask = await this.prisma.task.findFirst({
        where: { id: dto.parentTaskId, projectId },
      });
      if (!parentTask) {
        throw new BadRequestException(
          'Parent task does not belong to this project',
        );
      }
    }

    // 6. Transactional atomic taskNumber increment and position calculation
    return this.prisma.$transaction(async (tx) => {
      const lastTask = await tx.task.findFirst({
        where: { projectId },
        orderBy: { taskNumber: 'desc' },
        select: { taskNumber: true },
      });
      const nextNumber = lastTask ? lastTask.taskNumber + 1 : 1;

      const lastInStatus = await tx.task.findFirst({
        where: { projectId, statusId: resolvedStatusId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      const nextPosition = lastInStatus
        ? lastInStatus.position.add(new Prisma.Decimal(65535))
        : new Prisma.Decimal(65535);

      const startDate = dto.startDate ? new Date(dto.startDate) : null;
      const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

      const createdTask = await tx.task.create({
        data: {
          projectId,
          statusId: resolvedStatusId,
          parentTaskId: dto.parentTaskId || null,
          taskNumber: nextNumber,
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          priority: dto.priority || TaskPriority.MEDIUM,
          assigneeId: dto.assigneeId || null,
          startDate,
          dueDate,
          position: nextPosition,
          version: 1,
          createdBy: userId,
        },
        include: {
          project: {
            select: {
              id: true,
              key: true,
              name: true,
            },
          },
          status: true,
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          creator: {
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
        ...createdTask,
        taskKey: `${createdTask.project.key}-${createdTask.taskNumber}`,
      };
    });
  }
}
