import { Test, TestingModule } from '@nestjs/testing';
import { WorkspacesService } from './workspaces.service';
import { PrismaService } from '../../database/prisma.service';
import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';

describe('WorkspacesService', () => {
  let service: WorkspacesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    organization: {
      findUnique: jest.fn(),
    },
    organizationMember: {
      findUnique: jest.fn(),
    },
    workspace: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    workspaceMember: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<WorkspacesService>(WorkspacesService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSlug', () => {
    it('should format workspace name to slug', () => {
      expect(service.generateSlug('Engineering & Product')).toBe('engineering-product');
      expect(service.generateSlug('  Web App  ')).toBe('web-app');
    });
  });

  describe('create', () => {
    it('should throw NotFoundException if organization does not exist', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.create('org-1', 'user-1', { name: 'Engineering' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not an organization member', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({ id: 'org-1' });
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.create('org-1', 'user-1', { name: 'Engineering' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if workspace slug already exists in organization', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({ id: 'org-1' });
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({ id: 'mem-1' });
      mockPrismaService.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });

      await expect(
        service.create('org-1', 'user-1', { name: 'Engineering', slug: 'eng' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create workspace and auto-assign creator as OWNER in transaction', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({ id: 'org-1' });
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({ id: 'mem-1' });
      mockPrismaService.workspace.findUnique.mockResolvedValue(null);

      const mockWorkspace = {
        id: 'ws-1',
        organizationId: 'org-1',
        name: 'Engineering',
        slug: 'engineering',
        description: null,
        createdBy: 'user-1',
      };
      const mockMember = {
        id: 'wm-1',
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: WorkspaceRole.OWNER,
      };

      mockPrismaService.workspace.create.mockResolvedValue(mockWorkspace);
      mockPrismaService.workspaceMember.create.mockResolvedValue(mockMember);

      const result = await service.create('org-1', 'user-1', { name: 'Engineering' });

      expect(mockPrismaService.workspace.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          name: 'Engineering',
          slug: 'engineering',
          description: null,
          createdBy: 'user-1',
        },
      });
      expect(mockPrismaService.workspaceMember.create).toHaveBeenCalledWith({
        data: {
          workspaceId: 'ws-1',
          userId: 'user-1',
          role: WorkspaceRole.OWNER,
        },
      });
      expect(result).toEqual({
        ...mockWorkspace,
        members: [mockMember],
      });
    });
  });

  describe('addMember', () => {
    it('should throw ConflictException if user is already a workspace member', async () => {
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue({ id: 'wm-1' });

      await expect(
        service.addMember('ws-1', 'user-2', WorkspaceRole.MEMBER),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if workspace does not exist', async () => {
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(null);
      mockPrismaService.workspace.findUnique.mockResolvedValue(null);

      await expect(
        service.addMember('ws-1', 'user-2', WorkspaceRole.MEMBER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully add a workspace member', async () => {
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(null);
      mockPrismaService.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });
      mockPrismaService.workspaceMember.create.mockResolvedValue({
        id: 'wm-2',
        workspaceId: 'ws-1',
        userId: 'user-2',
        role: WorkspaceRole.MEMBER,
      });

      const member = await service.addMember('ws-1', 'user-2', WorkspaceRole.MEMBER);

      expect(member.userId).toBe('user-2');
      expect(member.role).toBe(WorkspaceRole.MEMBER);
    });
  });

  describe('listWorkspacesByOrganization', () => {
    it('should return workspaces with attached user roles', async () => {
      const mockMemberships = [
        {
          id: 'wm-1',
          role: WorkspaceRole.OWNER,
          joinedAt: new Date('2026-01-01'),
          workspace: {
            id: 'ws-1',
            name: 'Workspace One',
            _count: { members: 2, projects: 5 },
          },
        },
      ];

      mockPrismaService.workspaceMember.findMany.mockResolvedValue(mockMemberships);

      const result = await service.listWorkspacesByOrganization('org-1', 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ws-1');
      expect(result[0].userRole).toBe(WorkspaceRole.OWNER);
      expect(result[0]._count.projects).toBe(5);
    });
  });
});
