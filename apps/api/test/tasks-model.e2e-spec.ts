import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/database/prisma.service';
import { AppModule } from '../src/app.module';
import {
  TaskPriority,
  ProjectStatusCategory,
  Prisma,
} from '@prisma/client';

describe('Task Model Database Constraints & Relations (FS-030 Integration)', () => {
  let prisma: PrismaService;

  const uniqueId = Date.now();
  let user1: any;
  let user2: any;
  let org: any;
  let workspace: any;
  let project1: any;
  let project2: any;
  let statusTodo1: any;
  let statusDone1: any;
  let statusTodo2: any;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get<PrismaService>(PrismaService);

    // 1. Create test users
    user1 = await prisma.user.create({
      data: {
        name: 'Task Model Author',
        email: `task-author-${uniqueId}@flowspace-test.internal`,
        passwordHash: '$argon2id$mockHash1',
      },
    });

    user2 = await prisma.user.create({
      data: {
        name: 'Task Model Assignee',
        email: `task-assignee-${uniqueId}@flowspace-test.internal`,
        passwordHash: '$argon2id$mockHash2',
      },
    });

    // 2. Create organization
    org = await prisma.organization.create({
      data: {
        name: `Org Task Test ${uniqueId}`,
        slug: `org-task-${uniqueId}`,
        createdBy: user1.id,
      },
    });

    // 3. Create workspace
    workspace = await prisma.workspace.create({
      data: {
        organizationId: org.id,
        name: `Workspace Task Test ${uniqueId}`,
        slug: `ws-task-${uniqueId}`,
        createdBy: user1.id,
      },
    });

    // 4. Create two projects for scoped uniqueness verification
    project1 = await prisma.project.create({
      data: {
        organizationId: org.id,
        workspaceId: workspace.id,
        name: `Project Core ${uniqueId}`,
        key: 'CORE',
        createdBy: user1.id,
      },
    });

    project2 = await prisma.project.create({
      data: {
        organizationId: org.id,
        workspaceId: workspace.id,
        name: `Project Web ${uniqueId}`,
        key: 'WEB',
        createdBy: user1.id,
      },
    });

    // 5. Create project statuses for project1 and project2
    statusTodo1 = await prisma.projectStatus.create({
      data: {
        projectId: project1.id,
        name: 'To Do',
        category: ProjectStatusCategory.TODO,
        color: '#64748b',
        position: 1000,
        isDefault: true,
      },
    });

    statusDone1 = await prisma.projectStatus.create({
      data: {
        projectId: project1.id,
        name: 'Done',
        category: ProjectStatusCategory.DONE,
        color: '#22c55e',
        position: 2000,
        isDefault: false,
      },
    });

    statusTodo2 = await prisma.projectStatus.create({
      data: {
        projectId: project2.id,
        name: 'To Do',
        category: ProjectStatusCategory.TODO,
        color: '#64748b',
        position: 1000,
        isDefault: true,
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.organization.deleteMany({
        where: { slug: { contains: `-task-${uniqueId}` } },
      });
      await prisma.user.deleteMany({
        where: { email: { contains: '-test.internal' } },
      });
      await prisma.$disconnect();
    }
  });

  describe('Task Creation & Attributes', () => {
    it('should create a task with required fields and verify default values (priority MEDIUM, version 1)', async () => {
      const task = await prisma.task.create({
        data: {
          projectId: project1.id,
          statusId: statusTodo1.id,
          taskNumber: 1,
          title: 'Implement database schema',
          description: 'Define models and migrations',
          position: new Prisma.Decimal('65535.0000000000'),
          createdBy: user1.id,
        },
      });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.projectId).toBe(project1.id);
      expect(task.statusId).toBe(statusTodo1.id);
      expect(task.taskNumber).toBe(1);
      expect(task.title).toBe('Implement database schema');
      expect(task.description).toBe('Define models and migrations');
      expect(task.priority).toBe(TaskPriority.MEDIUM);
      expect(task.version).toBe(1);
      expect(task.assigneeId).toBeNull();
      expect(task.parentTaskId).toBeNull();
      expect(task.startDate).toBeNull();
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.deletedAt).toBeNull();
      expect(task.position.toString()).toBe('65535');
    });

    it('should create a task with explicit priority and single assignee', async () => {
      const startDate = new Date('2026-02-01');
      const dueDate = new Date('2026-02-15');

      const task = await prisma.task.create({
        data: {
          projectId: project1.id,
          statusId: statusTodo1.id,
          taskNumber: 2,
          title: 'High priority urgent bug',
          priority: TaskPriority.URGENT,
          assigneeId: user2.id,
          startDate,
          dueDate,
          position: new Prisma.Decimal('131070.0000000000'),
          createdBy: user1.id,
        },
        include: {
          assignee: true,
          creator: true,
          project: true,
          status: true,
        },
      });

      expect(task.priority).toBe(TaskPriority.URGENT);
      expect(task.assigneeId).toBe(user2.id);
      expect(task.assignee?.name).toBe('Task Model Assignee');
      expect(task.creator?.name).toBe('Task Model Author');
      expect(task.project.key).toBe('CORE');
      expect(task.status.name).toBe('To Do');
    });
  });

  describe('Uniqueness Constraints', () => {
    it('should enforce unique taskNumber per project (@@unique([projectId, taskNumber]))', async () => {
      // taskNumber 1 already exists in project1
      await expect(
        prisma.task.create({
          data: {
            projectId: project1.id,
            statusId: statusTodo1.id,
            taskNumber: 1, // Duplicate
            title: 'Conflict task number',
            position: new Prisma.Decimal('1000.0000000000'),
            createdBy: user1.id,
          },
        }),
      ).rejects.toThrow();
    });

    it('should allow the same taskNumber across different projects', async () => {
      // taskNumber 1 in project2 should succeed even though project1 has taskNumber 1
      const taskInProj2 = await prisma.task.create({
        data: {
          projectId: project2.id,
          statusId: statusTodo2.id,
          taskNumber: 1,
          title: 'Web initial task',
          position: new Prisma.Decimal('65535.0000000000'),
          createdBy: user1.id,
        },
      });

      expect(taskInProj2.projectId).toBe(project2.id);
      expect(taskInProj2.taskNumber).toBe(1);
    });
  });

  describe('Parent-Child Subtasks Relation', () => {
    it('should link subtask to parent task and query bi-directionally', async () => {
      const parentTask = await prisma.task.create({
        data: {
          projectId: project1.id,
          statusId: statusTodo1.id,
          taskNumber: 3,
          title: 'Parent feature task',
          position: new Prisma.Decimal('196605.0000000000'),
          createdBy: user1.id,
        },
      });

      const subtask1 = await prisma.task.create({
        data: {
          projectId: project1.id,
          statusId: statusTodo1.id,
          parentTaskId: parentTask.id,
          taskNumber: 4,
          title: 'Subtask 1 - Unit tests',
          position: new Prisma.Decimal('1000.0000000000'),
          createdBy: user1.id,
        },
      });

      const subtask2 = await prisma.task.create({
        data: {
          projectId: project1.id,
          statusId: statusTodo1.id,
          parentTaskId: parentTask.id,
          taskNumber: 5,
          title: 'Subtask 2 - Integration tests',
          position: new Prisma.Decimal('2000.0000000000'),
          createdBy: user1.id,
        },
      });

      // Verify parent includes subtasks
      const foundParent = await prisma.task.findUnique({
        where: { id: parentTask.id },
        include: { subtasks: { orderBy: { position: 'asc' } } },
      });

      expect(foundParent?.subtasks).toHaveLength(2);
      expect(foundParent?.subtasks[0].id).toBe(subtask1.id);
      expect(foundParent?.subtasks[1].id).toBe(subtask2.id);

      // Verify subtask includes parentTask
      const foundSubtask = await prisma.task.findUnique({
        where: { id: subtask1.id },
        include: { parentTask: true },
      });
      expect(foundSubtask?.parentTask?.id).toBe(parentTask.id);
    });

    it('should set parentTaskId to null when parent task is deleted (onDelete: SetNull)', async () => {
      const parent = await prisma.task.create({
        data: {
          projectId: project1.id,
          statusId: statusTodo1.id,
          taskNumber: 10,
          title: 'Parent to delete',
          position: new Prisma.Decimal('500000.0000000000'),
          createdBy: user1.id,
        },
      });

      const child = await prisma.task.create({
        data: {
          projectId: project1.id,
          statusId: statusTodo1.id,
          parentTaskId: parent.id,
          taskNumber: 11,
          title: 'Child whose parent will be deleted',
          position: new Prisma.Decimal('1000.0000000000'),
          createdBy: user1.id,
        },
      });

      // Delete the parent task
      await prisma.task.delete({ where: { id: parent.id } });

      // Child task must remain alive with parentTaskId set to null
      const remainingChild = await prisma.task.findUnique({
        where: { id: child.id },
      });

      expect(remainingChild).not.toBeNull();
      expect(remainingChild?.parentTaskId).toBeNull();
    });
  });

  describe('Task Labels (Junction Relation)', () => {
    it('should attach labels to tasks via TaskLabel junction table and prevent duplicates', async () => {
      const label1 = await prisma.label.create({
        data: {
          projectId: project1.id,
          name: 'Backend',
          color: '#3b82f6',
        },
      });

      const label2 = await prisma.label.create({
        data: {
          projectId: project1.id,
          name: 'Security',
          color: '#ef4444',
        },
      });

      const task = await prisma.task.create({
        data: {
          projectId: project1.id,
          statusId: statusTodo1.id,
          taskNumber: 20,
          title: 'Implement OAuth refresh',
          position: new Prisma.Decimal('600000.0000000000'),
          createdBy: user1.id,
        },
      });

      // Attach labels
      await prisma.taskLabel.create({
        data: {
          taskId: task.id,
          labelId: label1.id,
        },
      });

      await prisma.taskLabel.create({
        data: {
          taskId: task.id,
          labelId: label2.id,
        },
      });

      // Duplicate attachment should fail (composite primary key [taskId, labelId])
      await expect(
        prisma.taskLabel.create({
          data: {
            taskId: task.id,
            labelId: label1.id,
          },
        }),
      ).rejects.toThrow();

      // Query task with labels
      const taskWithLabels = await prisma.task.findUnique({
        where: { id: task.id },
        include: {
          labels: {
            include: { label: true },
          },
        },
      });

      expect(taskWithLabels?.labels).toHaveLength(2);
      const labelNames = taskWithLabels?.labels.map((l) => l.label.name);
      expect(labelNames).toContain('Backend');
      expect(labelNames).toContain('Security');
    });
  });

  describe('Optimistic Concurrency (Version Attribute)', () => {
    it('should allow version increment during task update', async () => {
      const task = await prisma.task.create({
        data: {
          projectId: project1.id,
          statusId: statusTodo1.id,
          taskNumber: 30,
          title: 'Concurrency test task',
          position: new Prisma.Decimal('700000.0000000000'),
          createdBy: user1.id,
        },
      });

      expect(task.version).toBe(1);

      // Simulate atomic update with version increment
      const updated = await prisma.task.update({
        where: {
          id: task.id,
          version: 1, // Precondition check
        },
        data: {
          title: 'Concurrency test task - updated title',
          version: { increment: 1 },
        },
      });

      expect(updated.version).toBe(2);
      expect(updated.title).toBe('Concurrency test task - updated title');
    });
  });

  describe('Cascade Deletion Behavior', () => {
    it('should cascade delete task labels when task is deleted', async () => {
      const label = await prisma.label.create({
        data: {
          projectId: project1.id,
          name: 'CascadeLabel',
          color: '#10b981',
        },
      });

      const task = await prisma.task.create({
        data: {
          projectId: project1.id,
          statusId: statusTodo1.id,
          taskNumber: 40,
          title: 'Task to test label cascade',
          position: new Prisma.Decimal('800000.0000000000'),
          createdBy: user1.id,
        },
      });

      await prisma.taskLabel.create({
        data: {
          taskId: task.id,
          labelId: label.id,
        },
      });

      // Delete task
      await prisma.task.delete({ where: { id: task.id } });

      // TaskLabel junction record must be deleted
      const junctionCount = await prisma.taskLabel.count({
        where: { taskId: task.id },
      });
      expect(junctionCount).toBe(0);

      // Label itself must remain
      const labelStillExists = await prisma.label.findUnique({
        where: { id: label.id },
      });
      expect(labelStillExists).not.toBeNull();
    });

    it('should cascade delete all tasks and labels when project is deleted', async () => {
      const tempProject = await prisma.project.create({
        data: {
          organizationId: org.id,
          workspaceId: workspace.id,
          name: 'Temp Project To Delete',
          key: 'TEMP',
          createdBy: user1.id,
        },
      });

      const tempStatus = await prisma.projectStatus.create({
        data: {
          projectId: tempProject.id,
          name: 'Temp Status',
          category: ProjectStatusCategory.TODO,
          color: '#64748b',
          position: 1000,
        },
      });

      const tempTask = await prisma.task.create({
        data: {
          projectId: tempProject.id,
          statusId: tempStatus.id,
          taskNumber: 1,
          title: 'Temporary task',
          position: new Prisma.Decimal('1000.0000000000'),
          createdBy: user1.id,
        },
      });

      // Delete temp project
      await prisma.project.delete({ where: { id: tempProject.id } });

      // Verify tasks in that project are deleted
      const foundTask = await prisma.task.findUnique({
        where: { id: tempTask.id },
      });
      expect(foundTask).toBeNull();
    });
  });
});
