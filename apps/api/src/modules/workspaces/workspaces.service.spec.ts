import { Test, TestingModule } from '@nestjs/testing';
import { WorkspacesService } from './workspaces.service';
import { PrismaService } from '../../database/prisma.service';
import {
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { WorkspaceRole, OrganizationRole } from '@prisma/client';

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
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
      expect(service.generateSlug('Engineering & Product')).toBe(
        'engineering-product',
      );
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
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: 'org-1',
      });
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.create('org-1', 'user-1', { name: 'Engineering' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if workspace slug already exists in organization', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: 'org-1',
      });
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'mem-1',
      });
      mockPrismaService.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });

      await expect(
        service.create('org-1', 'user-1', {
          name: 'Engineering',
          slug: 'eng',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create workspace and auto-assign creator as OWNER in transaction', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: 'org-1',
      });
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'mem-1',
      });
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

      const result = await service.create('org-1', 'user-1', {
        name: 'Engineering',
      });

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
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue({
        id: 'wm-1',
      });

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

      const member = await service.addMember(
        'ws-1',
        'user-2',
        WorkspaceRole.MEMBER,
      );

      expect(member.userId).toBe('user-2');
      expect(member.role).toBe(WorkspaceRole.MEMBER);
    });
  });

  describe('listWorkspacesByOrganization', () => {
    it('should throw ForbiddenException if user is not in organization', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.listWorkspacesByOrganization('org-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return all workspaces if user is Org OWNER or ADMIN', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        role: OrganizationRole.OWNER,
      });

      const mockWorkspaces = [
        {
          id: 'ws-1',
          name: 'Workspace One',
          createdAt: new Date('2026-01-01'),
          _count: { members: 2, projects: 5 },
          members: [
            { role: WorkspaceRole.OWNER, joinedAt: new Date('2026-01-01') },
          ],
        },
      ];

      mockPrismaService.workspace.findMany.mockResolvedValue(mockWorkspaces);

      const result = await service.listWorkspacesByOrganization(
        'org-1',
        'user-1',
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ws-1');
      expect(result[0].userRole).toBe(WorkspaceRole.OWNER);
      expect(result[0]._count.projects).toBe(5);
    });

    it('should return user workspaces if user is regular org MEMBER', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        role: OrganizationRole.MEMBER,
      });

      const mockMemberships = [
        {
          id: 'wm-1',
          role: WorkspaceRole.MEMBER,
          joinedAt: new Date('2026-01-01'),
          workspace: {
            id: 'ws-1',
            name: 'Workspace One',
            _count: { members: 2, projects: 5 },
          },
        },
      ];

      mockPrismaService.workspaceMember.findMany.mockResolvedValue(
        mockMemberships,
      );

      const result = await service.listWorkspacesByOrganization(
        'org-1',
        'user-1',
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ws-1');
      expect(result[0].userRole).toBe(WorkspaceRole.MEMBER);
    });
  });

  describe('findByIdForUser', () => {
    it('should throw NotFoundException if workspace does not exist', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(null);

      await expect(
        service.findByIdForUser('ws-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user has no access to workspace or org', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        organizationId: 'org-1',
        members: [],
      });
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.findByIdForUser('ws-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return workspace details for workspace member', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        organizationId: 'org-1',
        name: 'Backend Engineering',
        members: [
          {
            userId: 'user-1',
            role: WorkspaceRole.OWNER,
            user: { id: 'user-1', name: 'Alice' },
          },
        ],
        _count: { members: 1, projects: 2 },
      };

      mockPrismaService.workspace.findUnique.mockResolvedValue(mockWorkspace);

      const result = await service.findByIdForUser('ws-1', 'user-1');

      expect(result.id).toBe('ws-1');
      expect(result.currentUserRole).toBe(WorkspaceRole.OWNER);
    });

    it('should allow org owner even if not direct workspace member', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        organizationId: 'org-1',
        name: 'Design',
        members: [],
        _count: { members: 0, projects: 0 },
      };

      mockPrismaService.workspace.findUnique.mockResolvedValue(mockWorkspace);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        role: OrganizationRole.OWNER,
      });

      const result = await service.findByIdForUser('ws-1', 'user-1');

      expect(result.id).toBe('ws-1');
      expect(result.currentUserRole).toBe(WorkspaceRole.OWNER);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if workspace does not exist', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(null);

      await expect(
        service.update('ws-1', 'user-1', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is only a MEMBER', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        organizationId: 'org-1',
      });
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue({
        role: WorkspaceRole.MEMBER,
      });
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        role: OrganizationRole.MEMBER,
      });

      await expect(
        service.update('ws-1', 'user-1', { name: 'New Name' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update workspace if user is WorkspaceRole.OWNER or ADMIN', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        organizationId: 'org-1',
      });
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue({
        role: WorkspaceRole.ADMIN,
      });
      mockPrismaService.workspace.update.mockResolvedValue({
        id: 'ws-1',
        name: 'Updated Name',
      });

      const result = await service.update('ws-1', 'user-1', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
      expect(mockPrismaService.workspace.update).toHaveBeenCalledWith({
        where: { id: 'ws-1' },
        data: { name: 'Updated Name', description: undefined },
      });
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException if workspace does not exist', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(null);

      await expect(service.delete('ws-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is only ADMIN or MEMBER', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        organizationId: 'org-1',
      });
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue({
        role: WorkspaceRole.ADMIN,
      });
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        role: OrganizationRole.ADMIN,
      });

      await expect(service.delete('ws-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should delete workspace if user is WorkspaceRole.OWNER', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        organizationId: 'org-1',
      });
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue({
        role: WorkspaceRole.OWNER,
      });
      mockPrismaService.workspace.delete.mockResolvedValue({ id: 'ws-1' });

      const result = await service.delete('ws-1', 'user-1');

      expect(result).toBe(true);
      expect(mockPrismaService.workspace.delete).toHaveBeenCalledWith({
        where: { id: 'ws-1' },
      });
    });
  });
});
