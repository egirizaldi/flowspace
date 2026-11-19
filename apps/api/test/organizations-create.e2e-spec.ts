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

describe('Create Organization API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const uniqueId = Date.now();
  const testUser = {
    name: 'Org Creator User',
    email: `org-creator-${uniqueId}@flowspace-test.internal`,
    password: 'SuperSecurePassword123!',
  };

  let rawToken: string;

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

    // 1. Register test user
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(201);

    // 2. Log in to get session cookie
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      })
      .expect(200);

    const cookies = loginRes.headers['set-cookie'];
    const sessionCookie = cookies.find((c: string) => c.startsWith('flowspace_session='));
    rawToken = sessionCookie.split(';')[0].split('=')[1];
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.organization.deleteMany({
        where: { slug: { contains: `test-org-${uniqueId}` } },
      });
      await prisma.user.deleteMany({
        where: { email: { contains: 'org-creator-' } },
      });
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/v1/organizations', () => {
    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/organizations')
        .send({ name: 'Unauthorized Corp' })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Authentication required');
    });

    it('should create organization, auto-generate slug, and assign creator as OWNER', async () => {
      const payload = {
        name: `Test Org ${uniqueId}`,
        description: 'A test organization for e2e validation',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/organizations')
        .set('Cookie', `flowspace_session=${rawToken}`)
        .send(payload)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Organization created successfully');
      expect(response.body.data.name).toBe(payload.name);
      expect(response.body.data.slug).toBe(`test-org-${uniqueId}`);
      expect(response.body.data.members).toBeDefined();
      expect(response.body.data.members[0].role).toBe(OrganizationRole.OWNER);

      // Verify directly in PostgreSQL
      const dbOrg = await prisma.organization.findUnique({
        where: { id: response.body.data.id },
        include: { members: true },
      });
      expect(dbOrg).not.toBeNull();
      expect(dbOrg!.members).toHaveLength(1);
      expect(dbOrg!.members[0].role).toBe(OrganizationRole.OWNER);
    });

    it('should return 409 Conflict when creating organization with existing slug', async () => {
      const duplicateSlug = `test-org-${uniqueId}-existing`;

      // Create first organization
      await request(app.getHttpServer())
        .post('/api/v1/organizations')
        .set('Cookie', `flowspace_session=${rawToken}`)
        .send({
          name: 'First Organization',
          slug: duplicateSlug,
        })
        .expect(201);

      // Attempt duplicate slug
      const duplicateRes = await request(app.getHttpServer())
        .post('/api/v1/organizations')
        .set('Cookie', `flowspace_session=${rawToken}`)
        .send({
          name: 'Second Organization Duplicate',
          slug: duplicateSlug,
        })
        .expect(409);

      expect(duplicateRes.body).toHaveProperty('success', false);
      expect(duplicateRes.body.message).toContain('already exists');
    });

    it('should return 400 Bad Request when validation fails', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/organizations')
        .set('Cookie', `flowspace_session=${rawToken}`)
        .send({
          name: '', // Empty name violates minLength 2
          slug: 'INVALID SLUG WITH SPACES AND UPPERCASE',
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(Array.isArray(response.body.error.details)).toBe(true);
    });
  });
});
