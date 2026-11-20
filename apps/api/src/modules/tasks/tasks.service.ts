import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { AttachLabelDto } from './dto/attach-label.dto';
import { SetParentTaskDto } from './dto/set-parent-task.dto';
import { QueryBoardDto, DueDateStatus } from './dto/query-board.dto';
import { ActivitiesService } from '../activities/activities.service';
import {
  TaskPriority,
  ProjectRole,
  WorkspaceRole,
  OrganizationRole,
  Prisma,
} from '@prisma/client';

const taskIncludes = {
  project: {
    select: {
      id: true,
      key: true,
      name: true,
      workspaceId: true,
      organizationId: true,
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
};

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activitiesService: ActivitiesService,
  ) {}

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

    if (
      !projectMember &&
      !wsMember &&
      orgMember?.role !== OrganizationRole.OWNER &&
      orgMember?.role !== OrganizationRole.ADMIN
    ) {
      throw new ForbiddenException(
        'You do not have access to this project',
      );
    }

    return project;
  }

  async checkTaskAccess(
    taskId: string,
    userId: string,
    requireManage: boolean = false,
    requireEdit: boolean = false,
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        status: true,
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

    const projectMember = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: task.projectId,
          userId,
        },
      },
    });

    const wsMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: task.project.workspaceId,
          userId,
        },
      },
    });

    const orgMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: task.project.organizationId,
          userId,
        },
      },
    });

    if (requireManage) {
      const isManager =
        projectMember?.role === ProjectRole.MANAGER ||
        wsMember?.role === WorkspaceRole.OWNER ||
        wsMember?.role === WorkspaceRole.ADMIN ||
        orgMember?.role === OrganizationRole.OWNER ||
        orgMember?.role === OrganizationRole.ADMIN;

      if (!isManager) {
        throw new ForbiddenException(
          'You do not have permission to manage or delete this task',
        );
      }
    } else if (requireEdit) {
      if (projectMember?.role === ProjectRole.VIEWER) {
        throw new ForbiddenException(
          'Viewers cannot modify tasks',
        );
      }

      const canEdit =
        projectMember?.role === ProjectRole.MANAGER ||
        projectMember?.role === ProjectRole.MEMBER ||
        wsMember?.role === WorkspaceRole.OWNER ||
        wsMember?.role === WorkspaceRole.ADMIN ||
        wsMember?.role === WorkspaceRole.MEMBER ||
        orgMember?.role === OrganizationRole.OWNER ||
        orgMember?.role === OrganizationRole.ADMIN;

      if (!canEdit) {
        throw new ForbiddenException(
          'You do not have permission to edit this task',
        );
      }
    } else {
      // Read access
      const canRead =
        Boolean(projectMember) ||
        Boolean(wsMember) ||
        orgMember?.role === OrganizationRole.OWNER ||
        orgMember?.role === OrganizationRole.ADMIN;

      if (!canRead) {
        throw new ForbiddenException(
          'You do not have access to view this task',
        );
      }
    }

    return task;
  }

  async createTask(projectId: string, userId: string, dto: CreateTaskDto) {
    const project = await this.checkProjectAccess(projectId, userId);

    // Verify creation permission
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

    // Resolve status
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

    // Validate assignee if provided
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

    // Validate parent task if provided
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

    // Transactional atomic taskNumber increment and position calculation
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
        include: taskIncludes,
      });

      await tx.activity.create({
        data: {
          organizationId: project.organizationId,
          projectId: project.id,
          taskId: createdTask.id,
          actorId: userId,
          action: 'TASK_CREATED',
          entityType: 'TASK',
          entityId: createdTask.id,
          metadata: {
            title: createdTask.title,
            taskKey: `${createdTask.project.key}-${createdTask.taskNumber}`,
            statusId: createdTask.statusId,
            statusName: createdTask.status.name,
          },
        },
      });

      if (createdTask.assigneeId) {
        await tx.activity.create({
          data: {
            organizationId: project.organizationId,
            projectId: project.id,
            taskId: createdTask.id,
            actorId: userId,
            action: 'TASK_ASSIGNED',
            entityType: 'TASK',
            entityId: createdTask.id,
            metadata: {
              previousAssigneeId: null,
              newAssigneeId: createdTask.assigneeId,
              assigneeName: createdTask.assignee?.name || null,
              taskKey: `${createdTask.project.key}-${createdTask.taskNumber}`,
            },
          },
        });
      }

      return {
        ...createdTask,
        taskKey: `${createdTask.project.key}-${createdTask.taskNumber}`,
      };
    });
  }

  private applyDueDateFilter(
    where: Prisma.TaskWhereInput,
    dueDateStatus: DueDateStatus,
  ) {
    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
    );
    const todayEnd = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );

    const dayOfWeek = now.getUTCDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const startOfWeek = new Date(todayStart);
    startOfWeek.setUTCDate(todayStart.getUTCDate() - diffToMonday);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
    endOfWeek.setUTCHours(23, 59, 59, 999);

    switch (dueDateStatus) {
      case 'OVERDUE':
        where.dueDate = { lt: todayStart };
        where.completedAt = null;
        break;
      case 'TODAY':
        where.dueDate = { gte: todayStart, lte: todayEnd };
        break;
      case 'THIS_WEEK':
        where.dueDate = { gte: startOfWeek, lte: endOfWeek };
        break;
      case 'NO_DUE_DATE':
        where.dueDate = null;
        break;
    }
  }

  async findProjectTasks(
    projectId: string,
    userId: string,
    query: QueryTasksDto,
  ) {
    await this.checkProjectAccess(projectId, userId);

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {
      projectId,
      deletedAt: null,
    };

    if (query.statusId) {
      where.statusId = query.statusId;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.assigneeId) {
      if (query.assigneeId === 'UNASSIGNED') {
        where.assigneeId = null;
      } else {
        where.assigneeId = query.assigneeId;
      }
    }

    if (query.labelId) {
      where.labels = {
        some: {
          labelId: query.labelId,
        },
      };
    }

    if (query.dueDateStatus) {
      this.applyDueDateFilter(where, query.dueDateStatus);
    }

    if (query.parentTaskId) {
      where.parentTaskId = query.parentTaskId;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, tasks] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        include: {
          ...taskIncludes,
          _count: {
            select: {
              subtasks: true,
              comments: true,
              attachments: true,
            },
          },
        },
      }),
    ]);

    const formattedTasks = tasks.map((task) => ({
      ...task,
      taskKey: `${task.project.key}-${task.taskNumber}`,
    }));

    return {
      tasks: formattedTasks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findTaskById(taskId: string, userId: string) {
    await this.checkTaskAccess(taskId, userId, false, false);

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        ...taskIncludes,
        parentTask: {
          select: {
            id: true,
            taskNumber: true,
            title: true,
          },
        },
        subtasks: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
          select: {
            id: true,
            taskNumber: true,
            title: true,
            priority: true,
            status: true,
            assignee: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            position: true,
          },
        },
        labels: {
          include: {
            label: true,
          },
        },
        _count: {
          select: {
            comments: true,
            attachments: true,
            subtasks: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return {
      ...task,
      taskKey: `${task.project.key}-${task.taskNumber}`,
    };
  }

  async updateTask(taskId: string, userId: string, dto: UpdateTaskDto) {
    const task = await this.checkTaskAccess(taskId, userId, false, true);

    if (task.version !== dto.version) {
      throw new ConflictException(
        `Task has been modified by another process. Expected version ${dto.version}, but found ${task.version}. Please refresh and try again.`,
      );
    }

    const startDate =
      dto.startDate !== undefined
        ? dto.startDate
          ? new Date(dto.startDate)
          : null
        : undefined;
    const dueDate =
      dto.dueDate !== undefined
        ? dto.dueDate
          ? new Date(dto.dueDate)
          : null
        : undefined;

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(dto.title ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.priority ? { priority: dto.priority } : {}),
        ...(startDate !== undefined ? { startDate } : {}),
        ...(dueDate !== undefined ? { dueDate } : {}),
        version: { increment: 1 },
      },
      include: taskIncludes,
    });

    return {
      ...updated,
      taskKey: `${updated.project.key}-${updated.taskNumber}`,
    };
  }

  async updateTaskStatus(
    taskId: string,
    userId: string,
    dto: UpdateTaskStatusDto,
  ) {
    const task = await this.checkTaskAccess(taskId, userId, false, true);

    if (task.version !== dto.version) {
      throw new ConflictException(
        `Task has been modified by another process. Expected version ${dto.version}, but found ${task.version}. Please refresh and try again.`,
      );
    }

    const status = await this.prisma.projectStatus.findFirst({
      where: { id: dto.statusId, projectId: task.projectId },
    });
    if (!status) {
      throw new BadRequestException(
        'Invalid status: status does not belong to this project',
      );
    }

    const completedAt =
      status.category === 'DONE' ? task.completedAt || new Date() : null;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          statusId: status.id,
          completedAt,
          version: { increment: 1 },
        },
        include: taskIncludes,
      });

      if (task.statusId !== status.id) {
        await tx.activity.create({
          data: {
            organizationId: task.project.organizationId,
            projectId: task.projectId,
            taskId: task.id,
            actorId: userId,
            action: 'TASK_STATUS_CHANGED',
            entityType: 'TASK',
            entityId: task.id,
            metadata: {
              previousStatusId: task.statusId,
              previousStatusName: (task as any).status?.name || null,
              newStatusId: status.id,
              newStatusName: status.name,
              taskKey: `${task.project.key}-${task.taskNumber}`,
            },
          },
        });
      }

      return {
        ...updated,
        taskKey: `${updated.project.key}-${updated.taskNumber}`,
      };
    });
  }

  async assignTask(taskId: string, userId: string, dto: AssignTaskDto) {
    const task = await this.checkTaskAccess(taskId, userId, false, true);

    if (task.version !== dto.version) {
      throw new ConflictException(
        `Task has been modified by another process. Expected version ${dto.version}, but found ${task.version}. Please refresh and try again.`,
      );
    }

    let assigneeUser: any = null;
    if (dto.assigneeId) {
      const assigneeWsMember = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: task.project.workspaceId,
            userId: dto.assigneeId,
          },
        },
        include: {
          user: true,
        },
      });

      if (!assigneeWsMember) {
        throw new BadRequestException(
          'Assignee must be a member of this workspace',
        );
      }
      assigneeUser = assigneeWsMember.user;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          assigneeId: dto.assigneeId || null,
          version: { increment: 1 },
        },
        include: taskIncludes,
      });

      if (task.assigneeId !== (dto.assigneeId || null)) {
        const action = dto.assigneeId ? 'TASK_ASSIGNED' : 'TASK_UNASSIGNED';
        await tx.activity.create({
          data: {
            organizationId: task.project.organizationId,
            projectId: task.projectId,
            taskId: task.id,
            actorId: userId,
            action,
            entityType: 'TASK',
            entityId: task.id,
            metadata: {
              previousAssigneeId: task.assigneeId,
              newAssigneeId: dto.assigneeId || null,
              assigneeName: assigneeUser?.name || null,
              taskKey: `${task.project.key}-${task.taskNumber}`,
            },
          },
        });
      }

      return {
        ...updated,
        taskKey: `${updated.project.key}-${updated.taskNumber}`,
      };
    });
  }

  async removeAssignee(taskId: string, userId: string) {
    const task = await this.checkTaskAccess(taskId, userId, false, true);

    if (!task.assigneeId) {
      return {
        ...task,
        taskKey: `${task.project.key}-${task.taskNumber}`,
      };
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          assigneeId: null,
          version: { increment: 1 },
        },
        include: taskIncludes,
      });

      await tx.activity.create({
        data: {
          organizationId: task.project.organizationId,
          projectId: task.projectId,
          taskId: task.id,
          actorId: userId,
          action: 'TASK_UNASSIGNED',
          entityType: 'TASK',
          entityId: task.id,
          metadata: {
            previousAssigneeId: task.assigneeId,
            newAssigneeId: null,
            taskKey: `${task.project.key}-${task.taskNumber}`,
          },
        },
      });

      return {
        ...updated,
        taskKey: `${updated.project.key}-${updated.taskNumber}`,
      };
    });
  }

  async getTaskActivities(taskId: string, userId: string, query?: any) {
    return this.activitiesService.getTaskActivities(taskId, userId, query);
  }

  async moveTask(taskId: string, userId: string, dto: MoveTaskDto) {
    const task = await this.checkTaskAccess(taskId, userId, false, true);

    if (task.version !== dto.version) {
      throw new ConflictException(
        `Task has been modified by another process. Expected version ${dto.version}, but found ${task.version}. Please refresh and try again.`,
      );
    }

    const status = await this.prisma.projectStatus.findFirst({
      where: { id: dto.statusId, projectId: task.projectId },
    });
    if (!status) {
      throw new BadRequestException(
        'Invalid status: status does not belong to this project',
      );
    }

    const positionDecimal = new Prisma.Decimal(dto.position.toString());
    const completedAt =
      status.category === 'DONE' ? task.completedAt || new Date() : null;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          statusId: status.id,
          position: positionDecimal,
          completedAt,
          version: { increment: 1 },
        },
        include: taskIncludes,
      });

      if (task.statusId !== status.id) {
        await tx.activity.create({
          data: {
            organizationId: task.project.organizationId,
            projectId: task.projectId,
            taskId: task.id,
            actorId: userId,
            action: 'TASK_STATUS_CHANGED',
            entityType: 'TASK',
            entityId: task.id,
            metadata: {
              previousStatusId: task.statusId,
              previousStatusName: (task as any).status?.name || null,
              newStatusId: status.id,
              newStatusName: status.name,
              taskKey: `${task.project.key}-${task.taskNumber}`,
            },
          },
        });
      }

      return {
        ...updated,
        taskKey: `${updated.project.key}-${updated.taskNumber}`,
      };
    });
  }

  async deleteTask(taskId: string, userId: string) {
    await this.checkTaskAccess(taskId, userId, true, false);

    await this.prisma.task.delete({
      where: { id: taskId },
    });

    return {
      success: true,
      message: 'Task deleted successfully',
      deletedId: taskId,
    };
  }

  // ==========================================
  // Labels Management & Task Association (FS-035)
  // ==========================================

  async listProjectLabels(projectId: string, userId: string) {
    await this.checkProjectAccess(projectId, userId);

    return this.prisma.label.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });
  }

  async createProjectLabel(
    projectId: string,
    userId: string,
    dto: CreateLabelDto,
  ) {
    await this.checkProjectAccess(projectId, userId);

    const existing = await this.prisma.label.findUnique({
      where: {
        projectId_name: {
          projectId,
          name: dto.name.trim(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Label '${dto.name}' already exists in this project`,
      );
    }

    return this.prisma.label.create({
      data: {
        projectId,
        name: dto.name.trim(),
        color: dto.color,
      },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });
  }

  async updateProjectLabel(
    projectId: string,
    labelId: string,
    userId: string,
    dto: UpdateLabelDto,
  ) {
    await this.checkProjectAccess(projectId, userId);

    const label = await this.prisma.label.findFirst({
      where: { id: labelId, projectId },
    });

    if (!label) {
      throw new NotFoundException('Label not found');
    }

    if (dto.name && dto.name.trim() !== label.name) {
      const existing = await this.prisma.label.findUnique({
        where: {
          projectId_name: {
            projectId,
            name: dto.name.trim(),
          },
        },
      });
      if (existing) {
        throw new ConflictException(
          `Label '${dto.name}' already exists in this project`,
        );
      }
    }

    return this.prisma.label.update({
      where: { id: labelId },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.color ? { color: dto.color } : {}),
      },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });
  }

  async deleteProjectLabel(
    projectId: string,
    labelId: string,
    userId: string,
  ) {
    await this.checkProjectAccess(projectId, userId);

    const label = await this.prisma.label.findFirst({
      where: { id: labelId, projectId },
    });

    if (!label) {
      throw new NotFoundException('Label not found');
    }

    await this.prisma.label.delete({
      where: { id: labelId },
    });

    return {
      success: true,
      message: 'Label deleted successfully',
      deletedId: labelId,
    };
  }

  async attachTaskLabel(taskId: string, userId: string, dto: AttachLabelDto) {
    const task = await this.checkTaskAccess(taskId, userId, false, true);

    const label = await this.prisma.label.findUnique({
      where: { id: dto.labelId },
    });

    if (!label || label.projectId !== task.projectId) {
      throw new BadRequestException(
        'Label does not belong to this project',
      );
    }

    const existing = await this.prisma.taskLabel.findUnique({
      where: {
        taskId_labelId: {
          taskId,
          labelId: dto.labelId,
        },
      },
    });

    if (!existing) {
      await this.prisma.taskLabel.create({
        data: {
          taskId,
          labelId: dto.labelId,
        },
      });
    }

    return this.findTaskById(taskId, userId);
  }

  async detachTaskLabel(taskId: string, labelId: string, userId: string) {
    await this.checkTaskAccess(taskId, userId, false, true);

    await this.prisma.taskLabel.deleteMany({
      where: {
        taskId,
        labelId,
      },
    });

    return {
      success: true,
      message: 'Label removed from task successfully',
      labelId,
    };
  }

  // ==========================================
  // Subtasks & Circular Hierarchy Validation (FS-035)
  // ==========================================

  async createSubtask(
    parentTaskId: string,
    userId: string,
    dto: CreateTaskDto,
  ) {
    const parent = await this.checkTaskAccess(parentTaskId, userId, false, true);

    return this.createTask(parent.projectId, userId, {
      ...dto,
      parentTaskId,
    });
  }

  async setParentTask(
    taskId: string,
    userId: string,
    dto: SetParentTaskDto,
  ) {
    const task = await this.checkTaskAccess(taskId, userId, false, true);

    if (task.version !== dto.version) {
      throw new ConflictException(
        `Task has been modified by another process. Expected version ${dto.version}, but found ${task.version}. Please refresh and try again.`,
      );
    }

    if (dto.parentTaskId) {
      if (dto.parentTaskId === taskId) {
        throw new BadRequestException('A task cannot be its own parent');
      }

      const targetParent = await this.prisma.task.findUnique({
        where: { id: dto.parentTaskId },
      });

      if (!targetParent || targetParent.projectId !== task.projectId) {
        throw new BadRequestException(
          'Parent task does not belong to this project',
        );
      }

      // Circular ancestor validation: traverse up from targetParent
      let currentId: string | null = targetParent.id;
      const visited = new Set<string>([taskId]);
      while (currentId) {
        if (visited.has(currentId)) {
          throw new BadRequestException(
            'Circular parent relationship detected. A task cannot have one of its descendants as its parent.',
          );
        }
        visited.add(currentId);
        const ancestor = await this.prisma.task.findUnique({
          where: { id: currentId },
          select: { parentTaskId: true },
        });
        currentId = ancestor?.parentTaskId || null;
      }
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        parentTaskId: dto.parentTaskId || null,
        version: { increment: 1 },
      },
      include: taskIncludes,
    });

    return {
      ...updated,
      taskKey: `${updated.project.key}-${updated.taskNumber}`,
    };
  }

  async getKanbanBoard(
    projectId: string,
    userId: string,
    query?: QueryBoardDto,
  ) {
    const project = await this.checkProjectAccess(projectId, userId);

    const statuses = await this.prisma.projectStatus.findMany({
      where: { projectId },
      orderBy: { position: 'asc' },
    });

    const where: Prisma.TaskWhereInput = {
      projectId,
      deletedAt: null,
    };

    if (!query?.includeSubtasks) {
      where.parentTaskId = null;
    }

    if (query?.assigneeId) {
      if (query.assigneeId === 'UNASSIGNED') {
        where.assigneeId = null;
      } else {
        where.assigneeId = query.assigneeId;
      }
    }

    if (query?.priority) {
      where.priority = query.priority;
    }

    if (query?.labelId) {
      where.labels = {
        some: {
          labelId: query.labelId,
        },
      };
    }

    if (query?.dueDateStatus) {
      this.applyDueDateFilter(where, query.dueDateStatus);
    }

    if (query?.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    const tasks = await this.prisma.task.findMany({
      where,
      orderBy: { position: 'asc' },
      include: {
        ...taskIncludes,
        labels: {
          include: {
            label: true,
          },
        },
        _count: {
          select: {
            subtasks: { where: { deletedAt: null } },
            comments: true,
            attachments: true,
          },
        },
      },
    });

    const columns = statuses.map((status) => {
      const colTasks = tasks
        .filter((t) => t.statusId === status.id)
        .map((t) => ({
          ...t,
          taskKey: `${project.key}-${t.taskNumber}`,
          labels: t.labels.map((tl) => tl.label),
        }));

      return {
        id: status.id,
        name: status.name,
        category: status.category,
        color: status.color,
        position: status.position,
        isDefault: status.isDefault,
        tasks: colTasks,
      };
    });

    return {
      projectId: project.id,
      projectKey: project.key,
      projectName: project.name,
      columns,
    };
  }
}
