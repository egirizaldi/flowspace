import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TasksService } from '../tasks/tasks.service';
import { ActivitiesService } from '../activities/activities.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { QueryCommentsDto } from './dto/query-comments.dto';
import {
  ProjectRole,
  WorkspaceRole,
  OrganizationRole,
  Prisma,
} from '@prisma/client';

const commentUserSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
};

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  private async hasManagerAccess(
    projectId: string,
    workspaceId: string,
    organizationId: string,
    userId: string,
  ): Promise<boolean> {
    const [projectMember, wsMember, orgMember] = await Promise.all([
      this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
      }),
      this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
      }),
      this.prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId } },
      }),
    ]);

    return (
      projectMember?.role === ProjectRole.MANAGER ||
      wsMember?.role === WorkspaceRole.OWNER ||
      wsMember?.role === WorkspaceRole.ADMIN ||
      orgMember?.role === OrganizationRole.OWNER ||
      orgMember?.role === OrganizationRole.ADMIN
    );
  }

  async createComment(taskId: string, userId: string, dto: CreateCommentDto) {
    const task = await this.tasksService.checkTaskAccess(taskId, userId);

    const comment = await this.prisma.comment.create({
      data: {
        taskId,
        userId,
        content: dto.content.trim(),
      },
      include: {
        user: {
          select: commentUserSelect,
        },
      },
    });

    await this.activitiesService.logActivity({
      organizationId: task.project.organizationId,
      projectId: task.projectId,
      taskId: task.id,
      actorId: userId,
      action: 'COMMENT_ADDED',
      entityType: 'COMMENT',
      entityId: comment.id,
      metadata: {
        commentId: comment.id,
        preview: dto.content.trim().slice(0, 100),
        taskKey: `${task.project.key}-${task.taskNumber}`,
      },
    });

    return comment;
  }

  async getTaskComments(taskId: string, userId: string, query: QueryCommentsDto) {
    await this.tasksService.checkTaskAccess(taskId, userId);

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;
    const sort = query.sort === 'desc' ? 'desc' : 'asc';

    const where: Prisma.CommentWhereInput = {
      taskId,
      deletedAt: null,
    };

    const [total, comments] = await Promise.all([
      this.prisma.comment.count({ where }),
      this.prisma.comment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: sort },
        include: {
          user: {
            select: commentUserSelect,
          },
        },
      }),
    ]);

    return {
      comments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async updateComment(
    taskId: string,
    commentId: string,
    userId: string,
    dto: UpdateCommentDto,
  ) {
    const task = await this.tasksService.checkTaskAccess(taskId, userId);

    const comment = await this.prisma.comment.findFirst({
      where: {
        id: commentId,
        taskId,
        deletedAt: null,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      const isManager = await this.hasManagerAccess(
        task.projectId,
        task.project.workspaceId,
        task.project.organizationId,
        userId,
      );

      if (!isManager) {
        throw new ForbiddenException(
          'You do not have permission to edit this comment',
        );
      }
    }

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: {
        content: dto.content.trim(),
      },
      include: {
        user: {
          select: commentUserSelect,
        },
      },
    });

    return updated;
  }

  async deleteComment(taskId: string, commentId: string, userId: string) {
    const task = await this.tasksService.checkTaskAccess(taskId, userId);

    const comment = await this.prisma.comment.findFirst({
      where: {
        id: commentId,
        taskId,
        deletedAt: null,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      const isManager = await this.hasManagerAccess(
        task.projectId,
        task.project.workspaceId,
        task.project.organizationId,
        userId,
      );

      if (!isManager) {
        throw new ForbiddenException(
          'You do not have permission to delete this comment',
        );
      }
    }

    await this.prisma.comment.update({
      where: { id: commentId },
      data: {
        deletedAt: new Date(),
      },
    });

    return { message: 'Comment deleted successfully' };
  }
}
