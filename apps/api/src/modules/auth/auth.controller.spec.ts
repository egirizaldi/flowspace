import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let sessionService: SessionService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  const mockSessionService = {
    getCookieName: jest.fn().mockReturnValue('flowspace_session'),
    setSessionCookie: jest.fn(),
    clearSessionCookie: jest.fn(),
    revokeSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    sessionService = module.get<SessionService>(SessionService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register user and return success envelope', async () => {
      const mockUser = { id: 'u1', name: 'User', email: 'u@flowspace.com' } as any;
      mockAuthService.register.mockResolvedValue(mockUser);

      const dto = { name: 'User', email: 'u@flowspace.com', password: 'Password123!' };
      const result = await controller.register(dto);

      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual({
        success: true,
        message: 'User registered successfully',
        data: mockUser,
      });
    });
  });

  describe('login', () => {
    it('should login user, set session cookie, and return success envelope', async () => {
      const mockUser = { id: 'u1', name: 'User', email: 'u@flowspace.com' } as any;
      mockAuthService.login.mockResolvedValue({ user: mockUser, rawToken: 'token123' });

      const mockReq = { headers: { 'user-agent': 'Chrome' }, ip: '127.0.0.1' } as any;
      const mockRes = {} as any;
      const dto = { email: 'u@flowspace.com', password: 'Password123!' };

      const result = await controller.login(dto, mockReq, mockRes);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto, 'Chrome', '127.0.0.1');
      expect(mockSessionService.setSessionCookie).toHaveBeenCalledWith(mockRes, 'token123');
      expect(result).toEqual({
        success: true,
        message: 'Login successful',
        data: mockUser,
      });
    });
  });

  describe('logout', () => {
    it('should revoke session and clear cookie when session cookie is present', async () => {
      const mockReq = { cookies: { flowspace_session: 'active-token-123' } } as any;
      const mockRes = {} as any;

      const result = await controller.logout(mockReq, mockRes);

      expect(mockSessionService.getCookieName).toHaveBeenCalled();
      expect(mockSessionService.revokeSession).toHaveBeenCalledWith('active-token-123');
      expect(mockSessionService.clearSessionCookie).toHaveBeenCalledWith(mockRes);
      expect(result).toEqual({
        success: true,
        message: 'Logged out successfully',
      });
    });

    it('should still clear cookie if request has no session cookie', async () => {
      const mockReq = { cookies: {} } as any;
      const mockRes = {} as any;

      const result = await controller.logout(mockReq, mockRes);

      expect(mockSessionService.revokeSession).not.toHaveBeenCalled();
      expect(mockSessionService.clearSessionCookie).toHaveBeenCalledWith(mockRes);
      expect(result).toEqual({
        success: true,
        message: 'Logged out successfully',
      });
    });
  });
});
