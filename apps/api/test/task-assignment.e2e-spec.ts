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
import { ProjectRole } from '@prisma/client';

describe('Task Assignment & Activity Tracking API (FS-034 e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const uniqueId = Date.now();

  const userLead = {
    name: 'Assign Lead',
    email: `assign-lead-${uniqueId}@flowspace-assign.internal`,
    password: 'Password123!',
  };

  const userDev1 = {
    name: 'Assign Dev One',
    email: `assign-dev1-${uniqueId}@flowspace-assign.internal`,
    password: 'Password123!',
  };

  const userDev2 = {
    name: 'Assign Dev Two',
    email: `assign-dev2-${uniqueId}@flowspace-assign.internal`,
    password: 'Password123!',
  };

  const userViewer = {
    name: 'Assign Viewer',
    email: `assign-viewer-${uniqueId}@flowspace-assign.internal`,
    password: 'Password123!',
  };

  const userOutsider = {
    name: 'Assign Outsider',
    email: `assign-outsider-${uniqueId}@flowspace-assign.internal`,
    password: 'Password123!',
  };

  let tokenLead: string;
  let tokenViewer: string;
  let tokenOutsider: string;
  let userLeadId: string;
  let userDev1Id: string;
  let userDev2Id: string;
  let userOutsiderId: string;
  let orgId: string;
  let workspaceId: string;
  let projectId: string;
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
    userLeadId = lead.id;

    const dev1 = await setupUser(userDev1);
    userDev1Id = dev1.id;

    const dev2 = await setupUser(userDev2);
    userDev2Id = dev2.id;

    const viewer = await setupUser(userViewer);
    tokenViewer = viewer.token;

    const outsider = await setupUser(userOutsider);
    tokenOutsider = outsider.token;
    userOutsiderId = outsider.id;

    // Create organization & workspace with Lead
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', `flowspace_session=${tokenLead}`)
      .send({
        name: `Org Assign ${uniqueId}`,
        slug: `org-assign-${uniqueId}`,
      })
      .expect(201);
    orgId = orgRes.body.data.id;

    const wsRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspaces`)
      .set('Cookie', `flowspace_session=${tokenLead}`)
      .send({
        name: `WS Assign ${uniqueId}`,
        slug: `ws-assign-${uniqueId}`,
      })
      .expect(201);
    workspaceId = wsRes.body.data.id;

    // Create Project
    const projRes = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Cookie', `flowspace_session=${tokenLead}`)
      .send({
        name: 'Assignment Project',
        key: 'ASGN',
      })
      .expect(201);
    projectId = projRes.body.data.id;

    // Add Dev1 and Dev2 as MEMBERS of workspace and project
    for (const devId of [userDev1Id, userDev2Id]) {
      await prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId: devId,
          role: 'MEMBER',
        },
      });
      await prisma.projectMember.create({
        data: {
          projectId,
          userId: devId,
          role: ProjectRole.MEMBER,
        },
      });
    }

    // Add Viewer as VIEWER
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

    // Create unassigned task
    const taskRes = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Cookie', `flowspace_session=${tokenLead}`)
      .send({
        title: 'Task for assignment lifecycle tests',
      })
      .expect(201);
    taskId = taskRes.body.data.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.organization.deleteMany({
        where: { slug: { contains: `-assign-${uniqueId}` } },
      });
      await prisma.user.deleteMany({
        where: { email: { contains: '-assign.internal' } },
      });
      await prisma.$disconnect();
    }
    await app.close();
  });

  describe('Task Assignment Lifecycle & Audit Activity', () => {
    it('should assign a user to the task and record TASK_ASSIGNED in activity log', async () => {
      // 1. Assign Dev 1
      const assignRes = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskId}/assignee`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          assigneeId: userDev1Id,
          version: 1,
        })
        .expect(200);

      expect(assignRes.body.success).toBe(true);
      expect(assignRes.body.data.assignee.id).toBe(userDev1Id);
      expect(assignRes.body.data.version).toBe(2);

      // 2. Verify activity log
      const actRes = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}/activities`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .expect(200);

      expect(actRes.body.success).toBe(true);
      expect(actRes.body.data.length).toBeGreaterThanOrEqual(1);

      const assignAct = actRes.body.data[0];
      expect(assignAct.action).toBe('TASK_ASSIGNED');
      expect(assignAct.actor.id).toBe(userLeadId);
      expect(assignAct.metadata.previousAssigneeId).toBeNull();
      expect(assignAct.metadata.newAssigneeId).toBe(userDev1Id);
      expect(assignAct.metadata.assigneeName).toBe(userDev1.name);
    });

    it('should reassign the task to a different member and record transition in activities', async () => {
      // 1. Reassign Dev 1 -> Dev 2
      const reassignRes = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskId}/assignee`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          assigneeId: userDev2Id,
          version: 2,
        })
        .expect(200);

      expect(reassignRes.body.data.assignee.id).toBe(userDev2Id);
      expect(reassignRes.body.data.version).toBe(3);

      // 2. Verify new activity recorded
      const actRes = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}/activities`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .expect(200);

      const latestAct = actRes.body.data[0];
      expect(latestAct.action).toBe('TASK_ASSIGNED');
      expect(latestAct.metadata.previousAssigneeId).toBe(userDev1Id);
      expect(latestAct.metadata.newAssigneeId).toBe(userDev2Id);
      expect(latestAct.metadata.assigneeName).toBe(userDev2.name);
    });

    it('should remove the assignee via DELETE /tasks/:taskId/assignee and record TASK_UNASSIGNED', async () => {
      // 1. Remove assignee
      const removeRes = await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${taskId}/assignee`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .expect(200);

      expect(removeRes.body.success).toBe(true);
      expect(removeRes.body.data.assigneeId).toBeNull();

      // 2. Verify activity log
      const actRes = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}/activities`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .expect(200);

      const latestAct = actRes.body.data[0];
      expect(latestAct.action).toBe('TASK_UNASSIGNED');
      expect(latestAct.metadata.previousAssigneeId).toBe(userDev2Id);
      expect(latestAct.metadata.newAssigneeId).toBeNull();
    });

    it('should reject assigning an outsider who has no workspace membership (400)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskId}/assignee`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          assigneeId: userOutsiderId,
          version: 4,
        })
        .expect(400);

      expect(res.body.message).toContain('Assignee must be a member of this workspace');
    });

    it('should reject viewer attempting to change task assignee (403)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskId}/assignee`)
        .set('Cookie', `flowspace_session=${tokenViewer}`)
        .send({
          assigneeId: userDev1Id,
          version: 4,
        })
        .expect(403);
    });

    it('should reject viewer attempting to remove task assignee (403)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${taskId}/assignee`)
        .set('Cookie', `flowspace_session=${tokenViewer}`)
        .expect(403);
    });

    it('should forbid outsider from viewing task activities (403)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}/activities`)
        .set('Cookie', `flowspace_session=${tokenOutsider}`)
        .expect(403);
    });
  });
});
