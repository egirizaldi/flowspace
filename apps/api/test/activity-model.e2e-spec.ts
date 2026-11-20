import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/database/prisma.service';
import { AppModule } from '../src/app.module';

describe('Activity Model Database Constraints & Relations (FS-044 Integration)', () => {
  let prisma: PrismaService;

  const uniqueId = Date.now();
  let user: any;
  let org: any;
  let workspace: any;
  let project: any;
  let status: any;
  let task: any;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get<PrismaService>(PrismaService);

    // 1. Create user
    user = await prisma.user.create({
      data: {
        name: 'Audit Actor',
        email: `audit-actor-${uniqueId}@flowspace-test.internal`,
        passwordHash: '$argon2id$mockHash1',
      },
    });

    // 2. Create organization & workspace
    org = await prisma.organization.create({
      data: {
        name: `Audit Org ${uniqueId}`,
        slug: `audit-org-${uniqueId}`,
        createdBy: user.id,
      },
    });

    workspace = await prisma.workspace.create({
      data: {
        organizationId: org.id,
        name: `Audit WS ${uniqueId}`,
        slug: `audit-ws-${uniqueId}`,
        createdBy: user.id,
      },
    });

    // 3. Create project & default status
    project = await prisma.project.create({
      data: {
        organizationId: org.id,
        workspaceId: workspace.id,
        name: `Audit Project ${uniqueId}`,
        key: `AP${uniqueId.toString().slice(-4)}`,
        createdBy: user.id,
      },
    });

    status = await prisma.projectStatus.create({
      data: {
        projectId: project.id,
        name: 'Todo',
        category: 'TODO',
        color: '#94A3B8',
        position: 0,
        isDefault: true,
      },
    });

    // 4. Create task
    task = await prisma.task.create({
      data: {
        projectId: project.id,
        taskNumber: 1,
        title: 'Audit Target Task',
        statusId: status.id,
        createdBy: user.id,
        position: 10000,
      },
    });
  });

  afterAll(async () => {
    if (org?.id) {
      await prisma.organization.delete({ where: { id: org.id } }).catch(() => {});
    }
    if (user?.id) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    }
  });

  describe('Activity Model Fields & CRUD', () => {
    let taskActivityId: string;
    let projectActivityId: string;

    it('should create task-level activity record with full fields and JSON metadata', async () => {
      const activity = await prisma.activity.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          taskId: task.id,
          actorId: user.id,
          action: 'TASK_STATUS_CHANGED',
          entityType: 'TASK',
          entityId: task.id,
          metadata: {
            oldStatusId: 'status-old',
            newStatusId: status.id,
            oldStatusName: 'Backlog',
            newStatusName: 'Todo',
          },
        },
      });

      expect(activity.id).toBeDefined();
      expect(activity.organizationId).toBe(org.id);
      expect(activity.projectId).toBe(project.id);
      expect(activity.taskId).toBe(task.id);
      expect(activity.actorId).toBe(user.id);
      expect(activity.action).toBe('TASK_STATUS_CHANGED');
      expect(activity.entityType).toBe('TASK');
      expect(activity.entityId).toBe(task.id);
      expect(activity.metadata).toEqual({
        oldStatusId: 'status-old',
        newStatusId: status.id,
        oldStatusName: 'Backlog',
        newStatusName: 'Todo',
      });
      expect(activity.createdAt).toBeInstanceOf(Date);

      taskActivityId = activity.id;
    });

    it('should create project-level activity record with null taskId', async () => {
      const activity = await prisma.activity.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          taskId: null,
          actorId: user.id,
          action: 'PROJECT_UPDATED',
          entityType: 'PROJECT',
          entityId: project.id,
          metadata: { field: 'name', value: 'Updated Project Name' },
        },
      });

      expect(activity.id).toBeDefined();
      expect(activity.taskId).toBeNull();
      expect(activity.projectId).toBe(project.id);
      expect(activity.action).toBe('PROJECT_UPDATED');

      projectActivityId = activity.id;
    });

    it('should load multi-level relationships (organization, project, task, actor)', async () => {
      const activity = await prisma.activity.findUnique({
        where: { id: taskActivityId },
        include: {
          organization: true,
          project: true,
          task: true,
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      expect(activity).toBeDefined();
      expect(activity?.organization.id).toBe(org.id);
      expect(activity?.project?.id).toBe(project.id);
      expect(activity?.task?.id).toBe(task.id);
      expect(activity?.actor.id).toBe(user.id);
      expect(activity?.actor.name).toBe(user.name);
    });
  });

  describe('Timeline Querying & Indexes', () => {
    it('should query task activities chronologically descending using [taskId, createdAt] index', async () => {
      // Create additional task activity
      await prisma.activity.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          taskId: task.id,
          actorId: user.id,
          action: 'COMMENT_ADDED',
          entityType: 'COMMENT',
          entityId: '00000000-0000-0000-0000-000000000001',
          metadata: { commentPreview: 'Looks good' },
        },
      });

      const activities = await prisma.activity.findMany({
        where: { taskId: task.id },
        orderBy: { createdAt: 'desc' },
      });

      expect(activities.length).toBeGreaterThanOrEqual(2);
      expect(activities[0].action).toBe('COMMENT_ADDED');
      expect(activities[1].action).toBe('TASK_STATUS_CHANGED');
    });

    it('should query organization-wide activities using [organizationId, createdAt] index', async () => {
      const orgActivities = await prisma.activity.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: 'desc' },
      });

      expect(orgActivities.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Cascade and Set Null Foreign Key Behaviors', () => {
    it('should set taskId to null when task is deleted, preserving audit history', async () => {
      // 1. Create a temporary task
      const tempTask = await prisma.task.create({
        data: {
          projectId: project.id,
          taskNumber: 999,
          title: 'Temporary Task to Delete',
          statusId: status.id,
          createdBy: user.id,
          position: 999000,
        },
      });

      // 2. Create activity for temporary task
      const tempActivity = await prisma.activity.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          taskId: tempTask.id,
          actorId: user.id,
          action: 'TASK_DELETED',
          entityType: 'TASK',
          entityId: tempTask.id,
        },
      });

      // 3. Delete the temporary task
      await prisma.task.delete({
        where: { id: tempTask.id },
      });

      // 4. Verify activity record is preserved with taskId = null
      const foundActivity = await prisma.activity.findUnique({
        where: { id: tempActivity.id },
      });

      expect(foundActivity).toBeDefined();
      expect(foundActivity?.taskId).toBeNull();
      expect(foundActivity?.action).toBe('TASK_DELETED');
    });

    it('should cascade delete activities when organization is deleted', async () => {
      // 1. Create temporary org
      const tempOrg = await prisma.organization.create({
        data: {
          name: `Temp Org Cascade ${uniqueId}`,
          slug: `temp-org-${uniqueId}`,
          createdBy: user.id,
        },
      });

      // 2. Create activity for temp org
      const tempActivity = await prisma.activity.create({
        data: {
          organizationId: tempOrg.id,
          actorId: user.id,
          action: 'ORGANIZATION_CREATED',
          entityType: 'ORGANIZATION',
          entityId: tempOrg.id,
        },
      });

      // 3. Delete temporary org
      await prisma.organization.delete({
        where: { id: tempOrg.id },
      });

      // 4. Verify activity was cascade deleted
      const found = await prisma.activity.findUnique({
        where: { id: tempActivity.id },
      });

      expect(found).toBeNull();
    });
  });
});
