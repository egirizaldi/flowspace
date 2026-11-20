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

describe('Activity Log Service & API (FS-045 e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const uniqueId = Date.now();

  const userOwner = {
    name: 'Activity Owner',
    email: `act-owner-${uniqueId}@flowspace.internal`,
    password: 'Password123!',
  };

  const userMember = {
    name: 'Activity Member',
    email: `act-member-${uniqueId}@flowspace.internal`,
    password: 'Password123!',
  };

  const userOutsider = {
    name: 'Activity Outsider',
    email: `act-outsider-${uniqueId}@flowspace.internal`,
    password: 'Password123!',
  };

  let tokenOwner: string;
  let tokenMember: string;
  let tokenOutsider: string;
  let userOwnerId: string;
  let userMemberId: string;
  let userOutsiderId: string;
  let orgId: string;
  let workspaceId: string;
  let projectId: string;
  let statusTodoId: string;
  let statusInProgressId: string;
  let statusDoneId: string;
  let taskId: string;

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

    const setupUser = async (u: typeof userOwner) => {
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

    const ownerRes = await setupUser(userOwner);
    userOwnerId = ownerRes.id;
    tokenOwner = ownerRes.token;

    const memberRes = await setupUser(userMember);
    userMemberId = memberRes.id;
    tokenMember = memberRes.token;

    const outsiderRes = await setupUser(userOutsider);
    userOutsiderId = outsiderRes.id;
    tokenOutsider = outsiderRes.token;

    // Create Org & Workspace as Owner
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({ name: `Activity Org ${uniqueId}` })
      .expect(201);
    orgId = orgRes.body.data.id;

    const wsRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspaces`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({ name: `Activity WS ${uniqueId}` })
      .expect(201);
    workspaceId = wsRes.body.data.id;

    // Create Project
    const projRes = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({ name: 'Activity Project', key: `ACT${uniqueId.toString().slice(-4)}` })
      .expect(201);
    projectId = projRes.body.data.id;

    // Add Member to Org and Workspace
    await prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId: userMemberId,
        role: 'MEMBER',
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: userMemberId,
        role: 'MEMBER',
      },
    });

    // Add Member to Project
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({ userId: userMemberId, role: 'MEMBER' })
      .expect(201);

    // Retrieve default statuses
    const statusesRes = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/statuses`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .expect(200);

    const statuses = statusesRes.body.data;
    statusTodoId = statuses.find((s: any) => s.category === 'TODO')?.id || statuses[0].id;
    statusInProgressId = statuses.find((s: any) => s.category === 'IN_PROGRESS')?.id || statuses[1]?.id;
    statusDoneId = statuses.find((s: any) => s.category === 'DONE')?.id || statuses[statuses.length - 1]?.id;
  });

  afterAll(async () => {
    if (orgId) {
      await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
    }
    if (userOwnerId) {
      await prisma.user.delete({ where: { id: userOwnerId } }).catch(() => {});
    }
    if (userMemberId) {
      await prisma.user.delete({ where: { id: userMemberId } }).catch(() => {});
    }
    if (userOutsiderId) {
      await prisma.user.delete({ where: { id: userOutsiderId } }).catch(() => {});
    }
    await app.close();
  });

  describe('Activity Triggers', () => {
    it('1. should record TASK_CREATED activity when creating a task', async () => {
      const taskRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({
          title: 'Implement Activity Tracking',
          description: 'Ensure audit trail records actions',
          statusId: statusTodoId,
          priority: 'HIGH',
        })
        .expect(201);

      taskId = taskRes.body.data.id;

      // Check task activities
      const actRes = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}/activities`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      expect(actRes.body.success).toBe(true);
      expect(actRes.body.data.length).toBeGreaterThanOrEqual(1);

      const createdAct = actRes.body.data.find(
        (a: any) => a.action === 'TASK_CREATED',
      );
      expect(createdAct).toBeDefined();
      expect(createdAct.actorId).toBe(userOwnerId);
      expect(createdAct.actor.email).toBe(userOwner.email);
      expect(createdAct.metadata.title).toBe('Implement Activity Tracking');
      expect(createdAct.metadata.taskKey).toBeDefined();
    });

    it('2. should record TASK_ASSIGNED and TASK_UNASSIGNED activities', async () => {
      // Fetch task to get current version
      const getTask = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      // Assign to Member
      const assignRes = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskId}/assignee`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({
          assigneeId: userMemberId,
          version: getTask.body.data.version,
        })
        .expect(200);

      // Verify TASK_ASSIGNED activity
      const actAfterAssign = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}/activities`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      const assignAct = actAfterAssign.body.data.find(
        (a: any) => a.action === 'TASK_ASSIGNED',
      );
      expect(assignAct).toBeDefined();
      expect(assignAct.metadata.newAssigneeId).toBe(userMemberId);
      expect(assignAct.metadata.assigneeName).toBe(userMember.name);

      // Unassign (remove assignee)
      await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${taskId}/assignee`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      const actAfterUnassign = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}/activities`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      const unassignAct = actAfterUnassign.body.data.find(
        (a: any) => a.action === 'TASK_UNASSIGNED',
      );
      expect(unassignAct).toBeDefined();
      expect(unassignAct.metadata.previousAssigneeId).toBe(userMemberId);
    });

    it('3. should record TASK_STATUS_CHANGED activity on status update', async () => {
      // Fetch current task
      const getTask = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      const currentVer = getTask.body.data.version;

      // Update status to IN_PROGRESS
      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskId}/status`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({
          statusId: statusInProgressId,
          version: currentVer,
        })
        .expect(200);

      const actRes = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}/activities`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      const statusAct = actRes.body.data.find(
        (a: any) => a.action === 'TASK_STATUS_CHANGED',
      );
      expect(statusAct).toBeDefined();
      expect(statusAct.metadata.previousStatusId).toBe(statusTodoId);
      expect(statusAct.metadata.newStatusId).toBe(statusInProgressId);
      expect(statusAct.metadata.newStatusName).toBeDefined();
    });

    it('4. should record COMMENT_ADDED activity when a comment is created', async () => {
      const commentRes = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Cookie', [`flowspace_session=${tokenMember}`])
        .send({ content: 'Starting work on this task today.' })
        .expect(201);

      const commentId = commentRes.body.data.id;

      const actRes = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}/activities`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      const commentAct = actRes.body.data.find(
        (a: any) => a.action === 'COMMENT_ADDED',
      );
      expect(commentAct).toBeDefined();
      expect(commentAct.actorId).toBe(userMemberId);
      expect(commentAct.entityId).toBe(commentId);
      expect(commentAct.metadata.preview).toBe('Starting work on this task today.');
    });
  });

  describe('Activity Endpoints & Pagination', () => {
    it('GET /api/v1/tasks/:taskId/activities should return paginated list', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}/activities?page=1&limit=2`)
        .set('Cookie', [`flowspace_session=${tokenMember}`])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(2);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(4);
      expect(res.body.meta.totalPages).toBeGreaterThanOrEqual(2);

      // Verify structure of activity object
      const item = res.body.data[0];
      expect(item.id).toBeDefined();
      expect(item.action).toBeDefined();
      expect(item.actor).toBeDefined();
      expect(item.actor.id).toBeDefined();
      expect(item.actor.name).toBeDefined();
      expect(item.actor.email).toBeDefined();
      expect(item.createdAt).toBeDefined();
    });

    it('GET /api/v1/projects/:projectId/activities should return project-wide activities', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/activities?page=1&limit=10`)
        .set('Cookie', [`flowspace_session=${tokenMember}`])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(4);

      // All returned activities should belong to this project
      for (const act of res.body.data) {
        expect(act.projectId).toBe(projectId);
      }
    });
  });

  describe('Authorization & Multi-Tenancy Enforcement', () => {
    it('should deny outsider (403) from accessing task activities', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}/activities`)
        .set('Cookie', [`flowspace_session=${tokenOutsider}`])
        .expect(403);
    });

    it('should deny outsider (403) from accessing project activities', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/activities`)
        .set('Cookie', [`flowspace_session=${tokenOutsider}`])
        .expect(403);
    });

    it('should deny unauthenticated request (401)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}/activities`)
        .expect(401);

      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/activities`)
        .expect(401);
    });

    it('should return 404 for non-existent task', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/v1/tasks/${fakeUuid}/activities`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(404);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${fakeUuid}/activities`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(404);
    });
  });
});
