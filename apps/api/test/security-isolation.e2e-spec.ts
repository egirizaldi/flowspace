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

describe('Security & Multi-Tenant Isolation Testing (FS-048 e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const uniqueId = Date.now();

  // Tenant Alpha Users
  const userAliceOwner = {
    name: 'Alice Org Owner',
    email: `sec-alice-${uniqueId}@alpha.test`,
    password: 'Password123!',
  };

  const userAliciaMember = {
    name: 'Alicia Org Member',
    email: `sec-alicia-${uniqueId}@alpha.test`,
    password: 'Password123!',
  };

  // Tenant Beta Users
  const userBobOwner = {
    name: 'Bob Beta Owner',
    email: `sec-bob-${uniqueId}@beta.test`,
    password: 'Password123!',
  };

  const userVictorViewer = {
    name: 'Victor Beta Viewer',
    email: `sec-victor-${uniqueId}@beta.test`,
    password: 'Password123!',
  };

  let tokenAlice: string;
  let tokenAlicia: string;
  let tokenBob: string;
  let tokenVictor: string;

  let aliceId: string;
  let aliciaId: string;
  let bobId: string;
  let victorId: string;

  // Org Alpha Entities
  let orgAlphaId: string;
  let wsAlphaId: string;
  let wsAlphaIsolatedId: string;
  let projAlphaId: string;
  let taskAlphaId: string;
  let commentAlphaId: string;
  let notifAliceId: string;
  let statusAlphaTodoId: string;

  // Org Beta Entities
  let orgBetaId: string;
  let wsBetaId: string;
  let projBetaId: string;
  let taskBetaId: string;
  let statusBetaTodoId: string;

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

    const setupUser = async (u: typeof userAliceOwner) => {
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

    const aliceRes = await setupUser(userAliceOwner);
    aliceId = aliceRes.id;
    tokenAlice = aliceRes.token;

    const aliciaRes = await setupUser(userAliciaMember);
    aliciaId = aliciaRes.id;
    tokenAlicia = aliciaRes.token;

    const bobRes = await setupUser(userBobOwner);
    bobId = bobRes.id;
    tokenBob = bobRes.token;

    const victorRes = await setupUser(userVictorViewer);
    victorId = victorRes.id;
    tokenVictor = victorRes.token;

    // --- Setup Org Alpha ---
    const orgAlphaRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', [`flowspace_session=${tokenAlice}`])
      .send({ name: `Tenant Alpha ${uniqueId}` })
      .expect(201);
    orgAlphaId = orgAlphaRes.body.data.id;

    // Add Alicia to Org Alpha as MEMBER
    await prisma.organizationMember.create({
      data: {
        organizationId: orgAlphaId,
        userId: aliciaId,
        role: 'MEMBER',
      },
    });

    // Workspace Alpha
    const wsAlphaRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgAlphaId}/workspaces`)
      .set('Cookie', [`flowspace_session=${tokenAlice}`])
      .send({ name: 'Alpha Main WS' })
      .expect(201);
    wsAlphaId = wsAlphaRes.body.data.id;

    // Add Alicia to Workspace Alpha as MEMBER
    await prisma.workspaceMember.create({
      data: {
        workspaceId: wsAlphaId,
        userId: aliciaId,
        role: 'MEMBER',
      },
    });

    // Isolated Workspace Alpha 2 (Alice only, Alicia NOT a member)
    const wsIsoRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgAlphaId}/workspaces`)
      .set('Cookie', [`flowspace_session=${tokenAlice}`])
      .send({ name: 'Alpha Secret WS' })
      .expect(201);
    wsAlphaIsolatedId = wsIsoRes.body.data.id;

    // Project Alpha
    const projAlphaRes = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${wsAlphaId}/projects`)
      .set('Cookie', [`flowspace_session=${tokenAlice}`])
      .send({ name: 'Project Alpha', key: `PA${uniqueId.toString().slice(-4)}` })
      .expect(201);
    projAlphaId = projAlphaRes.body.data.id;

    // Add Alicia to Project Alpha as MEMBER
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projAlphaId}/members`)
      .set('Cookie', [`flowspace_session=${tokenAlice}`])
      .send({ userId: aliciaId, role: 'MEMBER' })
      .expect(201);

    const statusesAlphaRes = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projAlphaId}/statuses`)
      .set('Cookie', [`flowspace_session=${tokenAlice}`])
      .expect(200);
    statusAlphaTodoId = statusesAlphaRes.body.data[0].id;

    // Task Alpha
    const taskAlphaRes = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projAlphaId}/tasks`)
      .set('Cookie', [`flowspace_session=${tokenAlice}`])
      .send({
        title: 'Confidential Alpha Task',
        statusId: statusAlphaTodoId,
        priority: 'MEDIUM',
      })
      .expect(201);
    taskAlphaId = taskAlphaRes.body.data.id;

    // Alice comment in Task Alpha
    const commentRes = await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskAlphaId}/comments`)
      .set('Cookie', [`flowspace_session=${tokenAlice}`])
      .send({ content: 'Secret owner remarks for Alpha' })
      .expect(201);
    commentAlphaId = commentRes.body.data.id;

    // Alice Notification in Alpha
    const notif = await prisma.notification.create({
      data: {
        userId: aliceId,
        type: 'SYSTEM',
        title: 'Private Security Notice',
        message: 'Top secret update for Alice',
      },
    });
    notifAliceId = notif.id;

    // --- Setup Org Beta ---
    const orgBetaRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', [`flowspace_session=${tokenBob}`])
      .send({ name: `Tenant Beta ${uniqueId}` })
      .expect(201);
    orgBetaId = orgBetaRes.body.data.id;

    // Add Victor to Org Beta and WS Beta
    await prisma.organizationMember.create({
      data: {
        organizationId: orgBetaId,
        userId: victorId,
        role: 'MEMBER',
      },
    });

    const wsBetaRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgBetaId}/workspaces`)
      .set('Cookie', [`flowspace_session=${tokenBob}`])
      .send({ name: 'Beta Main WS' })
      .expect(201);
    wsBetaId = wsBetaRes.body.data.id;

    await prisma.workspaceMember.create({
      data: {
        workspaceId: wsBetaId,
        userId: victorId,
        role: 'MEMBER',
      },
    });

    // Project Beta
    const projBetaRes = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${wsBetaId}/projects`)
      .set('Cookie', [`flowspace_session=${tokenBob}`])
      .send({ name: 'Project Beta', key: `PB${uniqueId.toString().slice(-4)}` })
      .expect(201);
    projBetaId = projBetaRes.body.data.id;

    // Add Victor as VIEWER to Project Beta
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projBetaId}/members`)
      .set('Cookie', [`flowspace_session=${tokenBob}`])
      .send({ userId: victorId, role: 'VIEWER' })
      .expect(201);

    const statusesBetaRes = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projBetaId}/statuses`)
      .set('Cookie', [`flowspace_session=${tokenBob}`])
      .expect(200);
    statusBetaTodoId = statusesBetaRes.body.data[0].id;

    // Task Beta
    const taskBetaRes = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projBetaId}/tasks`)
      .set('Cookie', [`flowspace_session=${tokenBob}`])
      .send({
        title: 'Beta Proprietary Feature',
        statusId: statusBetaTodoId,
        priority: 'HIGH',
      })
      .expect(201);
    taskBetaId = taskBetaRes.body.data.id;
  });

  afterAll(async () => {
    if (orgAlphaId) {
      await prisma.organization.delete({ where: { id: orgAlphaId } }).catch(() => {});
    }
    if (orgBetaId) {
      await prisma.organization.delete({ where: { id: orgBetaId } }).catch(() => {});
    }
    if (aliceId) {
      await prisma.user.delete({ where: { id: aliceId } }).catch(() => {});
    }
    if (aliciaId) {
      await prisma.user.delete({ where: { id: aliciaId } }).catch(() => {});
    }
    if (bobId) {
      await prisma.user.delete({ where: { id: bobId } }).catch(() => {});
    }
    if (victorId) {
      await prisma.user.delete({ where: { id: victorId } }).catch(() => {});
    }
    await app.close();
  });

  // =========================================================================
  // 1. Unauthenticated Requests (401)
  // =========================================================================
  describe('1. Unauthenticated Access Prevention', () => {
    it('should deny requests without session cookies (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);

      await request(app.getHttpServer())
        .get('/api/v1/organizations')
        .expect(401);

      await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskAlphaId}`)
        .expect(401);

      await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .expect(401);

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projAlphaId}/tasks`)
        .send({ title: 'Hacker Task' })
        .expect(401);
    });
  });

  // =========================================================================
  // 2. Cross-Organization Boundaries (Tenant Isolation)
  // =========================================================================
  describe('2. Cross-Organization Boundary Enforcement', () => {
    it('should prevent Bob (Beta) from viewing or managing Org Alpha (403/404)', async () => {
      // Bob tries to get Org Alpha details
      await request(app.getHttpServer())
        .get(`/api/v1/organizations/${orgAlphaId}`)
        .set('Cookie', [`flowspace_session=${tokenBob}`])
        .expect(403);

      // Bob tries to create a workspace in Org Alpha
      await request(app.getHttpServer())
        .post(`/api/v1/organizations/${orgAlphaId}/workspaces`)
        .set('Cookie', [`flowspace_session=${tokenBob}`])
        .send({ name: 'Intruder Workspace' })
        .expect(403);

      // Bob tries to list workspaces of Org Alpha
      await request(app.getHttpServer())
        .get(`/api/v1/organizations/${orgAlphaId}/workspaces`)
        .set('Cookie', [`flowspace_session=${tokenBob}`])
        .expect(403);

      // Bob tries to invite users to Org Alpha
      await request(app.getHttpServer())
        .post(`/api/v1/organizations/${orgAlphaId}/invitations`)
        .set('Cookie', [`flowspace_session=${tokenBob}`])
        .send({ email: 'intruder@test.com', role: 'MEMBER' })
        .expect(403);
    });
  });

  // =========================================================================
  // 3. Cross-Workspace Boundaries (Workspace Isolation)
  // =========================================================================
  describe('3. Cross-Workspace Boundary Enforcement', () => {
    it('should prevent Alicia from accessing isolated workspace where she is not a member (403)', async () => {
      // Alicia tries to list projects in secret workspace
      await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${wsAlphaIsolatedId}/projects`)
        .set('Cookie', [`flowspace_session=${tokenAlicia}`])
        .expect(403);

      // Alicia tries to create a project in secret workspace
      await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${wsAlphaIsolatedId}/projects`)
        .set('Cookie', [`flowspace_session=${tokenAlicia}`])
        .send({ name: 'Alicia Intrusion', key: 'ALI' })
        .expect(403);
    });
  });

  // =========================================================================
  // 4. Cross-Project Boundaries (Project Isolation)
  // =========================================================================
  describe('4. Cross-Project Boundary Enforcement', () => {
    it('should prevent Alice (Alpha) from accessing Project Beta resources (403)', async () => {
      // Query Project Beta Kanban Board
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projBetaId}/board`)
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .expect(403);

      // Create Task in Project Beta
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projBetaId}/tasks`)
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .send({ title: 'Spy Task', statusId: statusBetaTodoId })
        .expect(403);

      // Access Project Beta activities log
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projBetaId}/activities`)
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .expect(403);
    });
  });

  // =========================================================================
  // 5. IDOR (Insecure Direct Object Reference) Protection
  // =========================================================================
  describe('5. IDOR Protection on Tasks, Comments, and Notifications', () => {
    it('should prevent Alice from reading, modifying, or deleting Task Beta directly by UUID (403)', async () => {
      // Read Task Beta
      await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskBetaId}`)
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .expect(403);

      // Update Task Beta
      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskBetaId}`)
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .send({ title: 'Tampered Title', version: 1 })
        .expect(403);

      // Delete Task Beta
      await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${taskBetaId}`)
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .expect(403);
    });

    it('should prevent Member from modifying or deleting another user comment (403)', async () => {
      // Alicia (MEMBER) attempts to update Alice's comment
      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskAlphaId}/comments/${commentAlphaId}`)
        .set('Cookie', [`flowspace_session=${tokenAlicia}`])
        .send({ content: 'Alicia forged comment' })
        .expect(403);

      // Alicia (MEMBER) attempts to delete Alice's comment
      await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${taskAlphaId}/comments/${commentAlphaId}`)
        .set('Cookie', [`flowspace_session=${tokenAlicia}`])
        .expect(403);
    });

    it('should prevent Bob from accessing or marking Alice notification as read (403)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/notifications/${notifAliceId}/read`)
        .set('Cookie', [`flowspace_session=${tokenBob}`])
        .expect(403);

      // Bob's list should never contain Alice's notification
      const notifRes = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', [`flowspace_session=${tokenBob}`])
        .expect(200);

      const found = notifRes.body.data.some((n: any) => n.id === notifAliceId);
      expect(found).toBe(false);
    });
  });

  // =========================================================================
  // 6. Role Escalation & Permission Boundaries
  // =========================================================================
  describe('6. Role Escalation and Permission Enforcement', () => {
    it('should prevent standard MEMBER from inviting users to Organization (403)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/organizations/${orgAlphaId}/invitations`)
        .set('Cookie', [`flowspace_session=${tokenAlicia}`])
        .send({ email: 'newmember@test.com', role: 'MEMBER' })
        .expect(403);
    });

    it('should prevent Project VIEWER from creating, modifying, or moving tasks (403)', async () => {
      // Victor (VIEWER) tries to create task
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projBetaId}/tasks`)
        .set('Cookie', [`flowspace_session=${tokenVictor}`])
        .send({ title: 'Viewer Attempt', statusId: statusBetaTodoId })
        .expect(403);

      // Victor tries to update task status
      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskBetaId}/status`)
        .set('Cookie', [`flowspace_session=${tokenVictor}`])
        .send({ statusId: statusBetaTodoId, version: 1 })
        .expect(403);

      // Victor tries to assign task
      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskBetaId}/assignee`)
        .set('Cookie', [`flowspace_session=${tokenVictor}`])
        .send({ assigneeId: victorId, version: 1 })
        .expect(403);

      // Victor tries to delete task
      await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${taskBetaId}`)
        .set('Cookie', [`flowspace_session=${tokenVictor}`])
        .expect(403);

      // But Victor CAN view tasks as a VIEWER
      await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskBetaId}`)
        .set('Cookie', [`flowspace_session=${tokenVictor}`])
        .expect(200);
    });
  });

  // =========================================================================
  // 7. Invitation Token Integrity & Expiry
  // =========================================================================
  describe('7. Invitation Token Tampering and Reuse Rejection', () => {
    it('should reject forged or non-existent invitation token with 404', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/invitations/info?token=completely-forged-token-1234567890')
        .expect(404);

      await request(app.getHttpServer())
        .post('/api/v1/invitations/accept')
        .set('Cookie', [`flowspace_session=${tokenVictor}`])
        .send({ token: 'completely-forged-token-1234567890' })
        .expect(404);
    });

    it('should reject already accepted invitation token (400)', async () => {
      // Create a new invitation in Beta
      const inviteRes = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${orgBetaId}/invitations`)
        .set('Cookie', [`flowspace_session=${tokenBob}`])
        .send({ email: `one-time-${uniqueId}@beta.test`, role: 'MEMBER' })
        .expect(201);

      const rawToken = inviteRes.body.data.rawToken;

      // Register and login new user to accept it
      const tempUser = {
        name: 'Temp User',
        email: `one-time-${uniqueId}@beta.test`,
        password: 'Password123!',
      };
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(tempUser)
        .expect(201);

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: tempUser.email, password: tempUser.password })
        .expect(200);

      const tokenTemp = loginRes.headers['set-cookie'][0].split(';')[0].split('=')[1];

      // First acceptance succeeds
      await request(app.getHttpServer())
        .post('/api/v1/invitations/accept')
        .set('Cookie', [`flowspace_session=${tokenTemp}`])
        .send({ token: rawToken })
        .expect(200);

      // Second acceptance with the same token MUST fail with 400
      const secondRes = await request(app.getHttpServer())
        .post('/api/v1/invitations/accept')
        .set('Cookie', [`flowspace_session=${tokenTemp}`])
        .send({ token: rawToken })
        .expect(400);

      expect(secondRes.body.message).toContain('ACCEPTED');
    });
  });

  // =========================================================================
  // 8. Session Revocation & Invalidation
  // =========================================================================
  describe('8. Session Invalidation on Logout', () => {
    it('should revoke session on logout and deny replayed token (401)', async () => {
      // Alice logs out
      const logoutRes = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .expect(200);

      expect(logoutRes.body.success).toBe(true);

      // Attempting to access protected resource with revoked token must fail with 401
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .expect(401);

      await request(app.getHttpServer())
        .get('/api/v1/organizations')
        .set('Cookie', [`flowspace_session=${tokenAlice}`])
        .expect(401);
    });
  });
});
