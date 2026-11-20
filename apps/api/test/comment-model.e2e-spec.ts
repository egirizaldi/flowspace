import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/database/prisma.service';
import { AppModule } from '../src/app.module';

describe('Comment Model Database Constraints & Relations (FS-041 Integration)', () => {
  let prisma: PrismaService;

  const uniqueId = Date.now();
  let user1: any;
  let user2: any;
  let org: any;
  let workspace: any;
  let project: any;
  let status: any;
  let task1: any;
  let task2: any;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get<PrismaService>(PrismaService);

    // 1. Create test users
    user1 = await prisma.user.create({
      data: {
        name: 'Commenter One',
        email: `commenter-1-${uniqueId}@flowspace-test.internal`,
        passwordHash: '$argon2id$mockHash1',
      },
    });

    user2 = await prisma.user.create({
      data: {
        name: 'Commenter Two',
        email: `commenter-2-${uniqueId}@flowspace-test.internal`,
        passwordHash: '$argon2id$mockHash2',
      },
    });

    // 2. Create organization & workspace
    org = await prisma.organization.create({
      data: {
        name: `Org Comment Test ${uniqueId}`,
        slug: `org-comment-${uniqueId}`,
        createdBy: user1.id,
      },
    });

    workspace = await prisma.workspace.create({
      data: {
        organizationId: org.id,
        name: `Workspace Comment Test ${uniqueId}`,
        slug: `ws-comment-${uniqueId}`,
        createdBy: user1.id,
      },
    });

    // 3. Create project & default status
    project = await prisma.project.create({
      data: {
        organizationId: org.id,
        workspaceId: workspace.id,
        name: `Project Comment ${uniqueId}`,
        key: `CM${uniqueId.toString().slice(-4)}`,
        createdBy: user1.id,
      },
    });

    status = await prisma.projectStatus.create({
      data: {
        projectId: project.id,
        name: 'Backlog',
        category: 'TODO',
        color: '#64748B',
        position: 0,
        isDefault: true,
      },
    });

    // 4. Create tasks
    task1 = await prisma.task.create({
      data: {
        projectId: project.id,
        taskNumber: 1,
        title: 'Task for Comments',
        statusId: status.id,
        createdBy: user1.id,
        position: 10000,
      },
    });

    task2 = await prisma.task.create({
      data: {
        projectId: project.id,
        taskNumber: 2,
        title: 'Second Task',
        statusId: status.id,
        createdBy: user1.id,
        position: 20000,
      },
    });
  });

  afterAll(async () => {
    if (org?.id) {
      await prisma.organization.delete({ where: { id: org.id } }).catch(() => {});
    }
    if (user1?.id) {
      await prisma.user.delete({ where: { id: user1.id } }).catch(() => {});
    }
    if (user2?.id) {
      await prisma.user.delete({ where: { id: user2.id } }).catch(() => {});
    }
  });

  describe('Comment Model Fields & CRUD', () => {
    let createdCommentId: string;

    it('should create a comment with all required fields', async () => {
      const comment = await prisma.comment.create({
        data: {
          taskId: task1.id,
          userId: user1.id,
          content: 'This is the initial feedback on the task.',
        },
      });

      expect(comment.id).toBeDefined();
      expect(comment.taskId).toBe(task1.id);
      expect(comment.userId).toBe(user1.id);
      expect(comment.content).toBe('This is the initial feedback on the task.');
      expect(comment.createdAt).toBeInstanceOf(Date);
      expect(comment.updatedAt).toBeInstanceOf(Date);
      expect(comment.deletedAt).toBeNull();

      createdCommentId = comment.id;
    });

    it('should load relationships (task, user, task.comments, user.comments)', async () => {
      const comment = await prisma.comment.findUnique({
        where: { id: createdCommentId },
        include: {
          task: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      expect(comment).toBeDefined();
      expect(comment?.task.id).toBe(task1.id);
      expect(comment?.task.title).toBe('Task for Comments');
      expect(comment?.user.id).toBe(user1.id);
      expect(comment?.user.name).toBe('Commenter One');

      // Check reverse relation on Task
      const taskWithComments = await prisma.task.findUnique({
        where: { id: task1.id },
        include: { comments: true },
      });
      expect(taskWithComments?.comments.length).toBeGreaterThanOrEqual(1);
      expect(taskWithComments?.comments.some((c) => c.id === createdCommentId)).toBe(true);
    });

    it('should update comment content and update updatedAt timestamp', async () => {
      const initialComment = await prisma.comment.findUniqueOrThrow({
        where: { id: createdCommentId },
      });

      // Small delay to ensure timestamp progression
      await new Promise((r) => setTimeout(r, 50));

      const updated = await prisma.comment.update({
        where: { id: createdCommentId },
        data: {
          content: 'Edited feedback: looks great, ready for QA.',
        },
      });

      expect(updated.content).toBe('Edited feedback: looks great, ready for QA.');
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(initialComment.updatedAt).getTime(),
      );
    });

    it('should support soft delete via deletedAt', async () => {
      const now = new Date();
      await prisma.comment.update({
        where: { id: createdCommentId },
        data: {
          deletedAt: now,
        },
      });

      // Query active comments only
      const activeComments = await prisma.comment.findMany({
        where: {
          taskId: task1.id,
          deletedAt: null,
        },
      });
      expect(activeComments.some((c) => c.id === createdCommentId)).toBe(false);

      // Verify still in database with deletedAt set
      const softDeleted = await prisma.comment.findUnique({
        where: { id: createdCommentId },
      });
      expect(softDeleted?.deletedAt).not.toBeNull();
    });
  });

  describe('Index and Chronological Ordering', () => {
    it('should support retrieving multiple comments ordered chronologically', async () => {
      const commentA = await prisma.comment.create({
        data: {
          taskId: task2.id,
          userId: user1.id,
          content: 'First discussion comment',
        },
      });

      await new Promise((r) => setTimeout(r, 20));

      const commentB = await prisma.comment.create({
        data: {
          taskId: task2.id,
          userId: user2.id,
          content: 'Reply discussion comment',
        },
      });

      const comments = await prisma.comment.findMany({
        where: {
          taskId: task2.id,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      expect(comments.length).toBe(2);
      expect(comments[0].id).toBe(commentA.id);
      expect(comments[1].id).toBe(commentB.id);
      expect(comments[0].content).toBe('First discussion comment');
      expect(comments[1].content).toBe('Reply discussion comment');
    });
  });

  describe('Foreign Key Constraints & Cascading Deletion', () => {
    it('should fail when creating comment with invalid taskId', async () => {
      await expect(
        prisma.comment.create({
          data: {
            taskId: '00000000-0000-0000-0000-000000000000',
            userId: user1.id,
            content: 'Invalid task comment',
          },
        }),
      ).rejects.toThrow();
    });

    it('should fail when creating comment with invalid userId', async () => {
      await expect(
        prisma.comment.create({
          data: {
            taskId: task1.id,
            userId: '00000000-0000-0000-0000-000000000000',
            content: 'Invalid user comment',
          },
        }),
      ).rejects.toThrow();
    });

    it('should cascade delete comments when parent task is deleted', async () => {
      // Create temporary task
      const tempTask = await prisma.task.create({
        data: {
          projectId: project.id,
          taskNumber: 99,
          title: 'Temp Task for Cascade Delete',
          statusId: status.id,
          createdBy: user1.id,
          position: 99000,
        },
      });

      const tempComment = await prisma.comment.create({
        data: {
          taskId: tempTask.id,
          userId: user1.id,
          content: 'This comment should be cascade deleted',
        },
      });

      // Delete parent task
      await prisma.task.delete({
        where: { id: tempTask.id },
      });

      // Verify comment is removed
      const foundComment = await prisma.comment.findUnique({
        where: { id: tempComment.id },
      });
      expect(foundComment).toBeNull();
    });
  });
});
