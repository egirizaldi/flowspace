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
import { ProjectRole, ProjectStatusCategory, Prisma } from '@prisma/client';

describe('Project Statuses API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const uniqueId = Date.now();

  const userLead = {
    name: 'Status Lead',
    email: `status-lead-${uniqueId}@flowspace-statuses.internal`,
    password: 'Password123!',
  };

  const userViewer = {
    name: 'Status Viewer',
    email: `status-viewer-${uniqueId}@flowspace-statuses.internal`,
    password: 'Password123!',
  };

  const userOutsider = {
    name: 'Status Outsider',
    email: `status-outsider-${uniqueId}@flowspace-statuses.internal`,
    password: 'Password123!',
  };

  let tokenLead: string;
  let tokenViewer: string;
  let tokenOutsider: string;
  let userLeadId: string;
  let userViewerId: string;
  let orgId: string;
  let workspaceId: string;
  let projectId: string;

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

    const viewer = await setupUser(userViewer);
    tokenViewer = viewer.token;
    userViewerId = viewer.id;

    const outsider = await setupUser(userOutsider);
    tokenOutsider = outsider.token;

    // Create organization & workspace with Lead
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', `flowspace_session=${tokenLead}`)
      .send({
        name: `Org Statuses ${uniqueId}`,
        slug: `org-statuses-${uniqueId}`,
      })
      .expect(201);
    orgId = orgRes.body.data.id;

    const wsRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspaces`)
      .set('Cookie', `flowspace_session=${tokenLead}`)
      .send({
        name: `WS Statuses ${uniqueId}`,
        slug: `ws-statuses-${uniqueId}`,
      })
      .expect(201);
    workspaceId = wsRes.body.data.id;

    // Create Project (seeds default statuses)
    const projRes = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Cookie', `flowspace_session=${tokenLead}`)
      .send({
        name: 'Workflow Project',
        key: 'FLOW',
      })
      .expect(201);
    projectId = projRes.body.data.id;

    // Add viewer as Project Viewer
    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: userViewerId,
        role: 'MEMBER',
      },
    });

    await prisma.projectMember.create({
      data: {
        projectId,
        userId: userViewerId,
        role: ProjectRole.VIEWER,
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.organization.deleteMany({
        where: { slug: { contains: `-statuses-${uniqueId}` } },
      });
      await prisma.user.deleteMany({
        where: { email: { contains: '-statuses.internal' } },
      });
      await prisma.$disconnect();
    }
    await app.close();
  });

  describe('GET /api/v1/projects/:projectId/statuses', () => {
    it('should list all initial default workflow statuses ordered by position', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/statuses`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(5);

      const names = res.body.data.map((s: any) => s.name);
      expect(names).toEqual(['Backlog', 'Todo', 'In Progress', 'In Review', 'Done']);
    });

    it('should allow project viewer to read statuses', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/statuses`)
        .set('Cookie', `flowspace_session=${tokenViewer}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(5);
    });

    it('should forbid outsider from viewing statuses (403)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/statuses`)
        .set('Cookie', `flowspace_session=${tokenOutsider}`)
        .expect(403);
    });
  });

  describe('POST /api/v1/projects/:projectId/statuses', () => {
    it('should allow project manager to create a custom status', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/statuses`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          name: 'QA Testing',
          category: ProjectStatusCategory.IN_PROGRESS,
          color: '#8b5cf6',
          position: 3500,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('QA Testing');
      expect(res.body.data.category).toBe(ProjectStatusCategory.IN_PROGRESS);
      expect(res.body.data.color).toBe('#8b5cf6');
      expect(res.body.data.position).toBe(3500);
      expect(res.body.data.isDefault).toBe(false);
    });

    it('should reject non-manager creating a status (403)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/statuses`)
        .set('Cookie', `flowspace_session=${tokenViewer}`)
        .send({
          name: 'Unauthorized Status',
          category: ProjectStatusCategory.TODO,
          color: '#ef4444',
        })
        .expect(403);
    });

    it('should reject invalid hex color format (400)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/statuses`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          name: 'Invalid Color Status',
          category: ProjectStatusCategory.TODO,
          color: 'blue', // Not valid hex
        })
        .expect(400);
    });
  });

  describe('PATCH /api/v1/projects/:projectId/statuses/:statusId', () => {
    let customStatusId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/statuses`)
        .set('Cookie', `flowspace_session=${tokenLead}`);
      const found = res.body.data.find((s: any) => s.name === 'QA Testing');
      customStatusId = found.id;
    });

    it('should update status name and color', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/projects/${projectId}/statuses/${customStatusId}`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          name: 'QA Verification',
          color: '#a855f7',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('QA Verification');
      expect(res.body.data.color).toBe('#a855f7');
    });

    it('should allow setting status as default and unsetting old default', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/projects/${projectId}/statuses/${customStatusId}`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          isDefault: true,
        })
        .expect(200);

      expect(res.body.data.isDefault).toBe(true);

      // Verify other statuses are not default
      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/statuses`)
        .set('Cookie', `flowspace_session=${tokenLead}`);
      const defaults = listRes.body.data.filter((s: any) => s.isDefault);
      expect(defaults.length).toBe(1);
      expect(defaults[0].id).toBe(customStatusId);
    });
  });

  describe('PUT /api/v1/projects/:projectId/statuses/reorder', () => {
    it('should reorder status positions according to provided ID sequence', async () => {
      const initial = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/statuses`)
        .set('Cookie', `flowspace_session=${tokenLead}`);

      const reversedIds = initial.body.data.map((s: any) => s.id).reverse();

      const res = await request(app.getHttpServer())
        .put(`/api/v1/projects/${projectId}/statuses/reorder`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          statusIds: reversedIds,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      const reorderedIds = res.body.data.map((s: any) => s.id);
      expect(reorderedIds).toEqual(reversedIds);
    });

    it('should reject reorder when status ID belongs to another project (400)', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/projects/${projectId}/statuses/reorder`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          statusIds: ['00000000-0000-0000-0000-000000000000'],
        })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/projects/:projectId/statuses/:statusId', () => {
    let statusToDeleteId: string;
    let defaultStatusId: string;

    beforeAll(async () => {
      // Create a temporary unused status to delete
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/statuses`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          name: 'Temp Discardable',
          category: ProjectStatusCategory.TODO,
          color: '#94a3b8',
        });
      statusToDeleteId = res.body.data.id;

      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/statuses`)
        .set('Cookie', `flowspace_session=${tokenLead}`);
      const def = listRes.body.data.find((s: any) => s.isDefault);
      defaultStatusId = def.id;
    });

    it('should reject deleting the default status (400)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/projects/${projectId}/statuses/${defaultStatusId}`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .expect(400);
    });

    it('should successfully delete an unused non-default status', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/projects/${projectId}/statuses/${statusToDeleteId}`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.deletedId).toBe(statusToDeleteId);

      // Verify it is no longer in the statuses list
      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/statuses`)
        .set('Cookie', `flowspace_session=${tokenLead}`);
      const found = listRes.body.data.find((s: any) => s.id === statusToDeleteId);
      expect(found).toBeUndefined();
    });

    it('should reject deleting a status that currently has tasks assigned (409 Conflict)', async () => {
      // 1. Create a status
      const statusRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/statuses`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          name: 'Status In Use',
          category: ProjectStatusCategory.TODO,
          color: '#ef4444',
        })
        .expect(201);
      const busyStatusId = statusRes.body.data.id;

      // 2. Create a task assigned to that status
      const task = await prisma.task.create({
        data: {
          projectId,
          statusId: busyStatusId,
          taskNumber: 101,
          title: 'Task blocking deletion',
          position: new Prisma.Decimal('1000.0000000000'),
          createdBy: userLeadId,
        },
      });

      // 3. Attempt to delete status -> 409 Conflict
      const delRes = await request(app.getHttpServer())
        .delete(`/api/v1/projects/${projectId}/statuses/${busyStatusId}`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .expect(409);

      expect(delRes.body.message).toContain('assigned to 1 task');

      // 4. Remove task and now delete status -> 200
      await prisma.task.delete({ where: { id: task.id } });

      await request(app.getHttpServer())
        .delete(`/api/v1/projects/${projectId}/statuses/${busyStatusId}`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .expect(200);
    });
  });
});
