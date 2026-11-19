import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';
import { SessionService } from '../../modules/auth/session.service';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let sessionService: SessionService;
  let reflector: Reflector;

  const mockSessionService = {
    getCookieName: jest.fn().mockReturnValue('flowspace_session'),
    validateSession: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: SessionService, useValue: mockSessionService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    sessionService = module.get<SessionService>(SessionService);
    reflector = module.get<Reflector>(Reflector);
    jest.clearAllMocks();
  });

  const createMockContext = (req: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as any;

  it('should allow access if route is decorated with @Public()', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext({});

    const canActivate = await guard.canActivate(context);

    expect(canActivate).toBe(true);
    expect(mockSessionService.validateSession).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException if no cookie or authorization header is present', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const req = { cookies: {}, headers: {} };
    const context = createMockContext(req);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Authentication required'),
    );
  });

  it('should throw UnauthorizedException if session is invalid or expired', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockSessionService.validateSession.mockResolvedValue(null);
    const req = {
      cookies: { flowspace_session: 'invalid-token' },
      headers: {},
    };
    const context = createMockContext(req);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid or expired session'),
    );
    expect(mockSessionService.validateSession).toHaveBeenCalledWith('invalid-token');
  });

  it('should authenticate and attach user and session when cookie is valid', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const mockUser = { id: 'u1', email: 'test@flowspace.com', name: 'Tester' };
    const mockSession = { id: 's1', userId: 'u1' };
    mockSessionService.validateSession.mockResolvedValue({
      user: mockUser,
      session: mockSession,
    });

    const req: any = {
      cookies: { flowspace_session: 'valid-token' },
      headers: {},
    };
    const context = createMockContext(req);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(req.user).toEqual(mockUser);
    expect(req.session).toEqual(mockSession);
  });

  it('should authenticate when Bearer authorization header is provided', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const mockUser = { id: 'u2', email: 'bearer@flowspace.com', name: 'Bearer User' };
    const mockSession = { id: 's2', userId: 'u2' };
    mockSessionService.validateSession.mockResolvedValue({
      user: mockUser,
      session: mockSession,
    });

    const req: any = {
      cookies: {},
      headers: { authorization: 'Bearer header-token-123' },
    };
    const context = createMockContext(req);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockSessionService.validateSession).toHaveBeenCalledWith('header-token-123');
    expect(req.user).toEqual(mockUser);
    expect(req.session).toEqual(mockSession);
  });
});
