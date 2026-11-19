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
import { WorkspaceRole, ProjectLifecycleStatus, ProjectRole } from '@prisma/client';

describe('POST /api/v1/workspaces/:workspaceId/projects (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const uniqueId = Date.now();

  const userA = {
    name: 'Owner Alice',
    email: `alice-${uniqueId}@flowspace-proj-create.internal`,
    password: 'Password123!',
  };

  const userB = {
    name: 'Outside Bob',
    email: `bob-${uniqueId}@flowspace-proj-create.internal`,
    password: 'Password123!',
  };

  const userC = {
    name: 'Viewer Charlie',
    email: `charlie-${uniqueId}@flowspace-proj-create.internal`,
    password: 'Password123!',
  };

  let tokenA: string;
  let tokenB: string;
  let tokenC: string;
  let userCId: string;
  let orgAId: string;
  let workspaceAId: string;
  let workspaceA2Id: string;

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

    // Helper to register and login
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

    // User A creates Org A
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', `flowspace_session=${tokenA}`)
      .send({ name: `Org A ${uniqueId}`, slug: `org-a-${uniqueId}` })
      .expect(201);
    orgAId = orgRes.body.data.id;

    // User A creates Workspace A
    const wsRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgAId}/workspaces`)
      .set('Cookie', `flowspace_session=${tokenA}`)
      .send({ name: `Workspace A ${uniqueId}`, slug: `ws-a-${uniqueId}` })
      .expect(201);
    workspaceAId = wsRes.body.data.id;

    // User A creates Workspace A2
    const ws2Res = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgAId}/workspaces`)
      .set('Cookie', `flowspace_session=${tokenA}`)
      .send({ name: `Workspace A2 ${uniqueId}`, slug: `ws-a2-${uniqueId}` })
      .expect(201);
    workspaceA2Id = ws2Res.body.data.id;

    // Add User C to Workspace A as VIEWER
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspaceAId,
        userId: userCId,
        role: WorkspaceRole.VIEWER,
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.organization.deleteMany({
        where: { slug: { contains: `-${uniqueId}` } },
      });
      await prisma.user.deleteMany({
        where: { email: { contains: '-proj-create.internal' } },
      });
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  it('should create a project with full payload and return 201 Created', async () => {
    const payload = {
      name: 'FlowSpace Web Core',
      key: 'FLOW',
      description: 'Core web frontend and backend systems',
      status: ProjectLifecycleStatus.PLANNING,
      startDate: '2026-11-19',
      dueDate: '2027-01-30',
    };

    const res = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceAId}/projects`)
      .set('Cookie', `flowspace_session=${tokenA}`)
      .send(payload)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const proj = res.body.data;
    expect(proj.id).toBeDefined();
    expect(proj.name).toBe(payload.name);
    expect(proj.key).toBe(payload.key);
    expect(proj.description).toBe(payload.description);
    expect(proj.status).toBe(ProjectLifecycleStatus.PLANNING);
    expect(proj.workspaceId).toBe(workspaceAId);
    expect(proj.organizationId).toBe(orgAId);

    // Creator should be Project Manager
    expect(proj.members).toHaveLength(1);
    expect(proj.members[0].role).toBe(ProjectRole.MANAGER);

    // Default statuses should be seeded
    expect(proj.statuses).toHaveLength(5);
    expect(proj.statuses.map((s: any) => s.name)).toEqual([
      'Backlog',
      'Todo',
      'In Progress',
      'In Review',
      'Done',
    ]);
  });

  it('should auto-generate project key when key is omitted', async () => {
    const payload = {
      name: 'Mobile Client Application',
      description: 'iOS and Android client',
    };

    const res = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceAId}/projects`)
      .set('Cookie', `flowspace_session=${tokenA}`)
      .send(payload)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.key).toBe('MCA');
  });

  it('should reject duplicate project key in the same workspace with 409 Conflict', async () => {
    const payload = {
      name: 'Duplicate Flow App',
      key: 'FLOW',
    };

    const res = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceAId}/projects`)
      .set('Cookie', `flowspace_session=${tokenA}`)
      .send(payload)
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already exists');
  });

  it('should allow the same project key in a different workspace', async () => {
    const payload = {
      name: 'Flow in Workspace A2',
      key: 'FLOW',
    };

    const res = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceA2Id}/projects`)
      .set('Cookie', `flowspace_session=${tokenA}`)
      .send(payload)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.workspaceId).toBe(workspaceA2Id);
    expect(res.body.data.key).toBe('FLOW');
  });

  it('should reject unauthenticated request with 401 Unauthorized', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceAId}/projects`)
      .send({ name: 'Unauthorized Project', key: 'UNAUTH' })
      .expect(401);
  });

  it('should reject user outside workspace and organization with 403 Forbidden', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceAId}/projects`)
      .set('Cookie', `flowspace_session=${tokenB}`)
      .send({ name: 'Outside Project', key: 'OUT' })
      .expect(403);
  });

  it('should reject user with VIEWER role in workspace with 403 Forbidden', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceAId}/projects`)
      .set('Cookie', `flowspace_session=${tokenC}`)
      .send({ name: 'Viewer Project', key: 'VIEW' })
      .expect(403);
  });

  it('should reject invalid payload with 400 Bad Request', async () => {
    // Empty name
    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceAId}/projects`)
      .set('Cookie', `flowspace_session=${tokenA}`)
      .send({ name: '', key: 'KEY' })
      .expect(400);

    // Invalid key (contains symbols)
    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceAId}/projects`)
      .set('Cookie', `flowspace_session=${tokenA}`)
      .send({ name: 'Valid Name', key: 'K@Y!' })
      .expect(400);
  });

  it('should return 404 if workspace does not exist', async () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${fakeUuid}/projects`)
      .set('Cookie', `flowspace_session=${tokenA}`)
      .send({ name: 'Ghost Project', key: 'GHOST' })
      .expect(404);
  });
});
