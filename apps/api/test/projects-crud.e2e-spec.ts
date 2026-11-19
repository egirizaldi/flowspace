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
import { WorkspaceRole, ProjectLifecycleStatus } from '@prisma/client';

describe('Project CRUD API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const uniqueId = Date.now();

  const userA = {
    name: 'Owner Alice',
    email: `alice-${uniqueId}@flowspace-proj-crud.internal`,
    password: 'Password123!',
  };

  const userB = {
    name: 'Outside Bob',
    email: `bob-${uniqueId}@flowspace-proj-crud.internal`,
    password: 'Password123!',
  };

  const userC = {
    name: 'Viewer Charlie',
    email: `charlie-${uniqueId}@flowspace-proj-crud.internal`,
    password: 'Password123!',
  };

  let tokenA: string;
  let tokenB: string;
  let tokenC: string;
  let userCId: string;
  let orgId: string;
  let workspaceId: string;
  let project1Id: string;
  let project2Id: string;

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

    // Setup users
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
    userCId = dbUserC!.id;

    // Create organization
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', `flowspace_session=${tokenA}`)
      .send({ name: `Org CRUD ${uniqueId}`, slug: `org-crud-${uniqueId}` })
      .expect(201);
    orgId = orgRes.body.data.id;

    // Create workspace
    const wsRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspaces`)
      .set('Cookie', `flowspace_session=${tokenA}`)
      .send({ name: `Workspace CRUD ${uniqueId}`, slug: `ws-crud-${uniqueId}` })
      .expect(201);
    workspaceId = wsRes.body.data.id;

    // Add User C to workspace as VIEWER
    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: userCId,
        role: WorkspaceRole.VIEWER,
      },
    });

    // Create Project 1 (ACTIVE)
    const p1Res = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Cookie', `flowspace_session=${tokenA}`)
      .send({
        name: 'Alpha Project',
        key: 'ALPHA',
        status: ProjectLifecycleStatus.ACTIVE,
      })
      .expect(201);
    project1Id = p1Res.body.data.id;

    // Create Project 2 (PLANNING)
    const p2Res = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Cookie', `flowspace_session=${tokenA}`)
      .send({
        name: 'Beta Project',
        key: 'BETA',
        status: ProjectLifecycleStatus.PLANNING,
      })
      .expect(201);
    project2Id = p2Res.body.data.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.organization.deleteMany({
        where: { slug: { contains: `-${uniqueId}` } },
      });
      await prisma.user.deleteMany({
        where: { email: { contains: '-proj-crud.internal' } },
      });
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/v1/workspaces/:workspaceId/projects', () => {
    it('should list projects in workspace with pagination meta', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/projects`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter projects by status', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/workspaces/${workspaceId}/projects?status=${ProjectLifecycleStatus.PLANNING}`,
        )
        .set('Cookie', `flowspace_session=${tokenA}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(project2Id);
      expect(res.body.data[0].key).toBe('BETA');
    });

    it('should filter projects by search keyword', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/projects?search=Alpha`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(project1Id);
    });

    it('should reject unauthorized request with 401', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/projects`)
        .expect(401);
    });

    it('should reject outside user with 403', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/projects`)
        .set('Cookie', `flowspace_session=${tokenB}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/projects/:projectId', () => {
    it('should return project details with members, statuses, and workspace', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${project1Id}`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const proj = res.body.data;
      expect(proj.id).toBe(project1Id);
      expect(proj.name).toBe('Alpha Project');
      expect(proj.key).toBe('ALPHA');
      expect(proj.workspace.id).toBe(workspaceId);
      expect(proj.statuses.length).toBeGreaterThanOrEqual(5);
      expect(proj.members.length).toBeGreaterThanOrEqual(1);
    });

    it('should allow VIEWER in workspace to view project details', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${project1Id}`)
        .set('Cookie', `flowspace_session=${tokenC}`)
        .expect(200);
    });

    it('should reject outside user with 403', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${project1Id}`)
        .set('Cookie', `flowspace_session=${tokenB}`)
        .expect(403);
    });

    it('should return 404 for unknown project', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${fakeUuid}`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/projects/:projectId', () => {
    it('should update project attributes and return updated project', async () => {
      const updatePayload = {
        name: 'Alpha Platform Renamed',
        description: 'Updated platform description',
        status: ProjectLifecycleStatus.ON_HOLD,
        startDate: '2026-12-01',
        dueDate: '2027-04-15',
      };

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/projects/${project1Id}`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .send(updatePayload)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(updatePayload.name);
      expect(res.body.data.description).toBe(updatePayload.description);
      expect(res.body.data.status).toBe(ProjectLifecycleStatus.ON_HOLD);
    });

    it('should reject VIEWER from updating project with 403', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/projects/${project1Id}`)
        .set('Cookie', `flowspace_session=${tokenC}`)
        .send({ name: 'Hacked by Viewer' })
        .expect(403);
    });
  });

  describe('Archive & Restore Flow', () => {
    it('should archive project and exclude from default list', async () => {
      const archiveRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${project2Id}/archive`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .expect(200);

      expect(archiveRes.body.success).toBe(true);
      expect(archiveRes.body.data.archivedAt).not.toBeNull();

      // Default list should now only have 1 active project
      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/projects`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .expect(200);

      expect(listRes.body.data).toHaveLength(1);
      expect(listRes.body.data[0].id).toBe(project1Id);

      // List with includeArchived=true should have 2
      const allRes = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/projects?includeArchived=true`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .expect(200);

      expect(allRes.body.data).toHaveLength(2);
    });

    it('should restore archived project', async () => {
      const restoreRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${project2Id}/restore`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .expect(200);

      expect(restoreRes.body.success).toBe(true);
      expect(restoreRes.body.data.archivedAt).toBeNull();

      // Default list should now have both projects again
      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${workspaceId}/projects`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .expect(200);

      expect(listRes.body.data).toHaveLength(2);
    });
  });

  describe('DELETE /api/v1/projects/:projectId', () => {
    it('should reject VIEWER from deleting project with 403', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/projects/${project2Id}`)
        .set('Cookie', `flowspace_session=${tokenC}`)
        .expect(403);
    });

    it('should allow project manager or workspace owner to delete project', async () => {
      const delRes = await request(app.getHttpServer())
        .delete(`/api/v1/projects/${project2Id}`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .expect(200);

      expect(delRes.body.success).toBe(true);

      // Verify subsequent GET returns 404
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${project2Id}`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .expect(404);
    });
  });
});
