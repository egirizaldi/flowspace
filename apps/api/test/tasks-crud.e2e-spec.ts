import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as supertest from 'supertest';
const request = (supertest as any).default || supertest;
import * as cookieParser from 'cookie-parser';
const cookieMiddleware = (cookieParser as any).default || cookieParser;
import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';
import { ProjectRole, TaskPriority, ProjectStatusCategory } from '@prisma/client';

describe('Tasks CRUD & Transition API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const uniqueId = Date.now();

  const userLead = {
    name: 'Crud Lead',
    email: `crud-lead-${uniqueId}@flowspace-crud.internal`,
    password: 'Password123!',
  };

  const userDev = {
    name: 'Crud Dev',
    email: `crud-dev-${uniqueId}@flowspace-crud.internal`,
    password: 'Password123!',
  };

  const userViewer = {
    name: 'Crud Viewer',
    email: `crud-viewer-${uniqueId}@flowspace-crud.internal`,
    password: 'Password123!',
  };

  const userOutsider = {
    name: 'Crud Outsider',
    email: `crud-outsider-${uniqueId}@flowspace-crud.internal`,
    password: 'Password123!',
  };

  let tokenLead: string;
  let tokenDev: string;
  let tokenViewer: string;
  let tokenOutsider: string;
  let userDevId: string;
  let orgId: string;
  let workspaceId: string;
  let projectId: string;
  let foreignProjectId: string;
  let foreignStatusId: string;

  let statusTodo: any;
  let statusInProgress: any;
  let statusDone: any;
  let testTask: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieMiddleware());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    const setupUser = async (u: typeof userLead) => {
      const regRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(u)
        .expect(201);

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: u.email, password: u.password })
        .expect(200);

      const cookies = loginRes.headers['set-cookie'];
      const sessionCookie = cookies.find((c: string) =>
        c.startsWith('flowspace_session='),
      );
      return {
        id: regRes.body.data.id,
        token: sessionCookie.split(';')[0].split('=')[1],
      };
    };

    const lead = await setupUser(userLead);
    tokenLead = lead.token;

    const dev = await setupUser(userDev);
    tokenDev = dev.token;
    userDevId = dev.id;

    const viewer = await setupUser(userViewer);
    tokenViewer = viewer.token;

    const outsider = await setupUser(userOutsider);
    tokenOutsider = outsider.token;

    // Create organization & workspace with Lead
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', `flowspace_session=${tokenLead}`)
      .send({
        name: `Org Tasks CRUD ${uniqueId}`,
        slug: `org-tasks-crud-${uniqueId}`,
      })
      .expect(201);
    orgId = orgRes.body.data.id;

    const wsRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspaces`)
      .set('Cookie', `flowspace_session=${tokenLead}`)
      .send({
        name: `WS Tasks CRUD ${uniqueId}`,
        slug: `ws-tasks-crud-${uniqueId}`,
      })
      .expect(201);
    workspaceId = wsRes.body.data.id;

    // Create Main Project
    const projRes = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Cookie', `flowspace_session=${tokenLead}`)
      .send({
        name: 'CRUD Project',
        key: 'CRUD',
      })
      .expect(201);
    projectId = projRes.body.data.id;

    // Create Foreign Project for cross-project isolation tests
    const foreignProjRes = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Cookie', `flowspace_session=${tokenLead}`)
      .send({
        name: 'Foreign Project',
        key: 'FOR',
      })
      .expect(201);
    foreignProjectId = foreignProjRes.body.data.id;

    const foreignStatuses = await prisma.projectStatus.findMany({
      where: { projectId: foreignProjectId },
    });
    foreignStatusId = foreignStatuses[0].id;

    // Retrieve statuses of Main Project
    const statuses = await prisma.projectStatus.findMany({
      where: { projectId },
      orderBy: { position: 'asc' },
    });
    statusTodo = statuses.find((s) => s.category === ProjectStatusCategory.TODO);
    statusInProgress = statuses.find((s) => s.category === ProjectStatusCategory.IN_PROGRESS);
    statusDone = statuses.find((s) => s.category === ProjectStatusCategory.DONE);

    // Add Dev as MEMBER to workspace and project
    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: userDevId,
        role: 'MEMBER',
      },
    });
    await prisma.projectMember.create({
      data: {
        projectId,
        userId: userDevId,
        role: ProjectRole.MEMBER,
      },
    });

    // Add Viewer as VIEWER to workspace and project
    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: viewer.id,
        role: 'MEMBER',
      },
    });
    await prisma.projectMember.create({
      data: {
        projectId,
        userId: viewer.id,
        role: ProjectRole.VIEWER,
      },
    });

    // Seed initial tasks
    const t1 = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Cookie', `flowspace_session=${tokenLead}`)
      .send({
        title: 'Primary Task For Testing',
        description: 'Initial description',
        statusId: statusTodo.id,
        priority: TaskPriority.MEDIUM,
      })
      .expect(201);
    testTask = t1.body.data;

    // Seed a second task for query filtering
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Cookie', `flowspace_session=${tokenLead}`)
      .send({
        title: 'Secondary Urgent Bug',
        description: 'Critical issue in auth module',
        statusId: statusInProgress.id,
        priority: TaskPriority.URGENT,
        assigneeId: userDevId,
      })
      .expect(201);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.organization.deleteMany({
        where: { slug: { contains: `-tasks-crud-${uniqueId}` } },
      });
      await prisma.user.deleteMany({
        where: { email: { contains: '-crud.internal' } },
      });
      await prisma.$disconnect();
    }
    await app.close();
  });

  describe('GET /api/v1/projects/:projectId/tasks', () => {
    it('should list tasks with pagination metadata', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/tasks?page=1&limit=10`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.total).toBe(2);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.totalPages).toBe(1);
    });

    it('should filter tasks by statusId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/tasks?statusId=${statusInProgress.id}`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Secondary Urgent Bug');
    });

    it('should filter tasks by priority', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/tasks?priority=URGENT`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].priority).toBe('URGENT');
    });

    it('should filter tasks by search keyword', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/tasks?search=Critical`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Secondary Urgent Bug');
    });

    it('should allow project viewer to read tasks', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/tasks`)
        .set('Cookie', `flowspace_session=${tokenViewer}`)
        .expect(200);

      expect(res.body.data.length).toBe(2);
    });

    it('should reject outsider reading tasks (403)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/tasks`)
        .set('Cookie', `flowspace_session=${tokenOutsider}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/tasks/:taskId', () => {
    it('should return complete task details with relations and taskKey', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${testTask.id}`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const task = res.body.data;
      expect(task.id).toBe(testTask.id);
      expect(task.taskKey).toBe('CRUD-1');
      expect(task.project.key).toBe('CRUD');
      expect(task.status.name).toBe(statusTodo.name);
      expect(task.creator.email).toBe(userLead.email);
      expect(Array.isArray(task.subtasks)).toBe(true);
      expect(Array.isArray(task.labels)).toBe(true);
    });

    it('should return 404 for non-existent taskId', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/tasks/00000000-0000-0000-0000-000000000000')
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/tasks/:taskId', () => {
    it('should update general details and increment version', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${testTask.id}`)
        .set('Cookie', `flowspace_session=${tokenDev}`)
        .send({
          title: 'Updated Primary Task Title',
          description: 'Updated comprehensive description',
          priority: TaskPriority.HIGH,
          version: 1, // current version
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated Primary Task Title');
      expect(res.body.data.description).toBe('Updated comprehensive description');
      expect(res.body.data.priority).toBe(TaskPriority.HIGH);
      expect(res.body.data.version).toBe(2); // incremented
    });

    it('should reject update on stale version with 409 Conflict', async () => {
      // testTask is now at version 2, sending version 1 should fail
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${testTask.id}`)
        .set('Cookie', `flowspace_session=${tokenDev}`)
        .send({
          title: 'Stale version attempt',
          version: 1,
        })
        .expect(409);

      expect(res.body.message).toContain('modified by another process');
    });

    it('should reject viewer modifying task (403)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${testTask.id}`)
        .set('Cookie', `flowspace_session=${tokenViewer}`)
        .send({
          title: 'Viewer unauthorized edit',
          version: 2,
        })
        .expect(403);
    });
  });

  describe('PATCH /api/v1/tasks/:taskId/status', () => {
    it('should update status to DONE and set completedAt', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${testTask.id}/status`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          statusId: statusDone.id,
          version: 2,
        })
        .expect(200);

      expect(res.body.data.statusId).toBe(statusDone.id);
      expect(res.body.data.completedAt).not.toBeNull();
      expect(res.body.data.version).toBe(3);
    });

    it('should update status back to TODO and clear completedAt', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${testTask.id}/status`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          statusId: statusTodo.id,
          version: 3,
        })
        .expect(200);

      expect(res.body.data.statusId).toBe(statusTodo.id);
      expect(res.body.data.completedAt).toBeNull();
      expect(res.body.data.version).toBe(4);
    });

    it('should reject status belonging to another project (400)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${testTask.id}/status`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          statusId: foreignStatusId,
          version: 4,
        })
        .expect(400);
    });
  });

  describe('PATCH /api/v1/tasks/:taskId/assignee', () => {
    it('should assign task to developer and increment version', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${testTask.id}/assignee`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          assigneeId: userDevId,
          version: 4,
        })
        .expect(200);

      expect(res.body.data.assignee.id).toBe(userDevId);
      expect(res.body.data.version).toBe(5);
    });

    it('should unassign task by passing null', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${testTask.id}/assignee`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          assigneeId: null,
          version: 5,
        })
        .expect(200);

      expect(res.body.data.assigneeId).toBeNull();
      expect(res.body.data.version).toBe(6);
    });
  });

  describe('PATCH /api/v1/tasks/:taskId/move', () => {
    it('should move task to different position rank and status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${testTask.id}/move`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          statusId: statusInProgress.id,
          position: '200000.0000000000',
          version: 6,
        })
        .expect(200);

      expect(res.body.data.statusId).toBe(statusInProgress.id);
      expect(res.body.data.position.toString()).toBe('200000');
      expect(res.body.data.version).toBe(7);
    });
  });

  describe('DELETE /api/v1/tasks/:taskId', () => {
    let taskToDelete: any;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          title: 'Task earmarked for deletion',
        });
      taskToDelete = res.body.data;
    });

    it('should reject task deletion by standard project MEMBER (403)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${taskToDelete.id}`)
        .set('Cookie', `flowspace_session=${tokenDev}`)
        .expect(403);
    });

    it('should allow project MANAGER to delete task (200)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${taskToDelete.id}`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.deletedId).toBe(taskToDelete.id);

      // Verify task is deleted
      await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskToDelete.id}`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .expect(404);
    });
  });
});
