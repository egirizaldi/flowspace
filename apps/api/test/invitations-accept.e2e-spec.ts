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
import { InvitationsService } from '../src/modules/invitations/invitations.service';
import { OrganizationRole, WorkspaceRole, InvitationStatus } from '@prisma/client';

describe('Accept Invitation API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let invitationsService: InvitationsService;

  const uniqueId = Date.now();

  const inviterUser = {
    name: 'Inviter User',
    email: `inviter-${uniqueId}@flowspace-inv-acc.internal`,
    password: 'Password123!',
  };

  const inviteeUser1 = {
    name: 'Invitee Org User',
    email: `invitee1-${uniqueId}@flowspace-inv-acc.internal`,
    password: 'Password123!',
  };

  const inviteeUser2 = {
    name: 'Invitee Workspace User',
    email: `invitee2-${uniqueId}@flowspace-inv-acc.internal`,
    password: 'Password123!',
  };

  let inviterToken: string;
  let invitee1Token: string;
  let invitee2Token: string;
  let inviterId: string;
  let invitee1Id: string;
  let invitee2Id: string;

  let orgId: string;
  let workspaceId: string;

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
    invitationsService =
      moduleFixture.get<InvitationsService>(InvitationsService);
    await app.init();

    // Helper to register and login user
    const setupUser = async (u: typeof inviterUser) => {
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
      const token = sessionCookie.split(';')[0].split('=')[1];
      const dbUser = await prisma.user.findUnique({ where: { email: u.email } });
      return { token, userId: dbUser!.id };
    };

    const resInviter = await setupUser(inviterUser);
    inviterToken = resInviter.token;
    inviterId = resInviter.userId;

    const resInvitee1 = await setupUser(inviteeUser1);
    invitee1Token = resInvitee1.token;
    invitee1Id = resInvitee1.userId;

    const resInvitee2 = await setupUser(inviteeUser2);
    invitee2Token = resInvitee2.token;
    invitee2Id = resInvitee2.userId;

    // Inviter creates Org
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', `flowspace_session=${inviterToken}`)
      .send({ name: `Org ${uniqueId}`, slug: `org-${uniqueId}` })
      .expect(201);
    orgId = orgRes.body.data.id;

    // Inviter creates Workspace
    const wsRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspaces`)
      .set('Cookie', `flowspace_session=${inviterToken}`)
      .send({ name: `Workspace ${uniqueId}`, slug: `ws-${uniqueId}` })
      .expect(201);
    workspaceId = wsRes.body.data.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.invitation.deleteMany({
        where: { email: { contains: '-inv-acc.internal' } },
      });
      await prisma.organization.deleteMany({
        where: { slug: { contains: `-${uniqueId}` } },
      });
      await prisma.user.deleteMany({
        where: { email: { contains: '-inv-acc.internal' } },
      });
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/v1/invitations/info', () => {
    it('should return preview info for valid token', async () => {
      const { rawToken } = await invitationsService.create(inviterId, {
        email: `preview-${uniqueId}@flowspace-inv-acc.internal`,
        role: OrganizationRole.MEMBER,
        organizationId: orgId,
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/invitations/info?token=${rawToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(
        `preview-${uniqueId}@flowspace-inv-acc.internal`,
      );
      expect(res.body.data.organization.id).toBe(orgId);
      expect(res.body.data.inviter.name).toBe(inviterUser.name);
      expect(res.body.data.status).toBe(InvitationStatus.PENDING);
    });

    it('should return 404 for non-existent token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/invitations/info?token=nonexistenttoken12345678901234567890')
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/invitations/accept', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/invitations/accept')
        .send({ token: 'sampletoken' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should successfully accept organization invitation and create OrganizationMember', async () => {
      const { rawToken } = await invitationsService.create(inviterId, {
        email: inviteeUser1.email,
        role: OrganizationRole.MEMBER,
        organizationId: orgId,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/invitations/accept')
        .set('Cookie', `flowspace_session=${invitee1Token}`)
        .send({ token: rawToken })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(InvitationStatus.ACCEPTED);

      // Verify OrganizationMember created in database
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: invitee1Id,
          },
        },
      });
      expect(membership).toBeDefined();
      expect(membership!.role).toBe(OrganizationRole.MEMBER);
    });

    it('should reject reuse of an already accepted token', async () => {
      const { rawToken } = await invitationsService.create(inviterId, {
        email: `reuse-${uniqueId}@flowspace-inv-acc.internal`,
        role: OrganizationRole.MEMBER,
        organizationId: orgId,
      });

      // Accept first time
      await request(app.getHttpServer())
        .post('/api/v1/invitations/accept')
        .set('Cookie', `flowspace_session=${invitee1Token}`)
        .send({ token: rawToken })
        .expect(200);

      // Attempt to accept second time
      const res = await request(app.getHttpServer())
        .post('/api/v1/invitations/accept')
        .set('Cookie', `flowspace_session=${invitee1Token}`)
        .send({ token: rawToken })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('no longer pending');
    });

    it('should reject expired invitation token', async () => {
      const { rawToken } = await invitationsService.create(
        inviterId,
        {
          email: `expired-${uniqueId}@flowspace-inv-acc.internal`,
          role: OrganizationRole.MEMBER,
          organizationId: orgId,
        },
        -1000, // Expired immediately
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/invitations/accept')
        .set('Cookie', `flowspace_session=${invitee1Token}`)
        .send({ token: rawToken })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('expired');
    });

    it('should successfully accept workspace invitation and create WorkspaceMember + parent OrganizationMember', async () => {
      const { rawToken } = await invitationsService.create(inviterId, {
        email: inviteeUser2.email,
        role: WorkspaceRole.ADMIN,
        workspaceId,
      });

      // Invitee 2 is not yet an Org member
      const priorOrgMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: invitee2Id,
          },
        },
      });
      expect(priorOrgMember).toBeNull();

      // Accept workspace invitation
      const res = await request(app.getHttpServer())
        .post('/api/v1/invitations/accept')
        .set('Cookie', `flowspace_session=${invitee2Token}`)
        .send({ token: rawToken })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(InvitationStatus.ACCEPTED);

      // Verify WorkspaceMember created
      const wsMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: invitee2Id,
          },
        },
      });
      expect(wsMember).toBeDefined();
      expect(wsMember!.role).toBe(WorkspaceRole.ADMIN);

      // Verify parent OrganizationMember auto-created
      const orgMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: invitee2Id,
          },
        },
      });
      expect(orgMember).toBeDefined();
      expect(orgMember!.role).toBe(OrganizationRole.MEMBER);
    });
  });
});
