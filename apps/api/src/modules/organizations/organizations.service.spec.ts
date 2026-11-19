import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../../database/prisma.service';
import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { OrganizationRole } from '@prisma/client';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    organization: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    organizationMember: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSlug', () => {
    it('should convert name into kebab-case lowercase slug', () => {
      expect(service.generateSlug('Acme & Sons Software Inc!')).toBe('acme-sons-software-inc');
      expect(service.generateSlug('  Multiple   Spaces  ')).toBe('multiple-spaces');
      expect(service.generateSlug('FlowSpace')).toBe('flowspace');
      expect(service.generateSlug('!@#$%')).toBe('org');
    });
  });

  describe('create', () => {
    it('should throw ConflictException if slug already exists', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({ id: 'org-1' });

      await expect(
        service.create('user-1', { name: 'Acme', slug: 'acme' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create organization and auto-create OWNER membership in transaction', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      const mockOrg = {
        id: 'org-1',
        name: 'Acme Corp',
        slug: 'acme-corp',
        description: null,
        logoUrl: null,
        createdBy: 'user-1',
      };
      const mockMember = {
        id: 'mem-1',
        organizationId: 'org-1',
        userId: 'user-1',
        role: OrganizationRole.OWNER,
      };

      mockPrismaService.organization.create.mockResolvedValue(mockOrg);
      mockPrismaService.organizationMember.create.mockResolvedValue(mockMember);

      const result = await service.create('user-1', { name: 'Acme Corp' });

      expect(mockPrismaService.organization.create).toHaveBeenCalledWith({
        data: {
          name: 'Acme Corp',
          slug: 'acme-corp',
          description: null,
          logoUrl: null,
          createdBy: 'user-1',
        },
      });
      expect(mockPrismaService.organizationMember.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          userId: 'user-1',
          role: OrganizationRole.OWNER,
        },
      });
      expect(result).toEqual({
        ...mockOrg,
        members: [mockMember],
      });
    });
  });

  describe('addMember', () => {
    it('should throw ConflictException if user is already a member', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({ id: 'mem-1' });

      await expect(
        service.addMember('org-1', 'user-2', OrganizationRole.MEMBER),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if organization does not exist', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.addMember('org-1', 'user-2', OrganizationRole.MEMBER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully add a member', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);
      mockPrismaService.organization.findUnique.mockResolvedValue({ id: 'org-1' });
      mockPrismaService.organizationMember.create.mockResolvedValue({
        id: 'mem-2',
        organizationId: 'org-1',
        userId: 'user-2',
        role: OrganizationRole.MEMBER,
      });

      const member = await service.addMember('org-1', 'user-2', OrganizationRole.MEMBER);

      expect(member.userId).toBe('user-2');
      expect(member.role).toBe(OrganizationRole.MEMBER);
    });
  });

  describe('listUserOrganizations', () => {
    it('should return organizations with user role attached', async () => {
      const mockMemberships = [
        {
          id: 'mem-1',
          role: OrganizationRole.OWNER,
          joinedAt: new Date('2026-01-01'),
          organization: {
            id: 'org-1',
            name: 'Org One',
            _count: { members: 3, workspaces: 2 },
          },
        },
      ];

      mockPrismaService.organizationMember.findMany.mockResolvedValue(mockMemberships);

      const result = await service.listUserOrganizations('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('org-1');
      expect(result[0].userRole).toBe(OrganizationRole.OWNER);
      expect(result[0]._count.members).toBe(3);
    });
  });

  describe('findByIdForUser', () => {
    it('should throw ForbiddenException if user is not a member of the organization', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);

      await expect(service.findByIdForUser('org-1', 'non-member')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return organization detail with member role if user is a member', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'mem-1',
        role: OrganizationRole.ADMIN,
      });
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        name: 'Acme',
        members: [{ id: 'mem-1', user: { name: 'Admin' } }],
        _count: { members: 1, workspaces: 0 },
      });

      const result = await service.findByIdForUser('org-1', 'user-1');

      expect(result.id).toBe('org-1');
      expect(result.currentUserRole).toBe(OrganizationRole.ADMIN);
    });
  });

  describe('update', () => {
    it('should throw ForbiddenException if user is not a member', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.update('org-1', 'outsider', { name: 'New Name' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user is only a MEMBER', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'mem-1',
        role: OrganizationRole.MEMBER,
      });

      await expect(
        service.update('org-1', 'member-1', { name: 'New Name' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow update if user is ADMIN or OWNER', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'mem-1',
        role: OrganizationRole.ADMIN,
      });
      mockPrismaService.organization.update.mockResolvedValue({
        id: 'org-1',
        name: 'Updated Name',
      });

      const result = await service.update('org-1', 'admin-1', { name: 'Updated Name' });

      expect(mockPrismaService.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { name: 'Updated Name', description: undefined, logoUrl: undefined },
      });
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('delete', () => {
    it('should throw ForbiddenException if user is not OWNER (e.g. ADMIN)', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'mem-1',
        role: OrganizationRole.ADMIN,
      });

      await expect(service.delete('org-1', 'admin-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should delete organization if user is OWNER', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'mem-1',
        role: OrganizationRole.OWNER,
      });
      mockPrismaService.organization.delete.mockResolvedValue({ id: 'org-1' });

      const result = await service.delete('org-1', 'owner-1');

      expect(mockPrismaService.organization.delete).toHaveBeenCalledWith({
        where: { id: 'org-1' },
      });
      expect(result).toBe(true);
    });
  });
});
