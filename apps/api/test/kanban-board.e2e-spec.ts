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

describe('Kanban Board API (FS-037 e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const uniqueId = Date.now();

  const userOwner = {
    name: 'Board Owner',
    email: `board-owner-${uniqueId}@flowspace.internal`,
    password: 'Password123!',
  };

  const userOutsider = {
    name: 'Board Outsider',
    email: `board-outsider-${uniqueId}@flowspace.internal`,
    password: 'Password123!',
  };

  let tokenOwner: string;
  let tokenOutsider: string;
  let userOwnerId: string;
  let userOutsiderId: string;
  let orgId: string;
  let workspaceId: string;
  let projectId: string;
  let statusTodoId: string;
  let statusInProgressId: string;
  let statusDoneId: string;
  let labelId: string;
  let task1Id: string;
  let task2Id: string;
  let task3Id: string;
  let subtask4Id: string;

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
      .send({ name: `Board Org ${uniqueId}` })
      .expect(201);
    orgId = orgRes.body.data.id;

    const wsRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspaces`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({ name: `Board WS ${uniqueId}` })
      .expect(201);
    workspaceId = wsRes.body.data.id;

    // Create Project
    const projRes = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({ name: 'Board Project', key: `KB${uniqueId.toString().slice(-4)}` })
      .expect(201);
    projectId = projRes.body.data.id;

    // Retrieve default statuses
    const statusesRes = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/statuses`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .expect(200);

    const statuses = statusesRes.body.data;
    statusTodoId = statuses.find((s: any) => s.name === 'Todo')?.id || statuses[1].id;
    statusInProgressId = statuses.find((s: any) => s.name === 'In Progress')?.id || statuses[2].id;
    statusDoneId = statuses.find((s: any) => s.name === 'Done')?.id || statuses[4].id;

    // Create Label
    const labelRes = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/labels`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({ name: 'Frontend', color: '#3b82f6' })
      .expect(201);
    labelId = labelRes.body.data.id;

    // Create Task 1 (Todo, Priority HIGH, Assigned)
    const t1Res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({
        title: 'Task Alpha High',
        statusId: statusTodoId,
        priority: 'HIGH',
        assigneeId: userOwnerId,
      })
      .expect(201);
    task1Id = t1Res.body.data.id;

    // Set Task 1 dueDate to yesterday (OVERDUE)
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    await request(app.getHttpServer())
      .patch(`/api/v1/tasks/${task1Id}`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({ version: 1, dueDate: yesterday.toISOString().split('T')[0] })
      .expect(200);

    // Attach label to Task 1
    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${task1Id}/labels`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({ labelId })
      .expect(200);

    // Create Task 2 (Todo, Priority LOW, Due Today)
    const t2Res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({
        title: 'Task Beta Low',
        statusId: statusTodoId,
        priority: 'LOW',
      })
      .expect(201);
    task2Id = t2Res.body.data.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/tasks/${task2Id}`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({ version: 1, dueDate: now.toISOString().split('T')[0] })
      .expect(200);

    // Create Task 3 (In Progress, Priority MEDIUM)
    const t3Res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({
        title: 'Task Gamma Medium',
        statusId: statusInProgressId,
        priority: 'MEDIUM',
      })
      .expect(201);
    task3Id = t3Res.body.data.id;

    // Create Task 4 as Subtask of Task 1 in Todo
    const t4Res = await request(app.getHttpServer())
      .post(`/api/v1/tasks/${task1Id}/subtasks`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({
        title: 'Subtask of Alpha',
        statusId: statusTodoId,
        priority: 'LOW',
      })
      .expect(201);
    subtask4Id = t4Res.body.data.id;
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

  describe('GET /api/v1/projects/:projectId/board', () => {
    it('should return complete kanban board grouped by status columns with top-level tasks', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/board`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Kanban board retrieved');
      expect(res.body.data.projectId).toBe(projectId);
      expect(res.body.data.projectKey).toBeDefined();
      expect(res.body.data.projectName).toBe('Board Project');
      expect(Array.isArray(res.body.data.columns)).toBe(true);

      const columns = res.body.data.columns;
      expect(columns.length).toBeGreaterThanOrEqual(5);

      // Verify columns sorted by position
      for (let i = 0; i < columns.length - 1; i++) {
        expect(columns[i].position).toBeLessThanOrEqual(columns[i + 1].position);
      }

      // Todo column
      const todoCol = columns.find((c: any) => c.id === statusTodoId);
      expect(todoCol).toBeDefined();
      // Should have 2 root tasks (Task 1 & Task 2), subtask (Task 4) should NOT be present by default
      expect(todoCol.tasks.length).toBe(2);
      expect(todoCol.tasks.map((t: any) => t.id)).toEqual([task1Id, task2Id]);

      // Check Task 1 details (assignee, label, subtask count)
      const task1 = todoCol.tasks.find((t: any) => t.id === task1Id);
      expect(task1.title).toBe('Task Alpha High');
      expect(task1.priority).toBe('HIGH');
      expect(task1.assignee).toBeDefined();
      expect(task1.assignee.id).toBe(userOwnerId);
      expect(task1.labels.length).toBe(1);
      expect(task1.labels[0].name).toBe('Frontend');
      expect(task1._count.subtasks).toBe(1);

      // In Progress column
      const inProgressCol = columns.find((c: any) => c.id === statusInProgressId);
      expect(inProgressCol).toBeDefined();
      expect(inProgressCol.tasks.length).toBe(1);
      expect(inProgressCol.tasks[0].id).toBe(task3Id);

      // Done column should be empty
      const doneCol = columns.find((c: any) => c.id === statusDoneId);
      expect(doneCol).toBeDefined();
      expect(doneCol.tasks.length).toBe(0);
    });

    it('should include subtasks when includeSubtasks=true', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/board?includeSubtasks=true`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      const todoCol = res.body.data.columns.find((c: any) => c.id === statusTodoId);
      expect(todoCol.tasks.length).toBe(3); // Task 1, Task 2, and Subtask 4
      expect(todoCol.tasks.some((t: any) => t.id === subtask4Id)).toBe(true);
    });

    it('should filter board tasks by priority', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/board?priority=HIGH`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      const todoCol = res.body.data.columns.find((c: any) => c.id === statusTodoId);
      expect(todoCol.tasks.length).toBe(1);
      expect(todoCol.tasks[0].id).toBe(task1Id);

      const inProgressCol = res.body.data.columns.find((c: any) => c.id === statusInProgressId);
      expect(inProgressCol.tasks.length).toBe(0);
    });

    it('should filter board tasks by assignee', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/board?assigneeId=${userOwnerId}`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      const todoCol = res.body.data.columns.find((c: any) => c.id === statusTodoId);
      expect(todoCol.tasks.length).toBe(1);
      expect(todoCol.tasks[0].id).toBe(task1Id);
    });

    it('should filter board tasks by search string', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/board?search=Beta`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      const todoCol = res.body.data.columns.find((c: any) => c.id === statusTodoId);
      expect(todoCol.tasks.length).toBe(1);
      expect(todoCol.tasks[0].id).toBe(task2Id);
    });

    it('should filter board tasks by label', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/board?labelId=${labelId}`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      const todoCol = res.body.data.columns.find((c: any) => c.id === statusTodoId);
      expect(todoCol.tasks.length).toBe(1);
      expect(todoCol.tasks[0].id).toBe(task1Id);

      const inProgressCol = res.body.data.columns.find((c: any) => c.id === statusInProgressId);
      expect(inProgressCol.tasks.length).toBe(0);
    });

    it('should filter board tasks by assignee=UNASSIGNED', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/board?assigneeId=UNASSIGNED`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      const todoCol = res.body.data.columns.find((c: any) => c.id === statusTodoId);
      // Task 2 is unassigned
      expect(todoCol.tasks.length).toBe(1);
      expect(todoCol.tasks[0].id).toBe(task2Id);

      const inProgressCol = res.body.data.columns.find((c: any) => c.id === statusInProgressId);
      // Task 3 is unassigned
      expect(inProgressCol.tasks.length).toBe(1);
      expect(inProgressCol.tasks[0].id).toBe(task3Id);
    });

    it('should filter board tasks by dueDateStatus=OVERDUE', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/board?dueDateStatus=OVERDUE`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      const todoCol = res.body.data.columns.find((c: any) => c.id === statusTodoId);
      expect(todoCol.tasks.length).toBe(1);
      expect(todoCol.tasks[0].id).toBe(task1Id);
    });

    it('should filter board tasks by dueDateStatus=TODAY', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/board?dueDateStatus=TODAY`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      const todoCol = res.body.data.columns.find((c: any) => c.id === statusTodoId);
      expect(todoCol.tasks.length).toBe(1);
      expect(todoCol.tasks[0].id).toBe(task2Id);
    });

    it('should filter board tasks by dueDateStatus=NO_DUE_DATE', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/board?dueDateStatus=NO_DUE_DATE`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      const todoCol = res.body.data.columns.find((c: any) => c.id === statusTodoId);
      expect(todoCol.tasks.length).toBe(0);

      const inProgressCol = res.body.data.columns.find((c: any) => c.id === statusInProgressId);
      expect(inProgressCol.tasks.length).toBe(1);
      expect(inProgressCol.tasks[0].id).toBe(task3Id);
    });

    it('should filter board tasks by combining multiple filters', async () => {
      // search for "Alpha", priority HIGH, labelId, and OVERDUE
      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/projects/${projectId}/board?search=Alpha&priority=HIGH&labelId=${labelId}&dueDateStatus=OVERDUE`,
        )
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      const todoCol = res.body.data.columns.find((c: any) => c.id === statusTodoId);
      expect(todoCol.tasks.length).toBe(1);
      expect(todoCol.tasks[0].id).toBe(task1Id);

      // Mutate search to mismatch -> should return empty
      const resEmpty = await request(app.getHttpServer())
        .get(
          `/api/v1/projects/${projectId}/board?search=Beta&priority=HIGH&labelId=${labelId}`,
        )
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      const todoColEmpty = resEmpty.body.data.columns.find((c: any) => c.id === statusTodoId);
      expect(todoColEmpty.tasks.length).toBe(0);
    });

    it('should filter task list consistently with GET /api/v1/projects/:projectId/tasks', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/projects/${projectId}/tasks?search=Alpha&priority=HIGH&labelId=${labelId}&dueDateStatus=OVERDUE`,
        )
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(task1Id);

      // Test UNASSIGNED on list
      const resUnassigned = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/tasks?assigneeId=UNASSIGNED`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      expect(resUnassigned.body.success).toBe(true);
      expect(
        resUnassigned.body.data.every((t: any) => t.assigneeId === null),
      ).toBe(true);
    });

    it('should reject unauthenticated request with 401', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/board`)
        .expect(401);
    });

    it('should reject unauthorized outsider with 403', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/board`)
        .set('Cookie', [`flowspace_session=${tokenOutsider}`])
        .expect(403);
    });

    it('should return 404 for non-existent project', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/projects/00000000-0000-0000-0000-000000000000/board')
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(404);
    });
  });
});
