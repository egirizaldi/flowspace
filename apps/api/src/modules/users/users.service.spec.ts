import { Test, TestingModule } from '@nestjs/testing';
import { UsersService, sanitizeUser } from './users.service';
import { PrismaService } from '../../database/prisma.service';
import { ConflictException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockUser = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    email: 'dev@flowspace.com',
    name: 'Dev User',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$somehash',
    avatarUrl: null,
    emailVerifiedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user with trimmed lowercased email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.create({
        email: '  DEV@FLOWSPACE.COM ',
        name: '  Dev User  ',
        passwordHash: '$argon2id$somehash',
      });

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'dev@flowspace.com' },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'dev@flowspace.com',
          name: 'Dev User',
          passwordHash: '$argon2id$somehash',
          avatarUrl: null,
          emailVerifiedAt: null,
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if email is already registered', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.create({
          email: 'dev@flowspace.com',
          name: 'Duplicate',
          passwordHash: 'hash',
        }),
      ).rejects.toThrow(ConflictException);

      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should query user with lowercased email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('DEV@flowspace.com');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'dev@flowspace.com' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('sanitizeUser', () => {
    it('should strip passwordHash from user object', () => {
      const sanitized = sanitizeUser(mockUser);
      expect(sanitized).not.toHaveProperty('passwordHash');
      expect(sanitized.email).toBe(mockUser.email);
      expect(sanitized.id).toBe(mockUser.id);
    });
  });
});
