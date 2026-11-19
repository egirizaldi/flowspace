import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { UsersService } from '../users/users.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

describe('AuthService & PasswordService', () => {
  let authService: AuthService;
  let passwordService: PasswordService;
  let usersService: UsersService;
  let sessionService: SessionService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockSessionService = {
    createSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        PasswordService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    passwordService = module.get<PasswordService>(PasswordService);
    usersService = module.get<UsersService>(UsersService);
    sessionService = module.get<SessionService>(SessionService);
    jest.clearAllMocks();
  });

  describe('PasswordService', () => {
    it('should hash password with argon2id and verify correctly', async () => {
      const password = 'SecurePassword123!';
      const hash = await passwordService.hash(password);

      expect(hash).toContain('$argon2id$');
      expect(await passwordService.verify(hash, password)).toBe(true);
      expect(await passwordService.verify(hash, 'WrongPassword123!')).toBe(false);
    });
  });

  describe('AuthService.register', () => {
    const registerDto = {
      name: 'Alice Developer',
      email: 'alice@flowspace.com',
      password: 'StrongPassword123!',
    };

    it('should hash password and create sanitized user', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockImplementation(async (data) => ({
        id: '11111111-1111-1111-1111-111111111111',
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        avatarUrl: null,
        emailVerifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }));

      const result = await authService.register(registerDto);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: registerDto.email,
          name: registerDto.name,
          passwordHash: expect.stringContaining('$argon2id$'),
        }),
      );
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.email).toBe(registerDto.email);
      expect(result.id).toBe('11111111-1111-1111-1111-111111111111');
    });

    it('should throw ConflictException if user already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'existing-id' });

      await expect(authService.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });
  });

  describe('AuthService.login', () => {
    const loginDto = {
      email: 'alice@flowspace.com',
      password: 'StrongPassword123!',
    };

    it('should authenticate user with valid password and return session token', async () => {
      const passwordHash = await passwordService.hash(loginDto.password);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-123',
        name: 'Alice',
        email: loginDto.email,
        passwordHash,
      });
      mockSessionService.createSession.mockResolvedValue({
        rawToken: 'mock-raw-token-12345',
        session: { id: 'sess-1' },
      });

      const result = await authService.login(loginDto, 'Agent', '127.0.0.1');

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(mockSessionService.createSession).toHaveBeenCalledWith('user-123', 'Agent', '127.0.0.1');
      expect(result.rawToken).toBe('mock-raw-token-12345');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-123',
        email: loginDto.email,
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$wronghash',
      });

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
