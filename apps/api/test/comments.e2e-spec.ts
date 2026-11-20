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

describe('Comment API (FS-042 e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const uniqueId = Date.now();

  const userOwner = {
    name: 'Comment Project Owner',
    email: `comment-owner-${uniqueId}@flowspace.internal`,
    password: 'Password123!',
  };

  const userMember = {
    name: 'Comment Project Member',
    email: `comment-member-${uniqueId}@flowspace.internal`,
    password: 'Password123!',
  };

  const userOutsider = {
    name: 'Comment Outsider',
    email: `comment-outsider-${uniqueId}@flowspace.internal`,
    password: 'Password123!',
  };

  let tokenOwner: string;
  let tokenMember: string;
  let tokenOutsider: string;
  let userOwnerId: string;
  let userMemberId: string;
  let userOutsiderId: string;
  let orgId: string;
  let workspaceId: string;
  let projectId: string;
  let statusId: string;
  let taskId: string;

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

    const memberRes = await setupUser(userMember);
    userMemberId = memberRes.id;
    tokenMember = memberRes.token;

    const outsiderRes = await setupUser(userOutsider);
    userOutsiderId = outsiderRes.id;
    tokenOutsider = outsiderRes.token;

    // Create Org & Workspace as Owner
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({ name: `Comment Org ${uniqueId}` })
      .expect(201);
    orgId = orgRes.body.data.id;

    const wsRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspaces`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({ name: `Comment WS ${uniqueId}` })
      .expect(201);
    workspaceId = wsRes.body.data.id;

    // Create Project
    const projRes = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({ name: 'Comment Project', key: `CM${uniqueId.toString().slice(-4)}` })
      .expect(201);
    projectId = projRes.body.data.id;

    // Add Member to Org and Workspace
    await prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId: userMemberId,
        role: 'MEMBER',
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspaceId,
        userId: userMemberId,
        role: 'MEMBER',
      },
    });

    // Add Member to Project
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({ userId: userMemberId, role: 'MEMBER' })
      .expect(201);

    // Retrieve default status
    const statusesRes = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/statuses`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .expect(200);
    statusId = statusesRes.body.data[0].id;

    // Create Task
    const taskRes = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Cookie', [`flowspace_session=${tokenOwner}`])
      .send({
        title: 'Task for Discussion',
        statusId,
        priority: 'MEDIUM',
      })
      .expect(201);
    taskId = taskRes.body.data.id;
  });

  afterAll(async () => {
    if (orgId) {
      await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
    }
    if (userOwnerId) {
      await prisma.user.delete({ where: { id: userOwnerId } }).catch(() => {});
    }
    if (userMemberId) {
      await prisma.user.delete({ where: { id: userMemberId } }).catch(() => {});
    }
    if (userOutsiderId) {
      await prisma.user.delete({ where: { id: userOutsiderId } }).catch(() => {});
    }
    await app.close();
  });

  describe('POST /api/v1/tasks/:taskId/comments', () => {
    it('should create comment as a project member', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Cookie', [`flowspace_session=${tokenMember}`])
        .send({ content: 'Member feedback: PR has been reviewed and tested.' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Comment created');
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.taskId).toBe(taskId);
      expect(res.body.data.userId).toBe(userMemberId);
      expect(res.body.data.content).toBe(
        'Member feedback: PR has been reviewed and tested.',
      );
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.name).toBe(userMember.name);
    });

    it('should reject empty or whitespace content with 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Cookie', [`flowspace_session=${tokenMember}`])
        .send({ content: '' })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Cookie', [`flowspace_session=${tokenMember}`])
        .send({})
        .expect(400);
    });

    it('should reject unauthorized outsider with 403', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Cookie', [`flowspace_session=${tokenOutsider}`])
        .send({ content: 'Intruder comment' })
        .expect(403);
    });

    it('should reject unauthenticated request with 401', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/tasks/${taskId}/comments`)
        .send({ content: 'Anonymous comment' })
        .expect(401);
    });

    it('should return 404 for non-existent task', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks/00000000-0000-0000-0000-000000000000/comments')
        .set('Cookie', [`flowspace_session=${tokenMember}`])
        .send({ content: 'Ghost comment' })
        .expect(404);
    });
  });

  describe('GET /api/v1/tasks/:taskId/comments', () => {
    let commentOwnerId: string;

    beforeAll(async () => {
      // Create a second comment by owner
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ content: 'Owner feedback: Approved for deployment.' })
        .expect(201);
      commentOwnerId = res.body.data.id;
    });

    it('should list comments in ascending chronological order', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}/comments`)
        .set('Cookie', [`flowspace_session=${tokenMember}`])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].content).toContain('Member feedback');
      expect(res.body.data[1].content).toContain('Owner feedback');
      expect(res.body.meta.total).toBe(2);
      expect(res.body.meta.page).toBe(1);
    });

    it('should support pagination limit and page', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}/comments?page=1&limit=1`)
        .set('Cookie', [`flowspace_session=${tokenMember}`])
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.meta.total).toBe(2);
      expect(res.body.meta.limit).toBe(1);
      expect(res.body.meta.totalPages).toBe(2);
    });

    it('should support descending sort', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}/comments?sort=desc`)
        .set('Cookie', [`flowspace_session=${tokenMember}`])
        .expect(200);

      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].content).toContain('Owner feedback');
    });

    it('should reject outsider with 403', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}/comments`)
        .set('Cookie', [`flowspace_session=${tokenOutsider}`])
        .expect(403);
    });
  });

  describe('PATCH /api/v1/tasks/:taskId/comments/:commentId', () => {
    let memberCommentId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Cookie', [`flowspace_session=${tokenMember}`])
        .send({ content: 'Original member comment' })
        .expect(201);
      memberCommentId = res.body.data.id;
    });

    it('should allow author to edit own comment', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskId}/comments/${memberCommentId}`)
        .set('Cookie', [`flowspace_session=${tokenMember}`])
        .send({ content: 'Author updated this comment' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('Author updated this comment');
    });

    it('should forbid other regular member from editing someone elses comment', async () => {
      // Create owner comment
      const ownerRes = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ content: 'Owner special note' })
        .expect(201);

      const ownerCommentId = ownerRes.body.data.id;

      // Member tries to edit owner's comment
      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskId}/comments/${ownerCommentId}`)
        .set('Cookie', [`flowspace_session=${tokenMember}`])
        .send({ content: 'Member trying to hijack owner note' })
        .expect(403);
    });

    it('should allow project owner/manager to edit another members comment for moderation', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskId}/comments/${memberCommentId}`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ content: 'Moderated by project owner' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('Moderated by project owner');
    });

    it('should return 404 for non-existent commentId', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/tasks/' + taskId + '/comments/00000000-0000-0000-0000-000000000000')
        .set('Cookie', [`flowspace_session=${tokenMember}`])
        .send({ content: 'Update ghost' })
        .expect(404);
    });
  });

  describe('DELETE /api/v1/tasks/:taskId/comments/:commentId', () => {
    let commentToDeleteId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Cookie', [`flowspace_session=${tokenMember}`])
        .send({ content: 'Comment to be deleted' })
        .expect(201);
      commentToDeleteId = res.body.data.id;
    });

    it('should forbid non-author member from deleting comment', async () => {
      // Create a comment by owner
      const ownerRes = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .send({ content: 'Owner comment for delete test' })
        .expect(201);

      // Regular member tries to delete owner comment
      await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${taskId}/comments/${ownerRes.body.data.id}`)
        .set('Cookie', [`flowspace_session=${tokenMember}`])
        .expect(403);
    });

    it('should allow author to soft-delete own comment', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${taskId}/comments/${commentToDeleteId}`)
        .set('Cookie', [`flowspace_session=${tokenMember}`])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('deleted successfully');

      // Verify excluded from subsequent GET
      const getRes = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}/comments`)
        .set('Cookie', [`flowspace_session=${tokenMember}`])
        .expect(200);

      expect(
        getRes.body.data.some((c: any) => c.id === commentToDeleteId),
      ).toBe(false);

      // Verify cannot delete or patch already soft-deleted comment
      await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${taskId}/comments/${commentToDeleteId}`)
        .set('Cookie', [`flowspace_session=${tokenMember}`])
        .expect(404);
    });

    it('should allow project manager/owner to delete any comment', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${taskId}/comments/${commentToDeleteId}`)
        .set('Cookie', [`flowspace_session=${tokenOwner}`])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('deleted successfully');
    });
  });
});
