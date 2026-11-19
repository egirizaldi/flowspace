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

describe('Auth Me API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const uniqueId = Date.now();
  const testUser = {
    name: 'Me Profile Test User',
    email: `me-${uniqueId}@flowspace-test.internal`,
    password: 'SuperSecurePassword123!',
  };

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

    // Register test user
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(201);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: { email: { contains: 'me-' } },
      });
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/v1/auth/me', () => {
    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Authentication required');
    });

    it('should reject request with invalid cookie with 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', 'flowspace_session=invalid-token-value')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Invalid or expired session');
    });

    it('should return safe user profile when authenticated via cookie', async () => {
      // 1. Log in to get session cookie
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const loginCookies = loginRes.headers['set-cookie'];
      const sessionCookie = loginCookies.find((c: string) => c.startsWith('flowspace_session='));
      const rawToken = sessionCookie.split(';')[0].split('=')[1];

      // 2. Access /api/v1/auth/me with cookie
      const meRes = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', `flowspace_session=${rawToken}`)
        .expect(200);

      expect(meRes.body).toHaveProperty('success', true);
      expect(meRes.body).toHaveProperty('message', 'User profile retrieved successfully');
      expect(meRes.body.data).toHaveProperty('id');
      expect(meRes.body.data.email).toBe(testUser.email.toLowerCase());
      expect(meRes.body.data.name).toBe(testUser.name);
      expect(meRes.body.data).not.toHaveProperty('passwordHash');
    });

    it('should return safe user profile when authenticated via Bearer token', async () => {
      // 1. Log in to get session cookie
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const loginCookies = loginRes.headers['set-cookie'];
      const sessionCookie = loginCookies.find((c: string) => c.startsWith('flowspace_session='));
      const rawToken = sessionCookie.split(';')[0].split('=')[1];

      // 2. Access /api/v1/auth/me with Authorization: Bearer
      const meRes = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${rawToken}`)
        .expect(200);

      expect(meRes.body).toHaveProperty('success', true);
      expect(meRes.body.data.email).toBe(testUser.email.toLowerCase());
      expect(meRes.body.data).not.toHaveProperty('passwordHash');
    });

    it('should reject request after session has been logged out (revoked)', async () => {
      // 1. Log in
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const loginCookies = loginRes.headers['set-cookie'];
      const sessionCookie = loginCookies.find((c: string) => c.startsWith('flowspace_session='));
      const rawToken = sessionCookie.split(';')[0].split('=')[1];

      // 2. Verify active session can access /me
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', `flowspace_session=${rawToken}`)
        .expect(200);

      // 3. Log out to revoke session
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', `flowspace_session=${rawToken}`)
        .expect(200);

      // 4. Try to access /me with revoked session token -> 401
      const meAfterLogout = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', `flowspace_session=${rawToken}`)
        .expect(401);

      expect(meAfterLogout.body).toHaveProperty('success', false);
      expect(meAfterLogout.body).toHaveProperty('message', 'Invalid or expired session');
    });
  });
});
