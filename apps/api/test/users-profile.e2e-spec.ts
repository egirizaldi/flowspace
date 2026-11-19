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

describe('Users Profile API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const uniqueId = Date.now();
  const testUser = {
    name: 'Profile Initial User',
    email: `profile-${uniqueId}@flowspace-test.internal`,
    password: 'SuperSecurePassword123!',
  };

  let sessionCookie: string;
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
    sessionCookie = cookies.find((c: string) => c.startsWith('flowspace_session='));
    rawToken = sessionCookie.split(';')[0].split('=')[1];
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: { email: { contains: 'profile-' } },
      });
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/v1/users/me', () => {
    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Authentication required');
    });

    it('should return user profile when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Cookie', `flowspace_session=${rawToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'User profile retrieved successfully');
      expect(response.body.data.email).toBe(testUser.email.toLowerCase());
      expect(response.body.data.name).toBe(testUser.name);
      expect(response.body.data).not.toHaveProperty('passwordHash');
    });
  });

  describe('PATCH /api/v1/users/me', () => {
    it('should reject unauthenticated update request with 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .send({ name: 'Hacker Attempt' })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should update name and avatarUrl and persist to database', async () => {
      const updatePayload = {
        name: 'Profile Updated Name',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
      };

      const response = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Cookie', `flowspace_session=${rawToken}`)
        .send(updatePayload)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'User profile updated successfully');
      expect(response.body.data.name).toBe(updatePayload.name);
      expect(response.body.data.avatarUrl).toBe(updatePayload.avatarUrl);
      expect(response.body.data).not.toHaveProperty('passwordHash');

      // Verify directly in PostgreSQL via Prisma
      const dbUser = await prisma.user.findUnique({
        where: { email: testUser.email.toLowerCase() },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser!.name).toBe(updatePayload.name);
      expect(dbUser!.avatarUrl).toBe(updatePayload.avatarUrl);
      expect(dbUser!.passwordHash).toContain('$argon2id$');
    });

    it('should reject invalid avatar URL with 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Cookie', `flowspace_session=${rawToken}`)
        .send({ avatarUrl: 'not-a-valid-url' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should reject short name with 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Cookie', `flowspace_session=${rawToken}`)
        .send({ name: 'A' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });
});
