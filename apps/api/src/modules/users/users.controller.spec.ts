import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SessionService } from '../auth/session.service';
import { Reflector } from '@nestjs/core';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockUsersService = {
    update: jest.fn(),
  };

  const mockSessionService = {
    getCookieName: jest.fn().mockReturnValue('flowspace_session'),
    validateSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: SessionService, useValue: mockSessionService },
        Reflector,
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return current user profile from @CurrentUser', async () => {
      const mockUser = {
        id: 'u-123',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
      } as any;

      const result = await controller.getProfile(mockUser);

      expect(result).toEqual({
        success: true,
        message: 'User profile retrieved successfully',
        data: mockUser,
      });
    });
  });

  describe('updateProfile', () => {
    it('should update user profile and return sanitized user without passwordHash', async () => {
      const updatedUserFromDb = {
        id: 'u-123',
        name: 'Ada King Lovelace',
        email: 'ada@example.com',
        passwordHash: '$argon2id$secret',
        avatarUrl: 'https://example.com/avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.update.mockResolvedValue(updatedUserFromDb);

      const dto = {
        name: 'Ada King Lovelace',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      const result = await controller.updateProfile('u-123', dto);

      expect(mockUsersService.update).toHaveBeenCalledWith('u-123', {
        name: 'Ada King Lovelace',
        avatarUrl: 'https://example.com/avatar.jpg',
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('User profile updated successfully');
      expect(result.data.name).toBe('Ada King Lovelace');
      expect(result.data.avatarUrl).toBe('https://example.com/avatar.jpg');
      expect((result.data as any).passwordHash).toBeUndefined();
    });
  });
});
