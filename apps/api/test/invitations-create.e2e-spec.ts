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
import { OrganizationRole, WorkspaceRole } from '@prisma/client';

describe('Create Invitation API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const uniqueId = Date.now();

  const userA = {
    name: 'User A',
    email: `usera-${uniqueId}@flowspace-inv-api.internal`,
    password: 'Password123!',
  };

  const userB = {
    name: 'User B',
    email: `userb-${uniqueId}@flowspace-inv-api.internal`,
    password: 'Password123!',
  };

  const userC = {
    name: 'User C',
    email: `userc-${uniqueId}@flowspace-inv-api.internal`,
    password: 'Password123!',
  };

  let tokenA: string;
  let tokenB: string;
  let tokenC: string;
  let orgAId: string;
  let workspaceAId: string;

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

    // Helper to register and login user
    const setupUser = async (u: typeof userA) => {
      await request(app.getHttpServer())
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
      return sessionCookie.split(';')[0].split('=')[1];
    };

    tokenA = await setupUser(userA);
    tokenB = await setupUser(userB);
    tokenC = await setupUser(userC);

    // User A creates Org A
    const orgARes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', `flowspace_session=${tokenA}`)
      .send({ name: `Org A ${uniqueId}`, slug: `org-a-${uniqueId}` })
      .expect(201);
    orgAId = orgARes.body.data.id;

    // User A creates Workspace A
    const wsARes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgAId}/workspaces`)
      .set('Cookie', `flowspace_session=${tokenA}`)
      .send({ name: `Workspace A ${uniqueId}`, slug: `ws-a-${uniqueId}` })
      .expect(201);
    workspaceAId = wsARes.body.data.id;

    // Add User C to Org A and Workspace A as regular MEMBER
    const dbUserC = await prisma.user.findUnique({
      where: { email: userC.email },
    });
    await prisma.organizationMember.create({
      data: {
        organizationId: orgAId,
        userId: dbUserC!.id,
        role: OrganizationRole.MEMBER,
      },
    });
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspaceAId,
        userId: dbUserC!.id,
        role: WorkspaceRole.MEMBER,
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.invitation.deleteMany({
        where: { email: { contains: '-inv-api.internal' } },
      });
      await prisma.organization.deleteMany({
        where: { slug: { contains: `-${uniqueId}` } },
      });
      await prisma.user.deleteMany({
        where: { email: { contains: '-inv-api.internal' } },
      });
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/v1/organizations/:organizationId/invitations', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${orgAId}/invitations`)
        .send({ email: 'newdev@flowspace-inv-api.internal' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should reject invalid email format', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${orgAId}/invitations`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .send({ email: 'not-an-email' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject invitation if user has role MEMBER (insufficient permissions)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${orgAId}/invitations`)
        .set('Cookie', `flowspace_session=${tokenC}`)
        .send({ email: 'invitee@flowspace-inv-api.internal' })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('owners and admins');
    });

    it('should reject invitation if user is outside tenant', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${orgAId}/invitations`)
        .set('Cookie', `flowspace_session=${tokenB}`)
        .send({ email: 'invitee@flowspace-inv-api.internal' })
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should reject invitation if user is already a member of the organization', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${orgAId}/invitations`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .send({ email: userC.email })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already a member');
    });

    it('should allow organization owner to invite a new user', async () => {
      const inviteeEmail = `newdev1-${uniqueId}@flowspace-inv-api.internal`;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${orgAId}/invitations`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .send({ email: inviteeEmail, role: OrganizationRole.MEMBER })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.invitation.email).toBe(inviteeEmail);
      expect(res.body.data.invitation.organizationId).toBe(orgAId);
      expect(res.body.data.rawToken).toBeDefined();

      // Verify token in DB is hashed and does NOT match raw token
      const dbInv = await prisma.invitation.findUnique({
        where: { id: res.body.data.invitation.id },
      });
      expect(dbInv!.tokenHash).not.toBe(res.body.data.rawToken);
    });

    it('should reject duplicate active pending invitation for same email and scope', async () => {
      const inviteeEmail = `newdev1-${uniqueId}@flowspace-inv-api.internal`;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${orgAId}/invitations`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .send({ email: inviteeEmail })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('POST /api/v1/workspaces/:workspaceId/invitations', () => {
    it('should reject invitation if caller is regular workspace MEMBER', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${workspaceAId}/invitations`)
        .set('Cookie', `flowspace_session=${tokenC}`)
        .send({ email: 'ws-invitee@flowspace-inv-api.internal' })
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should allow workspace owner to invite a member to the workspace', async () => {
      const inviteeEmail = `ws-dev1-${uniqueId}@flowspace-inv-api.internal`;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${workspaceAId}/invitations`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .send({ email: inviteeEmail, role: WorkspaceRole.MEMBER })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.invitation.email).toBe(inviteeEmail);
      expect(res.body.data.invitation.workspaceId).toBe(workspaceAId);
      expect(res.body.data.rawToken).toBeDefined();
    });
  });
});
