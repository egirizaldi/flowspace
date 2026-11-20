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

describe('Full End-to-End User Journey (FS-047 Integration Test)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const uniqueId = Date.now();

  const alice = {
    name: 'Alice Admin',
    email: `alice-${uniqueId}@flowspace.internal`,
    password: 'Password123!',
  };

  const bob = {
    name: 'Bob Developer',
    email: `bob-${uniqueId}@flowspace.internal`,
    password: 'Password123!',
  };

  let tokenAlice: string;
  let tokenBob: string;
  let aliceId: string;
  let bobId: string;

  let orgId: string;
  let workspaceId: string;
  let projectId: string;
  let labelId: string;
  let statusTodoId: string;
  let statusInProgressId: string;
  let statusDoneId: string;
  let taskId: string;
  let taskKey: string;
  let currentTaskVersion = 1;

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
  });

  afterAll(async () => {
    if (orgId) {
      await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
    }
    if (aliceId) {
      await prisma.user.delete({ where: { id: aliceId } }).catch(() => {});
    }
    if (bobId) {
      await prisma.user.delete({ where: { id: bobId } }).catch(() => {});
    }
    await app.close();
  });

  // =========================================================================
  // Step 1: Authentication & User Registration
  // =========================================================================
  describe('Step 1: Registration and Authentication', () => {
    it('should register Alice as an organization owner', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(alice)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(alice.email.toLowerCase());
      aliceId = res.body.data.id;
    });

    it('should log in Alice and establish a secure session', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: alice.email, password: alice.password })
        .expect(200);

      const cookies = res.headers['set-cookie'];
      const sessionCookie = cookies.find((c: string) =>
        c.startsWith('flowspace_session='),
      );
      expect(sessionCookie).toBeDefined();
      tokenAlice = sessionCookie.split(';')[0].split('=')[1];

      // Verify session via /auth/me
      const meRes = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .expect(200);

      expect(meRes.body.data.id).toBe(aliceId);
      expect(meRes.body.data.email).toBe(alice.email.toLowerCase());
    });
  });

  // =========================================================================
  // Step 2: Multi-Tenant Hierarchy Setup (Org -> Workspace -> Project)
  // =========================================================================
  describe('Step 2: Multi-Tenant Organization, Workspace, and Project Hierarchy', () => {
    it('should create an Organization with slug generation', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/organizations')
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .send({ name: `Acme Corp ${uniqueId}` })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(`Acme Corp ${uniqueId}`);
      expect(res.body.data.slug).toBeDefined();
      orgId = res.body.data.id;
    });

    it('should create a Workspace within the Organization', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${orgId}/workspaces`)
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .send({ name: 'Product Engineering' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Product Engineering');
      workspaceId = res.body.data.id;
    });

    it('should create a Project within the Workspace', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${workspaceId}/projects`)
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .send({
          name: 'Core Platform',
          key: `CP${uniqueId.toString().slice(-4)}`,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Core Platform');
      projectId = res.body.data.id;
    });

    it('should automatically provision default project statuses and create a custom label', async () => {
      const statusRes = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/statuses`)
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .expect(200);

      const statuses = statusRes.body.data;
      expect(statuses.length).toBeGreaterThanOrEqual(3);

      statusTodoId = statuses.find((s: any) => s.category === 'TODO')?.id || statuses[0].id;
      statusInProgressId = statuses.find((s: any) => s.category === 'IN_PROGRESS')?.id || statuses[1].id;
      statusDoneId = statuses.find((s: any) => s.category === 'DONE')?.id || statuses[statuses.length - 1].id;

      // Create a custom label
      const labelRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/labels`)
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .send({ name: 'Backend', color: '#10b981' })
        .expect(201);

      expect(labelRes.body.data.name).toBe('Backend');
      labelId = labelRes.body.data.id;
    });
  });

  // =========================================================================
  // Step 3: Member Invitation & Acceptance Workflow
  // =========================================================================
  describe('Step 3: Member Invitation and Acceptance Lifecycle', () => {
    let invitationRawToken: string;

    it('should invite Bob to the organization as MEMBER', async () => {
      const inviteRes = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${orgId}/invitations`)
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .send({
          email: bob.email,
          role: 'MEMBER',
        })
        .expect(201);

      expect(inviteRes.body.success).toBe(true);
      invitationRawToken = inviteRes.body.data.rawToken;
      expect(invitationRawToken).toBeDefined();
    });

    it('should allow public inspection of the invitation info via token', async () => {
      const infoRes = await request(app.getHttpServer())
        .get(`/api/v1/invitations/info?token=${invitationRawToken}`)
        .expect(200);

      expect(infoRes.body.success).toBe(true);
      expect(infoRes.body.data.email).toBe(bob.email.toLowerCase());
      expect(infoRes.body.data.organization.id).toBe(orgId);
    });

    it('should register Bob and accept the invitation', async () => {
      // Register Bob
      const regRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(bob)
        .expect(201);
      bobId = regRes.body.data.id;

      // Log in Bob
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: bob.email, password: bob.password })
        .expect(200);

      const cookies = loginRes.headers['set-cookie'];
      const sessionCookie = cookies.find((c: string) =>
        c.startsWith('flowspace_session='),
      );
      tokenBob = sessionCookie.split(';')[0].split('=')[1];

      // Bob accepts the invitation
      const acceptRes = await request(app.getHttpServer())
        .post('/api/v1/invitations/accept')
        .set('Cookie', [`flowspace_session=${tokenBob}`])
        .send({ token: invitationRawToken })
        .expect(200);

      expect(acceptRes.body.success).toBe(true);
      expect(acceptRes.body.message).toContain('accepted successfully');

      // Add Bob to Workspace and Project
      await prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId: bobId,
          role: 'MEMBER',
        },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .send({ userId: bobId, role: 'MEMBER' })
        .expect(201);
    });
  });

  // =========================================================================
  // Step 4: Task Creation, Labeling, and Assignment
  // =========================================================================
  describe('Step 4: Task Creation, Labeling, and Assignment', () => {
    it('should allow Alice to create a Task with priority and initial status', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .send({
          title: 'Implement Session Revocation Protocol',
          description: 'Ensure all active sessions are revoked on password change',
          statusId: statusTodoId,
          priority: 'HIGH',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      taskId = res.body.data.id;
      taskKey = res.body.data.taskKey;
      currentTaskVersion = res.body.data.version;

      expect(taskKey).toMatch(/^CP\d+-\d+$/);
      expect(res.body.data.priority).toBe('HIGH');
    });

    it('should attach the Backend label to the Task', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${taskId}/labels`)
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .send({ labelId })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.labels).toBeDefined();
      expect(
        res.body.data.labels.some(
          (l: any) => l.labelId === labelId || l.label?.id === labelId,
        ),
      ).toBe(true);
    });

    it('should assign the Task to Bob and update task version', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskId}/assignee`)
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .send({
          assigneeId: bobId,
          version: currentTaskVersion,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.assigneeId).toBe(bobId);
      currentTaskVersion = res.body.data.version;
      expect(currentTaskVersion).toBe(2);
    });
  });

  // =========================================================================
  // Step 5: Notification Delivery & Management for Assignee
  // =========================================================================
  describe('Step 5: Notification Delivery and Read Management', () => {
    let bobNotifId: string;

    it('should deliver a TASK_ASSIGNED notification to Bob', async () => {
      // Bob checks unread count
      const countRes = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Cookie', [`flowspace_session=${tokenBob}`])
        .expect(200);

      expect(countRes.body.data.unreadCount).toBeGreaterThanOrEqual(1);

      // Bob fetches notifications
      const notifRes = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', [`flowspace_session=${tokenBob}`])
        .expect(200);

      expect(notifRes.body.data.length).toBeGreaterThanOrEqual(1);
      const assignmentNotif = notifRes.body.data.find(
        (n: any) => n.type === 'TASK_ASSIGNED' && n.resourceId === taskId,
      );
      expect(assignmentNotif).toBeDefined();
      expect(assignmentNotif.isRead).toBe(false);
      expect(assignmentNotif.message).toContain(taskKey);

      bobNotifId = assignmentNotif.id;
    });

    it('should allow Bob to mark the notification as read', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/notifications/${bobNotifId}/read`)
        .set('Cookie', [`flowspace_session=${tokenBob}`])
        .expect(200);

      expect(res.body.data.isRead).toBe(true);
      expect(res.body.data.readAt).toBeDefined();

      const countRes = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Cookie', [`flowspace_session=${tokenBob}`])
        .expect(200);

      expect(countRes.body.data.unreadCount).toBe(0);
    });
  });

  // =========================================================================
  // Step 6: Kanban Workflow Transition & Board Filtering
  // =========================================================================
  describe('Step 6: Kanban Status Transition and Board Filtering', () => {
    it('should allow Bob to move Task to IN_PROGRESS status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskId}/status`)
        .set('Cookie', [`flowspace_session=${tokenBob}`])
        .send({
          statusId: statusInProgressId,
          version: currentTaskVersion,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.statusId).toBe(statusInProgressId);
      currentTaskVersion = res.body.data.version;
      expect(currentTaskVersion).toBe(3);
    });

    it('should reflect task position and filters on the Kanban Board', async () => {
      const boardRes = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/board?assigneeId=${bobId}&priority=HIGH`)
        .set('Cookie', [`flowspace_session=${tokenBob}`])
        .expect(200);

      expect(boardRes.body.success).toBe(true);
      const inProgressCol = boardRes.body.data.columns.find(
        (col: any) => col.id === statusInProgressId,
      );
      expect(inProgressCol).toBeDefined();
      expect(inProgressCol.tasks.length).toBe(1);

      const task = inProgressCol.tasks[0];
      expect(task.id).toBe(taskId);
      expect(task.title).toBe('Implement Session Revocation Protocol');
      expect(task.assignee.id).toBe(bobId);
      expect(task.labels.length).toBe(1);
      expect(task.labels[0].name).toBe('Backend');
    });
  });

  // =========================================================================
  // Step 7: Comment Collaboration & Cross-Notification
  // =========================================================================
  describe('Step 7: Comment Collaboration and Reciprocal Notification', () => {
    it('should allow Bob to post a comment on the Task', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Cookie', [`flowspace_session=${tokenBob}`])
        .send({
          content: 'PR #42 is up: added Argon2id verification with 100% test coverage.',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(bobId);
      expect(res.body.data.content).toContain('PR #42');
    });

    it('should notify Alice (creator) about the new comment from Bob', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .expect(200);

      expect(res.body.success).toBe(true);
      const commentNotif = res.body.data.find(
        (n: any) => n.type === 'COMMENT_ADDED' && n.resourceId === taskId,
      );
      expect(commentNotif).toBeDefined();
      expect(commentNotif.isRead).toBe(false);
      expect(commentNotif.message).toContain('PR #42');
    });

    it('should allow Alice to view comments list and mark all notifications read', async () => {
      const commentsRes = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}/comments`)
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .expect(200);

      expect(commentsRes.body.data.length).toBe(1);
      expect(commentsRes.body.data[0].user.name).toBe(bob.name);

      await request(app.getHttpServer())
        .patch('/api/v1/notifications/read-all')
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .expect(200);

      const countRes = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .expect(200);

      expect(countRes.body.data.unreadCount).toBe(0);
    });
  });

  // =========================================================================
  // Step 8: Task Completion & Audit Trail Verification
  // =========================================================================
  describe('Step 8: Task Completion and Complete Audit Trail', () => {
    it('should allow Bob to move Task to DONE and set completedAt timestamp', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskId}/status`)
        .set('Cookie', [`flowspace_session=${tokenBob}`])
        .send({
          statusId: statusDoneId,
          version: currentTaskVersion,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.statusId).toBe(statusDoneId);
      expect(res.body.data.completedAt).toBeDefined();
      expect(res.body.data.completedAt).not.toBeNull();
    });

    it('should verify comprehensive Task Activity Timeline', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}/activities`)
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .expect(200);

      expect(res.body.success).toBe(true);
      const actions = res.body.data.map((a: any) => a.action);

      // Verify every lifecycle action was audited
      expect(actions).toContain('TASK_CREATED');
      expect(actions).toContain('TASK_ASSIGNED');
      expect(actions).toContain('TASK_STATUS_CHANGED');
      expect(actions).toContain('COMMENT_ADDED');

      // Check actor data is populated
      for (const act of res.body.data) {
        expect(act.actor).toBeDefined();
        expect(act.actor.name).toBeDefined();
        expect(act.actor.email).toBeDefined();
      }
    });

    it('should verify Project-Wide Audit Log integrity', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/activities`)
        .set('Cookie', [`flowspace_session=${tokenBob}`])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);
      for (const act of res.body.data) {
        expect(act.projectId).toBe(projectId);
      }
    });
  });
});
