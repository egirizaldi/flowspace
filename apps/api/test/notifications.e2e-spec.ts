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

describe('Notification Foundation API (FS-046 e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const uniqueId = Date.now();

  const userOwner = {
    name: 'Notif Owner',
    email: `notif-owner-${uniqueId}@flowspace.internal`,
    password: 'Password123!',
  };

  const userMember = {
    name: 'Notif Member',
    email: `notif-member-${uniqueId}@flowspace.internal`,
    password: 'Password123!',
  };

  const userOutsider = {
    name: 'Notif Outsider',
    email: `notif-outsider-${uniqueId}@flowspace.internal`,
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
  let statusId: string;
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

    // Create Org & Workspace
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({ name: `Notif Org ${uniqueId}` })
      .expect(201);
    orgId = orgRes.body.data.id;

    const wsRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspaces`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({ name: `Notif WS ${uniqueId}` })
      .expect(201);
    workspaceId = wsRes.body.data.id;

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

    // Create Project
    const projRes = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({ name: 'Notif Project', key: `NT${uniqueId.toString().slice(-4)}` })
      .expect(201);
    projectId = projRes.body.data.id;

    // Add Member to Project
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({ userId: userMemberId, role: 'MEMBER' })
      .expect(201);

    // Get default status
    const statusesRes = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/statuses`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .expect(200);
    statusId = statusesRes.body.data[0].id;
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

  describe('Automated Triggers', () => {
    it('1. should notify assignee when a task is created and assigned to them', async () => {
      const taskRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({
          title: 'Review Notification System',
          statusId,
          assigneeId: userMemberId,
          priority: 'HIGH',
        })
        .expect(201);

      taskId = taskRes.body.data.id;

      // Check member's notifications
      const notifRes = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', [`flowspace_session=${tokenMember}`])
        .expect(200);

      expect(notifRes.body.success).toBe(true);
      expect(notifRes.body.data.length).toBeGreaterThanOrEqual(1);

      const notif = notifRes.body.data.find(
        (n: any) => n.type === 'TASK_ASSIGNED' && n.resourceId === taskId,
      );
      expect(notif).toBeDefined();
      expect(notif.isRead).toBe(false);
      expect(notif.title).toContain('assigned');
      expect(notif.message).toContain('Review Notification System');
    });

    it('2. should notify task creator and assignee when a comment is posted', async () => {
      // Member adds comment to task
      await request(app.getHttpServer())
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Cookie', [`flowspace_session=${tokenMember}`])
        .send({ content: 'I have started reviewing the notification system.' })
        .expect(201);

      // Task creator (owner) should receive a notification
      const ownerNotifRes = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      expect(ownerNotifRes.body.success).toBe(true);
      const commentNotif = ownerNotifRes.body.data.find(
        (n: any) => n.type === 'COMMENT_ADDED' && n.resourceId === taskId,
      );
      expect(commentNotif).toBeDefined();
      expect(commentNotif.isRead).toBe(false);
      expect(commentNotif.title).toContain('New comment');
      expect(commentNotif.message).toContain('started reviewing');
    });
  });

  describe('Notification Management Endpoints', () => {
    let memberNotifId: string;

    it('GET /api/v1/notifications/unread-count should return unread notifications count', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Cookie', [`flowspace_session=${tokenMember}`])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.unreadCount).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/notifications with isRead filter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications?isRead=false')
        .set('Cookie', [`flowspace_session=${tokenMember}`])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      memberNotifId = res.body.data[0].id;
      for (const item of res.body.data) {
        expect(item.isRead).toBe(false);
      }
    });

    it('PATCH /api/v1/notifications/:id/read should mark notification as read', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/notifications/${memberNotifId}/read`)
        .set('Cookie', [`flowspace_session=${tokenMember}`])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(memberNotifId);
      expect(res.body.data.isRead).toBe(true);
      expect(res.body.data.readAt).toBeDefined();
    });

    it('PATCH /api/v1/notifications/read-all should mark all notifications as read', async () => {
      // Mark all as read for owner
      const res = await request(app.getHttpServer())
        .patch('/api/v1/notifications/read-all')
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.success).toBe(true);

      // Verify unread count is now 0
      const countRes = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      expect(countRes.body.data.unreadCount).toBe(0);
    });
  });

  describe('Security & Multi-Tenancy Isolation', () => {
    it('should deny outsider (403) from marking another user notification as read', async () => {
      // Create a notification for owner
      const notif = await prisma.notification.create({
        data: {
          userId: userOwnerId,
          type: 'SYSTEM',
          title: 'Private Owner Notice',
          message: 'Confidential message',
        },
      });

      // Outsider tries to mark owner's notification as read
      await request(app.getHttpServer())
        .patch(`/api/v1/notifications/${notif.id}/read`)
        .set('Cookie', [`flowspace_session=${tokenOutsider}`])
        .expect(403);
    });

    it('should isolate notifications so outsider sees empty list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', [`flowspace_session=${tokenOutsider}`])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .expect(401);

      await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .expect(401);

      await request(app.getHttpServer())
        .patch('/api/v1/notifications/read-all')
        .expect(401);
    });
  });
});
