import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('SessionService', () => {
  let service: SessionService;
  let prisma: PrismaService;

  const mockPrisma = {
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      if (key === 'session.cookieName') return 'flowspace_session';
      if (key === 'nodeEnv') return 'test';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('token hashing & generation', () => {
    it('should generate 64-char hex raw token', () => {
      const token = service.generateRawToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64);
    });

    it('should hash token to sha256 hex digest', () => {
      const hash1 = service.hashToken('my-secret-token');
      const hash2 = service.hashToken('my-secret-token');
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });
  });

  describe('createSession', () => {
    it('should store tokenHash and return rawToken with expiration', async () => {
      const userId = '11111111-1111-1111-1111-111111111111';
      mockPrisma.session.create.mockImplementation(async ({ data }) => ({
        id: 'sess-id',
        ...data,
        createdAt: new Date(),
        lastUsedAt: null,
        revokedAt: null,
      }));

      const result = await service.createSession(userId, 'Chrome', '127.0.0.1');

      expect(result.rawToken).toBeDefined();
      expect(result.rawToken.length).toBe(64);
      expect(mockPrisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          tokenHash: service.hashToken(result.rawToken),
          userAgent: 'Chrome',
          ipAddress: '127.0.0.1',
        }),
      });
      // Verify rawToken is NEVER stored in database object
      expect(mockPrisma.session.create).not.toHaveBeenCalledWith({
        data: expect.objectContaining({ rawToken: result.rawToken }),
      });
    });
  });

  describe('validateSession', () => {
    it('should return null if token is empty', async () => {
      const result = await service.validateSession('');
      expect(result).toBeNull();
      expect(mockPrisma.session.findUnique).not.toHaveBeenCalled();
    });

    it('should return null if session is expired', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'sess-id',
        expiresAt: new Date(Date.now() - 1000), // expired
        revokedAt: null,
        user: { id: 'user-id', name: 'User', email: 'u@example.com', passwordHash: 'hash' },
      });

      const result = await service.validateSession('token123');
      expect(result).toBeNull();
    });

    it('should return null if session is revoked', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'sess-id',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: new Date(),
        user: { id: 'user-id', name: 'User', email: 'u@example.com', passwordHash: 'hash' },
      });

      const result = await service.validateSession('token123');
      expect(result).toBeNull();
    });

    it('should return sanitized user and session when valid', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'sess-id',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
        user: { id: 'user-id', name: 'User', email: 'u@example.com', passwordHash: 'hash' },
      });
      mockPrisma.session.update.mockResolvedValue({});

      const result = await service.validateSession('valid-token');
      expect(result).not.toBeNull();
      expect(result!.user).not.toHaveProperty('passwordHash');
      expect(result!.user.email).toBe('u@example.com');
    });
  });

  describe('cookie helpers', () => {
    it('should set httpOnly cookie with maxAge', () => {
      const mockRes = { cookie: jest.fn() } as any;
      service.setSessionCookie(mockRes, 'raw-session-token');

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'flowspace_session',
        'raw-session-token',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }),
      );
    });

    it('should clear cookie with same options', () => {
      const mockRes = { clearCookie: jest.fn() } as any;
      service.clearSessionCookie(mockRes);

      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        'flowspace_session',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
        }),
      );
    });
  });
});
