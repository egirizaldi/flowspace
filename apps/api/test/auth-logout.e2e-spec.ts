import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as supertest from 'supertest';
const request = (supertest as any).default || supertest;
import * as cookieParser from 'cookie-parser';
const cookieMiddleware = (cookieParser as any).default || cookieParser;
import * as crypto from 'crypto';
import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';

describe('Auth Logout API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const uniqueId = Date.now();
  const testUser = {
    name: 'Logout Test User',
    email: `logout-${uniqueId}@flowspace-test.internal`,
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

    // Register user first via register endpoint
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(201);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: { email: { contains: 'logout-' } },
      });
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should revoke session in database and clear session cookie', async () => {
      // 1. Log in to get session cookie
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const loginCookies = loginRes.headers['set-cookie'];
      expect(loginCookies).toBeDefined();
      const sessionCookie = loginCookies.find((c: string) => c.startsWith('flowspace_session='));
      expect(sessionCookie).toBeDefined();

      const rawToken = sessionCookie.split(';')[0].split('=')[1];
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      // Verify session exists and is active in DB
      const dbSessionBefore = await prisma.session.findUnique({
        where: { tokenHash },
      });
      expect(dbSessionBefore).not.toBeNull();
      expect(dbSessionBefore!.revokedAt).toBeNull();

      // 2. Call logout with the cookie
      const logoutRes = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', `flowspace_session=${rawToken}`)
        .expect(200);

      expect(logoutRes.body).toHaveProperty('success', true);
      expect(logoutRes.body).toHaveProperty('message', 'Logged out successfully');

      // 3. Verify Set-Cookie header clears the cookie
      const logoutCookies = logoutRes.headers['set-cookie'];
      expect(logoutCookies).toBeDefined();
      const clearedCookie = logoutCookies.find((c: string) => c.startsWith('flowspace_session='));
      expect(clearedCookie).toBeDefined();
      // Should be expired or max-age=0 / empty value
      expect(clearedCookie).toMatch(/(Expires=Thu, 01 Jan 1970|Max-Age=0|flowspace_session=;)/);

      // 4. Verify session is revoked in DB
      const dbSessionAfter = await prisma.session.findUnique({
        where: { tokenHash },
      });
      expect(dbSessionAfter).not.toBeNull();
      expect(dbSessionAfter!.revokedAt).not.toBeNull();
    });

    it('should return 200 and clear cookie even if no session cookie was provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Logged out successfully');

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const clearedCookie = cookies.find((c: string) => c.startsWith('flowspace_session='));
      expect(clearedCookie).toBeDefined();
      expect(clearedCookie).toMatch(/(Expires=Thu, 01 Jan 1970|Max-Age=0|flowspace_session=;)/);
    });
  });
});
