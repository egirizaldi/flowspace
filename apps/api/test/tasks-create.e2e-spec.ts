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
import { ProjectRole, TaskPriority } from '@prisma/client';

describe('Create Task API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const uniqueId = Date.now();

  const userLead = {
    name: 'Task Lead',
    email: `task-lead-${uniqueId}@flowspace-tasks.internal`,
    password: 'Password123!',
  };

  const userMember = {
    name: 'Task Member',
    email: `task-member-${uniqueId}@flowspace-tasks.internal`,
    password: 'Password123!',
  };

  const userViewer = {
    name: 'Task Viewer',
    email: `task-viewer-${uniqueId}@flowspace-tasks.internal`,
    password: 'Password123!',
  };

  const userOutsider = {
    name: 'Task Outsider',
    email: `task-outsider-${uniqueId}@flowspace-tasks.internal`,
    password: 'Password123!',
  };

  let tokenLead: string;
  let tokenMember: string;
  let tokenViewer: string;
  let tokenOutsider: string;
  let userMemberId: string;
  let orgId: string;
  let workspaceId: string;
  let projectId: string;
  let project2Id: string;
  let otherStatusId: string;

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

    const member = await setupUser(userMember);
    tokenMember = member.token;
    userMemberId = member.id;

    const viewer = await setupUser(userViewer);
    tokenViewer = viewer.token;

    const outsider = await setupUser(userOutsider);
    tokenOutsider = outsider.token;

    // Create organization & workspace with Lead
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', `flowspace_session=${tokenLead}`)
      .send({
        name: `Org Tasks ${uniqueId}`,
        slug: `org-tasks-${uniqueId}`,
      })
      .expect(201);
    orgId = orgRes.body.data.id;

    const wsRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspaces`)
      .set('Cookie', `flowspace_session=${tokenLead}`)
      .send({
        name: `WS Tasks ${uniqueId}`,
        slug: `ws-tasks-${uniqueId}`,
      })
      .expect(201);
    workspaceId = wsRes.body.data.id;

    // Create Project 1 (key: TASK)
    const proj1Res = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Cookie', `flowspace_session=${tokenLead}`)
      .send({
        name: 'Task Project 1',
        key: 'TASK',
      })
      .expect(201);
    projectId = proj1Res.body.data.id;

    // Create Project 2 (key: PROJ2) for isolation testing
    const proj2Res = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Cookie', `flowspace_session=${tokenLead}`)
      .send({
        name: 'Task Project 2',
        key: 'PROJ2',
      })
      .expect(201);
    project2Id = proj2Res.body.data.id;

    // Retrieve a status from Project 2
    const p2Statuses = await prisma.projectStatus.findMany({
      where: { projectId: project2Id },
    });
    otherStatusId = p2Statuses[0].id;

    // Add Member to workspace and Project 1 as MEMBER
    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: userMemberId,
        role: 'MEMBER',
      },
    });
    await prisma.projectMember.create({
      data: {
        projectId,
        userId: userMemberId,
        role: ProjectRole.MEMBER,
      },
    });

    // Add Viewer to workspace and Project 1 as VIEWER
    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: viewer.id,
        role: 'MEMBER',
      },
    });
    await prisma.projectMember.create({
      data: {
        projectId,
        userId: viewer.id,
        role: ProjectRole.VIEWER,
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.organization.deleteMany({
        where: { slug: { contains: `-tasks-${uniqueId}` } },
      });
      await prisma.user.deleteMany({
        where: { email: { contains: '-tasks.internal' } },
      });
      await prisma.$disconnect();
    }
    await app.close();
  });

  describe('POST /api/v1/projects/:projectId/tasks', () => {
    let firstTaskId: string;

    it('should create a task with required fields and verify default values (taskNumber: 1, default status, priority MEDIUM)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          title: 'Initialize repository architecture',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      const task = res.body.data;
      expect(task.id).toBeDefined();
      expect(task.taskNumber).toBe(1);
      expect(task.taskKey).toBe('TASK-1');
      expect(task.title).toBe('Initialize repository architecture');
      expect(task.priority).toBe(TaskPriority.MEDIUM);
      expect(task.version).toBe(1);
      expect(task.status.isDefault).toBe(true);
      expect(task.project.key).toBe('TASK');

      firstTaskId = task.id;
    });

    it('should automatically increment taskNumber for subsequent tasks in the same project', async () => {
      const res2 = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          title: 'Second task in project',
        })
        .expect(201);

      expect(res2.body.data.taskNumber).toBe(2);
      expect(res2.body.data.taskKey).toBe('TASK-2');

      const res3 = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          title: 'Third task in project',
        })
        .expect(201);

      expect(res3.body.data.taskNumber).toBe(3);
      expect(res3.body.data.taskKey).toBe('TASK-3');
    });

    it('should allow project MEMBER to create a task with explicit assignee, priority, and dates', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Cookie', `flowspace_session=${tokenMember}`)
        .send({
          title: 'Implement API documentation',
          description: 'Document endpoints with Swagger',
          priority: TaskPriority.HIGH,
          assigneeId: userMemberId,
          startDate: '2026-03-01',
          dueDate: '2026-03-10',
        })
        .expect(201);

      const task = res.body.data;
      expect(task.title).toBe('Implement API documentation');
      expect(task.description).toBe('Document endpoints with Swagger');
      expect(task.priority).toBe(TaskPriority.HIGH);
      expect(task.assignee.id).toBe(userMemberId);
      expect(task.startDate).toContain('2026-03-01');
      expect(task.dueDate).toContain('2026-03-10');
    });

    it('should create a subtask with parentTaskId pointing to an existing task in the project', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          title: 'Subtask: Write unit tests',
          parentTaskId: firstTaskId,
        })
        .expect(201);

      expect(res.body.data.parentTaskId).toBe(firstTaskId);
    });

    it('should reject creating a task with invalid status belonging to another project (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          title: 'Task with foreign status',
          statusId: otherStatusId,
        })
        .expect(400);

      expect(res.body.message).toContain('does not belong to this project');
    });

    it('should reject creating a subtask whose parentTaskId belongs to another project (400)', async () => {
      // Create task in Project 2
      const p2Task = await request(app.getHttpServer())
        .post(`/api/v1/projects/${project2Id}/tasks`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          title: 'Project 2 parent task',
        })
        .expect(201);

      // Attempt to use Project 2 task as parent in Project 1
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          title: 'Invalid subtask across projects',
          parentTaskId: p2Task.body.data.id,
        })
        .expect(400);

      expect(res.body.message).toContain('Parent task does not belong to this project');
    });

    it('should reject creating a task assigned to a user who is not in the workspace (400)', async () => {
      // outsider is not a workspace member
      const outsiderRecord = await prisma.user.findFirst({
        where: { email: userOutsider.email },
      });

      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          title: 'Task with outsider assignee',
          assigneeId: outsiderRecord!.id,
        })
        .expect(400);

      expect(res.body.message).toContain('Assignee must be a member of this workspace');
    });

    it('should reject creating a task with empty title (400)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Cookie', `flowspace_session=${tokenLead}`)
        .send({
          title: '',
        })
        .expect(400);
    });

    it('should reject creating a task by a VIEWER (403)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Cookie', `flowspace_session=${tokenViewer}`)
        .send({
          title: 'Viewer unauthorized attempt',
        })
        .expect(403);
    });

    it('should reject creating a task by an outsider (403)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Cookie', `flowspace_session=${tokenOutsider}`)
        .send({
          title: 'Outsider unauthorized attempt',
        })
        .expect(403);
    });

    it('should reject unauthenticated request (401)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/tasks`)
        .send({
          title: 'Unauthenticated task',
        })
        .expect(401);
    });
  });
});
