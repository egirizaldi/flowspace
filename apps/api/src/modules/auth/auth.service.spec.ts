import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { UsersService } from '../users/users.service';
import { ConflictException } from '@nestjs/common';

describe('AuthService & PasswordService', () => {
  let authService: AuthService;
  let passwordService: PasswordService;
  let usersService: UsersService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
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
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    passwordService = module.get<PasswordService>(PasswordService);
    usersService = module.get<UsersService>(UsersService);
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
});
