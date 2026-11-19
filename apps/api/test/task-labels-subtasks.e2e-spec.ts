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
import { ProjectRole } from '@prisma/client';

describe('Task Labels & Subtasks API (FS-035 e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const uniqueId = Date.now();

  const userOwner = {
    name: 'Label Owner',
    email: `label-owner-${uniqueId}@flowspace.internal`,
    password: 'Password123!',
  };

  const userOutsider = {
    name: 'Label Outsider',
    email: `label-outsider-${uniqueId}@flowspace.internal`,
    password: 'Password123!',
  };

  let tokenOwner: string;
  let tokenOutsider: string;
  let userOwnerId: string;
  let userOutsiderId: string;
  let orgId: string;
  let workspaceId: string;
  let projectIdA: string;
  let projectIdB: string;
  let statusIdA: string;
  let statusIdB: string;

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

    const outsiderRes = await setupUser(userOutsider);
    userOutsiderId = outsiderRes.id;
    tokenOutsider = outsiderRes.token;

    // Create Org & Workspace
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({ name: `Org Labels ${uniqueId}` })
      .expect(201);
    orgId = orgRes.body.data.id;

    const wsRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspaces`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({ name: `WS Labels ${uniqueId}` })
      .expect(201);
    workspaceId = wsRes.body.data.id;

    // Create Project A
    const projARes = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({ name: 'Project Alpha', key: `PA${uniqueId.toString().slice(-4)}` })
      .expect(201);
    projectIdA = projARes.body.data.id;

    // Create Project B (for cross-project checks)
    const projBRes = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({ name: 'Project Beta', key: `PB${uniqueId.toString().slice(-4)}` })
      .expect(201);
    projectIdB = projBRes.body.data.id;

    // Retrieve default statuses
    const statusesARes = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectIdA}/statuses`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .expect(200);
    statusIdA = statusesARes.body.data[0].id;

    const statusesBRes = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectIdB}/statuses`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .expect(200);
    statusIdB = statusesBRes.body.data[0].id;
  });

  afterAll(async () => {
    if (orgId) {
      await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
    }
    if (userOwnerId) {
      await prisma.user.delete({ where: { id: userOwnerId } }).catch(() => {});
    }
    if (userOutsiderId) {
      await prisma.user.delete({ where: { id: userOutsiderId } }).catch(() => {});
    }
    await app.close();
  });

  describe('Project Labels Management', () => {
    let labelId1: string;
    let labelId2: string;

    it('should create labels with valid hex colors', async () => {
      const res1 = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectIdA}/labels`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ name: 'Bug', color: '#ef4444' })
        .expect(201);

      expect(res1.body.success).toBe(true);
      expect(res1.body.data.name).toBe('Bug');
      expect(res1.body.data.color).toBe('#ef4444');
      labelId1 = res1.body.data.id;

      const res2 = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectIdA}/labels`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ name: 'Feature', color: '#3b82f6' })
        .expect(201);

      expect(res2.body.success).toBe(true);
      expect(res2.body.data.name).toBe('Feature');
      labelId2 = res2.body.data.id;
    });

    it('should reject invalid hex color format with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectIdA}/labels`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ name: 'Invalid Color', color: 'not-a-hex' })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectIdA}/labels`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ name: 'Short Hex', color: '#fff' })
        .expect(400);
    });

    it('should reject duplicate label name in the same project with 409 Conflict', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectIdA}/labels`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ name: 'Bug', color: '#dc2626' })
        .expect(409);

      expect(res.body.message).toContain('already exists');
    });

    it('should list all labels in the project', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectIdA}/labels`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      const names = res.body.data.map((l: any) => l.name);
      expect(names).toContain('Bug');
      expect(names).toContain('Feature');
    });

    it('should update label name and color', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/projects/${projectIdA}/labels/${labelId1}`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ name: 'Critical Bug', color: '#991b1b' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Critical Bug');
      expect(res.body.data.color).toBe('#991b1b');
    });

    it('should reject updating to an existing label name with 409 Conflict', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/projects/${projectIdA}/labels/${labelId1}`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ name: 'Feature' })
        .expect(409);
    });

    it('should reject outsider access to project labels with 403', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectIdA}/labels`)
        .set('Cookie', [`flowspace_session=${tokenOutsider}`])
        .expect(403);
    });

    it('should delete a label', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/projects/${projectIdA}/labels/${labelId2}`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectIdA}/labels`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(labelId1);
    });
  });

  describe('Task Label Attach & Detach', () => {
    let taskId: string;
    let labelAId: string;
    let labelBId: string;

    beforeAll(async () => {
      // Create task in Project A
      const taskRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectIdA}/tasks`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ title: 'Task with Labels', statusId: statusIdA })
        .expect(201);
      taskId = taskRes.body.data.id;

      // Label in Project A
      const lblARes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectIdA}/labels`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ name: 'Backend', color: '#10b981' })
        .expect(201);
      labelAId = lblARes.body.data.id;

      // Label in Project B
      const lblBRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectIdB}/labels`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ name: 'Frontend', color: '#6366f1' })
        .expect(201);
      labelBId = lblBRes.body.data.id;
    });

    it('should attach a project label to task', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${taskId}/labels`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ labelId: labelAId })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.labels).toBeDefined();
      expect(res.body.data.labels.some((l: any) => l.labelId === labelAId)).toBe(true);
    });

    it('should handle duplicate label attachment gracefully (idempotent)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${taskId}/labels`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ labelId: labelAId })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.labels.length).toBe(1);
    });

    it('should reject attaching a label from another project with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${taskId}/labels`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ labelId: labelBId })
        .expect(400);

      expect(res.body.message).toContain('belong to this project');
    });

    it('should detach a label from task', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${taskId}/labels/${labelAId}`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      const taskRes = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      expect(taskRes.body.data.labels.length).toBe(0);
    });

    it('should cascade delete task label association when project label is deleted', async () => {
      // Re-attach label
      await request(app.getHttpServer())
        .post(`/api/v1/tasks/${taskId}/labels`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ labelId: labelAId })
        .expect(200);

      // Delete project label
      await request(app.getHttpServer())
        .delete(`/api/v1/projects/${projectIdA}/labels/${labelAId}`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      // Verify task no longer has this label
      const taskRes = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      expect(taskRes.body.data.labels.length).toBe(0);
    });
  });

  describe('Subtasks & Hierarchy Management', () => {
    let parentTaskId: string;
    let subtaskId1: string;

    beforeAll(async () => {
      const taskRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectIdA}/tasks`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ title: 'Main Epic Feature', statusId: statusIdA })
        .expect(201);
      parentTaskId = taskRes.body.data.id;
    });

    it('should create subtask directly linked to parent task', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${parentTaskId}/subtasks`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ title: 'Design database schema', statusId: statusIdA })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.parentTaskId).toBe(parentTaskId);
      expect(res.body.data.title).toBe('Design database schema');
      expect(res.body.data.taskKey).toBeDefined();
      subtaskId1 = res.body.data.id;

      // Verify parent task query returns subtasks array
      const parentRes = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${parentTaskId}`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      expect(parentRes.body.data.subtasks).toBeDefined();
      expect(parentRes.body.data.subtasks.some((s: any) => s.id === subtaskId1)).toBe(true);
    });

    it('should prevent setting a task as its own parent (self-parent cycle)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${parentTaskId}/parent`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ parentTaskId: parentTaskId, version: 1 })
        .expect(400);

      expect(res.body.message).toContain('cannot be its own parent');
    });

    it('should prevent direct cycle (child cannot become parent of its parent)', async () => {
      // subtaskId1's parent is parentTaskId.
      // Trying to make subtaskId1 the parent of parentTaskId must fail!
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${parentTaskId}/parent`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ parentTaskId: subtaskId1, version: 1 })
        .expect(400);

      expect(res.body.message).toContain('Circular parent relationship detected');
    });

    it('should prevent transitive circular hierarchy (A -> B -> C -> A)', async () => {
      // 1. Create subtask under subtaskId1 (making: parentTask -> subtaskId1 -> grandChildId)
      const grandChildRes = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${subtaskId1}/subtasks`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ title: 'Nested grandchild task', statusId: statusIdA })
        .expect(201);
      const grandChildId = grandChildRes.body.data.id;

      // 2. Try to set parent of parentTaskId to grandChildId -> MUST BE REJECTED!
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${parentTaskId}/parent`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ parentTaskId: grandChildId, version: 1 })
        .expect(400);

      expect(res.body.message).toContain('Circular parent relationship detected');
    });

    it('should reject setting parent from another project with 400 Bad Request', async () => {
      // Create task in Project B
      const taskBRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectIdB}/tasks`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ title: 'Task in Beta', statusId: statusIdB })
        .expect(201);
      const taskBId = taskBRes.body.data.id;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${parentTaskId}/parent`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ parentTaskId: taskBId, version: 1 })
        .expect(400);

      expect(res.body.message).toContain('belong to this project');
    });

    it('should allow clearing parent task (parentTaskId: null)', async () => {
      const getSub = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${subtaskId1}`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      const subVersion = getSub.body.data.version;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${subtaskId1}/parent`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ parentTaskId: null, version: subVersion })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.parentTaskId).toBeNull();
    });

    it('should enforce optimistic concurrency version check on parent update', async () => {
      const getParent = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${parentTaskId}`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      // Wrong version
      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${parentTaskId}/parent`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ parentTaskId: null, version: 9999 })
        .expect(409);
    });
  });
});
