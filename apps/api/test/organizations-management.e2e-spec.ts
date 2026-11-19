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
import { OrganizationRole } from '@prisma/client';

describe('Organization Management API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const uniqueId = Date.now();

  const userA = {
    name: 'User A',
    email: `usera-${uniqueId}@flowspace-mgmt.internal`,
    password: 'Password123!',
  };

  const userB = {
    name: 'User B',
    email: `userb-${uniqueId}@flowspace-mgmt.internal`,
    password: 'Password123!',
  };

  const userC = {
    name: 'User C',
    email: `userc-${uniqueId}@flowspace-mgmt.internal`,
    password: 'Password123!',
  };

  let tokenA: string;
  let tokenB: string;
  let tokenC: string;
  let orgAId: string;
  let orgBId: string;

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
      const sessionCookie = cookies.find((c: string) => c.startsWith('flowspace_session='));
      return sessionCookie.split(';')[0].split('=')[1];
    };

    tokenA = await setupUser(userA);
    tokenB = await setupUser(userB);
    tokenC = await setupUser(userC);

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

    // Add User C to Org B as regular MEMBER
    const dbUserC = await prisma.user.findUnique({ where: { email: userC.email } });
    await prisma.organizationMember.create({
      data: {
        organizationId: orgBId,
        userId: dbUserC!.id,
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
        where: { email: { contains: '-mgmt.internal' } },
      });
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/v1/organizations', () => {
    it('should list only organizations the authenticated user belongs to', async () => {
      // User A should only see Org A
      const resA = await request(app.getHttpServer())
        .get('/api/v1/organizations')
        .set('Cookie', `flowspace_session=${tokenA}`)
        .expect(200);

      expect(resA.body.data).toHaveLength(1);
      expect(resA.body.data[0].id).toBe(orgAId);
      expect(resA.body.data[0].userRole).toBe(OrganizationRole.OWNER);

      // User C should only see Org B as MEMBER
      const resC = await request(app.getHttpServer())
        .get('/api/v1/organizations')
        .set('Cookie', `flowspace_session=${tokenC}`)
        .expect(200);

      expect(resC.body.data).toHaveLength(1);
      expect(resC.body.data[0].id).toBe(orgBId);
      expect(resC.body.data[0].userRole).toBe(OrganizationRole.MEMBER);
    });
  });

  describe('GET /api/v1/organizations/:organizationId', () => {
    it('should allow member to view organization details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${orgAId}`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(orgAId);
      expect(res.body.data.currentUserRole).toBe(OrganizationRole.OWNER);
      expect(res.body.data._count.members).toBe(1);
    });

    it('should reject access to organization if user is not a member (multi-tenant boundary)', async () => {
      // User A attempts to view Org B
      const res = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${orgBId}`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('do not have access');
    });
  });

  describe('PATCH /api/v1/organizations/:organizationId', () => {
    it('should reject update if user is not a member', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/organizations/${orgBId}`)
        .set('Cookie', `flowspace_session=${tokenA}`)
        .send({ name: 'Hacked Name' })
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should reject update if user has role MEMBER (insufficient permissions)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/organizations/${orgBId}`)
        .set('Cookie', `flowspace_session=${tokenC}`)
        .send({ name: 'Member Attempted Name' })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('owners and admins');
    });

    it('should allow update when user is OWNER', async () => {
      const updatedName = `Updated Org B ${uniqueId}`;
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/organizations/${orgBId}`)
        .set('Cookie', `flowspace_session=${tokenB}`)
        .send({ name: updatedName, description: 'Updated description' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(updatedName);
      expect(res.body.data.description).toBe('Updated description');

      // Verify DB persistence
      const dbOrg = await prisma.organization.findUnique({ where: { id: orgBId } });
      expect(dbOrg!.name).toBe(updatedName);
    });
  });

  describe('DELETE /api/v1/organizations/:organizationId', () => {
    it('should reject delete if user is not OWNER (e.g. MEMBER)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/organizations/${orgBId}`)
        .set('Cookie', `flowspace_session=${tokenC}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('owner can delete');
    });

    it('should allow OWNER to delete organization', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/organizations/${orgBId}`)
        .set('Cookie', `flowspace_session=${tokenB}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Organization deleted successfully');

      // Verify deleted in DB
      const dbOrg = await prisma.organization.findUnique({ where: { id: orgBId } });
      expect(dbOrg).toBeNull();
    });
  });
});
