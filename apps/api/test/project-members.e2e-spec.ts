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
import { WorkspaceRole, ProjectRole } from '@prisma/client';

describe('Project Members API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const uniqueId = Date.now();

  const userA = {
    name: 'Lead Alice',
    email: `alice-${uniqueId}@flowspace-p-members.internal`,
    password: 'Password123!',
  };

  const userB = {
    name: 'Dev Bob',
    email: `bob-${uniqueId}@flowspace-p-members.internal`,
    password: 'Password123!',
  };

  const userC = {
    name: 'Viewer Charlie',
    email: `charlie-${uniqueId}@flowspace-p-members.internal`,
    password: 'Password123!',
  };

  const userD = {
    name: 'Outsider Dave',
    email: `dave-${uniqueId}@flowspace-p-members.internal`,
    password: 'Password123!',
  };

  let tokenA: string;
  let tokenB: string;
  let tokenC: string;
  let tokenD: string;
  let userBId: string;
  let userCId: string;
  let userDId: string;
  let orgId: string;
  let workspaceId: string;
  let projectId: string;
  let memberAId: string;
  let memberBId: string;
  let memberCId: string;

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

    // Register users
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
    tokenD = await setupUser(userD);

    const dbUserB = await prisma.user.findUnique({ where: { email: userB.email } });
    const dbUserC = await prisma.user.findUnique({ where: { email: userC.email } });
    const dbUserD = await prisma.user.findUnique({ where: { email: userD.email } });
    userBId = dbUserB!.id;
    userCId = dbUserC!.id;
    userDId = dbUserD!.id;

    // Create organization
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', `flowspace_session=${tokenA}`)
      .send({ name: `Org Members ${uniqueId}`, slug: `org-mem-${uniqueId}` })
      .expect(201);
    orgId = orgRes.body.data.id;

    // Create workspace
    const wsRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspaces`)
      .set('Cookie', `flowspace_session=${tokenA}`)
      .send({ name: `Workspace Members ${uniqueId}`, slug: `ws-mem-${uniqueId}` })
      .expect(201);
    workspaceId = wsRes.body.data.id;

    // Add User B as Workspace MEMBER, User C as Workspace VIEWER
    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: userBId,
        role: WorkspaceRole.MEMBER,
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: userCId,
        role: WorkspaceRole.VIEWER,
      },
    });

    // Create project
    const projRes = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Cookie', `flowspace_session=${tokenA}`)
      .send({
        name: 'Project With Members',
        key: 'PWM',
      })
      .expect(201);
    projectId = projRes.body.data.id;
    memberAId = projRes.body.data.members[0].id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.organization.deleteMany({
        where: { slug: { contains: `-${uniqueId}` } },
      });
      await prisma.user.deleteMany({
        where: { email: { contains: '-p-members.internal' } },
      });
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/v1/projects/:projectId/members', () => {
    it('should list project members with creator initially as MANAGER', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/members`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].role).toBe(ProjectRole.MANAGER);
      expect(res.body.data[0].user.email).toBe(userA.email);
    });

    it('should reject unauthenticated request with 401', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/members`)
        .expect(401);
    });

    it('should reject outside user with 403', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/members`)
        .set('Cookie', `flowspace_session=${tokenD}`)
        .expect(403);
    });
  });

  describe('POST /api/v1/projects/:projectId/members', () => {
    it('should reject adding a user who is not a member of the workspace with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .send({
          userId: userDId,
          role: ProjectRole.MEMBER,
        })
        .expect(400);

      expect(res.body.message).toContain('must be a member of the workspace');
    });

    it('should add workspace member to project as MEMBER', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .send({
          userId: userBId,
          role: ProjectRole.MEMBER,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(userBId);
      expect(res.body.data.role).toBe(ProjectRole.MEMBER);
      memberBId = res.body.data.id;
    });

    it('should add workspace viewer to project as VIEWER', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .send({
          userId: userCId,
          role: ProjectRole.VIEWER,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(userCId);
      expect(res.body.data.role).toBe(ProjectRole.VIEWER);
      memberCId = res.body.data.id;
    });

    it('should reject duplicate member with 409 Conflict', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .send({
          userId: userBId,
          role: ProjectRole.MEMBER,
        })
        .expect(409);
    });

    it('should reject non-manager (Viewer User C) from adding members with 403', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Cookie', `flowspace_session=${tokenC}`)
        .send({
          userId: userBId,
          role: ProjectRole.MEMBER,
        })
        .expect(403);
    });
  });

  describe('PATCH /api/v1/projects/:projectId/members/:memberId', () => {
    it('should promote User B from MEMBER to MANAGER', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/projects/${projectId}/members/${memberBId}`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .send({ role: ProjectRole.MANAGER })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe(ProjectRole.MANAGER);
    });

    it('should allow demoting User A since User B is also MANAGER', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/projects/${projectId}/members/${memberAId}`)
        .set('Cookie', `flowspace_session=${tokenB}`)
        .send({ role: ProjectRole.MEMBER })
        .expect(200);

      expect(res.body.data.role).toBe(ProjectRole.MEMBER);
    });

    it('should reject demoting the only remaining MANAGER (User B) with 400', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/projects/${projectId}/members/${memberBId}`)
        .set('Cookie', `flowspace_session=${tokenB}`)
        .send({ role: ProjectRole.VIEWER })
        .expect(400);

      expect(res.body.message).toContain('Cannot demote the only Manager');
    });
  });

  describe('DELETE /api/v1/projects/:projectId/members/:memberId', () => {
    it('should reject removing the only remaining MANAGER (User B) with 400', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/projects/${projectId}/members/${memberBId}`)
        .set('Cookie', `flowspace_session=${tokenB}`)
        .expect(400);

      expect(res.body.message).toContain('Cannot remove the only Manager');
    });

    it('should allow manager (User B) to remove member C', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/projects/${projectId}/members/${memberCId}`)
        .set('Cookie', `flowspace_session=${tokenB}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should allow User A to self-remove from project', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/projects/${projectId}/members/${memberAId}`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should verify project members list now only contains User B', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/members`)
        .set('Cookie', `flowspace_session=${tokenB}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(memberBId);
      expect(res.body.data[0].role).toBe(ProjectRole.MANAGER);
    });
  });
});
