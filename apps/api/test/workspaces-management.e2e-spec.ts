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

describe('Workspace Management API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const uniqueId = Date.now();

  const userA = {
    name: 'User A',
    email: `usera-${uniqueId}@flowspace-ws-mgmt.internal`,
    password: 'Password123!',
  };

  const userB = {
    name: 'User B',
    email: `userb-${uniqueId}@flowspace-ws-mgmt.internal`,
    password: 'Password123!',
  };

  const userC = {
    name: 'User C',
    email: `userc-${uniqueId}@flowspace-ws-mgmt.internal`,
    password: 'Password123!',
  };

  let tokenA: string;
  let tokenB: string;
  let tokenC: string;
  let dbUserCId: string;
  let orgAId: string;
  let orgBId: string;
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

    const dbUserC = await prisma.user.findUnique({
      where: { email: userC.email },
    });
    dbUserCId = dbUserC!.id;

    // User A creates Org A
    const orgARes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', `flowspace_session=${tokenA}`)
      .send({ name: `Org A ${uniqueId}`, slug: `org-a-${uniqueId}` })
      .expect(201);
    orgAId = orgARes.body.data.id;

    // User B creates Org B
    const orgBRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', `flowspace_session=${tokenB}`)
      .send({ name: `Org B ${uniqueId}`, slug: `org-b-${uniqueId}` })
      .expect(201);
    orgBId = orgBRes.body.data.id;

    // Add User C to Org A as regular MEMBER
    await prisma.organizationMember.create({
      data: {
        organizationId: orgAId,
        userId: dbUserCId,
        role: OrganizationRole.MEMBER,
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.organization.deleteMany({
        where: { slug: { contains: `-${uniqueId}` } },
      });
      await prisma.user.deleteMany({
        where: { email: { contains: '-ws-mgmt.internal' } },
      });
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/v1/organizations/:organizationId/workspaces', () => {
    it('should reject workspace creation if user does not belong to organization (multi-tenant boundary)', async () => {
      // User B attempts to create workspace in Org A
      const res = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${orgAId}/workspaces`)
        .set('Cookie', `flowspace_session=${tokenB}`)
        .send({ name: 'Malicious Workspace', slug: 'malicious' })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('do not have access to this organization');
    });

    it('should allow organization member to create workspace and assign creator as OWNER', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${orgAId}/workspaces`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .send({
          name: 'Engineering Workspace',
          slug: 'engineering',
          description: 'Main dev workspace',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Engineering Workspace');
      expect(res.body.data.slug).toBe('engineering');
      expect(res.body.data.organizationId).toBe(orgAId);
      expect(res.body.data.members).toHaveLength(1);
      expect(res.body.data.members[0].role).toBe(WorkspaceRole.OWNER);

      workspaceAId = res.body.data.id;
    });

    it('should reject workspace creation if slug is duplicated in the same organization', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${orgAId}/workspaces`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .send({
          name: 'Another Engineering Workspace',
          slug: 'engineering',
        })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists in this organization');
    });

    it('should allow same slug to be used in a different organization', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${orgBId}/workspaces`)
        .set('Cookie', `flowspace_session=${tokenB}`)
        .send({
          name: 'Engineering Workspace in Org B',
          slug: 'engineering',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.organizationId).toBe(orgBId);
      expect(res.body.data.slug).toBe('engineering');
    });
  });

  describe('GET /api/v1/organizations/:organizationId/workspaces', () => {
    it('should reject list if user is not a member of the organization', async () => {
      // User B attempts to list workspaces in Org A
      const res = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${orgAId}/workspaces`)
        .set('Cookie', `flowspace_session=${tokenB}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('do not have access to this organization');
    });

    it('should list workspaces for organization member', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${orgAId}/workspaces`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const ws = res.body.data.find((w: any) => w.id === workspaceAId);
      expect(ws).toBeDefined();
      expect(ws.userRole).toBe(WorkspaceRole.OWNER);
      expect(ws._count).toHaveProperty('members');
      expect(ws._count).toHaveProperty('projects');
    });

    it('should not show workspace to user C before they are added to it', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${orgAId}/workspaces`)
        .set('Cookie', `flowspace_session=${tokenC}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.find((w: any) => w.id === workspaceAId)).toBeUndefined();
    });

    it('should show workspace to user C once added as a workspace member', async () => {
      // Add User C to Workspace A
      await prisma.workspaceMember.create({
        data: {
          workspaceId: workspaceAId,
          userId: dbUserCId,
          role: WorkspaceRole.MEMBER,
        },
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${orgAId}/workspaces`)
        .set('Cookie', `flowspace_session=${tokenC}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const ws = res.body.data.find((w: any) => w.id === workspaceAId);
      expect(ws).toBeDefined();
      expect(ws.userRole).toBe(WorkspaceRole.MEMBER);
    });
  });

  describe('GET /api/v1/workspaces/:workspaceId', () => {
    it('should return workspace details for workspace member', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceAId}`)
        .set('Cookie', `flowspace_session=${tokenC}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(workspaceAId);
      expect(res.body.data.currentUserRole).toBe(WorkspaceRole.MEMBER);
      expect(res.body.data.members).toHaveLength(2); // User A and User C
    });

    it('should reject access if user has no access to workspace (multi-tenant isolation)', async () => {
      // User B attempts to access Workspace A
      const res = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceAId}`)
        .set('Cookie', `flowspace_session=${tokenB}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('do not have access to this workspace');
    });

    it('should return 404 for non-existent workspace ID', async () => {
      const dummyId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${dummyId}`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
    });
  });

  describe('PATCH /api/v1/workspaces/:workspaceId', () => {
    it('should reject update if user has role MEMBER (insufficient permissions)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/workspaces/${workspaceAId}`)
        .set('Cookie', `flowspace_session=${tokenC}`)
        .send({ name: 'Member Attempted Workspace' })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('owners or admins');
    });

    it('should reject update if user is from outside tenant', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/workspaces/${workspaceAId}`)
        .set('Cookie', `flowspace_session=${tokenB}`)
        .send({ name: 'Hacked Workspace' })
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should allow update when user is OWNER', async () => {
      const updatedName = `Updated Engineering ${uniqueId}`;
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/workspaces/${workspaceAId}`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .send({
          name: updatedName,
          description: 'Updated engineering workspace description',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(updatedName);
      expect(res.body.data.description).toBe(
        'Updated engineering workspace description',
      );

      // Verify in DB
      const dbWs = await prisma.workspace.findUnique({
        where: { id: workspaceAId },
      });
      expect(dbWs!.name).toBe(updatedName);
    });
  });

  describe('DELETE /api/v1/workspaces/:workspaceId', () => {
    it('should reject delete if user has role MEMBER', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/workspaces/${workspaceAId}`)
        .set('Cookie', `flowspace_session=${tokenC}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('owner can delete');
    });

    it('should reject delete if user is from outside tenant', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/workspaces/${workspaceAId}`)
        .set('Cookie', `flowspace_session=${tokenB}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should allow OWNER to delete workspace', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/workspaces/${workspaceAId}`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Workspace deleted successfully');

      // Verify DB record is deleted
      const dbWs = await prisma.workspace.findUnique({
        where: { id: workspaceAId },
      });
      expect(dbWs).toBeNull();
    });
  });
});
