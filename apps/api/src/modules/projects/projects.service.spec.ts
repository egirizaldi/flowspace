import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../../database/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  ProjectLifecycleStatus,
  ProjectRole,
  WorkspaceRole,
  OrganizationRole,
} from '@prisma/client';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    workspace: {
      findUnique: jest.fn(),
    },
    workspaceMember: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    organizationMember: {
      findUnique: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    projectMember: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    projectStatus: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateKey', () => {
    it('should extract first letters of multiple words', () => {
      expect(service.generateKey('Core Engine Platform')).toBe('CEP');
      expect(service.generateKey('FlowSpace Web')).toBe('FW');
    });

    it('should take first 3-4 characters of single words', () => {
      expect(service.generateKey('Frontend')).toBe('FRON');
      expect(service.generateKey('Api')).toBe('API');
    });

    it('should pad short names to ensure at least 2 characters', () => {
      const key = service.generateKey('X');
      expect(key.length).toBeGreaterThanOrEqual(2);
      expect(key.startsWith('X')).toBe(true);
    });
  });

  describe('create', () => {
    it('should throw NotFoundException if workspace does not exist', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(null);

      await expect(
        service.create('ws-1', 'user-1', { name: 'My Project' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user has no access to workspace or org', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        organizationId: 'org-1',
      });
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.create('ws-1', 'user-1', { name: 'My Project' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user is a VIEWER in workspace', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        organizationId: 'org-1',
      });
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue({
        role: WorkspaceRole.VIEWER,
      });

      await expect(
        service.create('ws-1', 'user-1', { name: 'My Project' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if supplied key has invalid characters', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        organizationId: 'org-1',
      });
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue({
        role: WorkspaceRole.MEMBER,
      });

      await expect(
        service.create('ws-1', 'user-1', {
          name: 'My Project',
          key: 'INVALID KEY!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if project key already exists in workspace', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        organizationId: 'org-1',
      });
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue({
        role: WorkspaceRole.MEMBER,
      });
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'existing-proj',
        key: 'KEY',
      });

      await expect(
        service.create('ws-1', 'user-1', { name: 'My Project', key: 'KEY' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully create project in transaction and seed default statuses', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        organizationId: 'org-1',
      });
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue({
        role: WorkspaceRole.MEMBER,
      });
      mockPrismaService.project.findUnique
        .mockResolvedValueOnce(null) // key check
        .mockResolvedValueOnce({
          // final return with relations
          id: 'proj-1',
          name: 'Core Service',
          key: 'CS',
          status: ProjectLifecycleStatus.PLANNING,
          members: [{ userId: 'user-1', role: ProjectRole.MANAGER }],
          statuses: [
            { name: 'Backlog', position: 0 },
            { name: 'Todo', position: 1 },
          ],
        });

      mockPrismaService.project.create.mockResolvedValue({
        id: 'proj-1',
      });

      const result = await service.create('ws-1', 'user-1', {
        name: 'Core Service',
        key: 'CS',
        description: 'Main service backend',
        startDate: '2026-01-01',
        dueDate: '2026-06-30',
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('proj-1');
      expect(mockPrismaService.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Core Service',
            key: 'CS',
            workspaceId: 'ws-1',
            organizationId: 'org-1',
            createdBy: 'user-1',
          }),
        }),
      );
      expect(mockPrismaService.projectMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: 'proj-1',
            userId: 'user-1',
            role: ProjectRole.MANAGER,
          }),
        }),
      );
      expect(mockPrismaService.projectStatus.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ name: 'Backlog' }),
            expect.objectContaining({ name: 'Todo' }),
            expect.objectContaining({ name: 'In Progress' }),
            expect.objectContaining({ name: 'In Review' }),
            expect.objectContaining({ name: 'Done' }),
          ]),
        }),
      );
    });

    it('should auto-join organization admin into workspace if not already a member', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        organizationId: 'org-1',
      });
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        role: OrganizationRole.ADMIN,
      });
      mockPrismaService.project.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'proj-2',
        });
      mockPrismaService.project.create.mockResolvedValue({ id: 'proj-2' });

      await service.create('ws-1', 'admin-user', {
        name: 'Admin Project',
      });

      expect(mockPrismaService.workspaceMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: 'ws-1',
            userId: 'admin-user',
            role: WorkspaceRole.ADMIN,
          }),
        }),
      );
    });
  });

  describe('listByWorkspace', () => {
    it('should throw NotFoundException if workspace does not exist', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(null);

      await expect(
        service.listByWorkspace('ws-1', 'user-1', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user has no access to workspace or org', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        organizationId: 'org-1',
      });
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.listByWorkspace('ws-1', 'user-1', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return paginated projects for authorized member', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        organizationId: 'org-1',
      });
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue({
        role: WorkspaceRole.MEMBER,
      });
      mockPrismaService.project.count.mockResolvedValue(1);
      mockPrismaService.project.findMany.mockResolvedValue([
        { id: 'proj-1', name: 'Alpha' },
      ]);

      const result = await service.listByWorkspace('ws-1', 'user-1', {
        page: 1,
        limit: 10,
        search: 'Alpha',
      });

      expect(result.projects).toHaveLength(1);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if project not found', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.findById('proj-unknown', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return project detail for authorized member', async () => {
      mockPrismaService.project.findUnique
        .mockResolvedValueOnce({
          id: 'proj-1',
          workspaceId: 'ws-1',
          organizationId: 'org-1',
        })
        .mockResolvedValueOnce({
          id: 'proj-1',
          name: 'Project Detail',
          key: 'DET',
          members: [],
          statuses: [],
        });
      mockPrismaService.projectMember.findUnique.mockResolvedValue({
        role: ProjectRole.MEMBER,
      });

      const res = await service.findById('proj-1', 'user-1');
      expect(res).toBeDefined();
      expect(res.name).toBe('Project Detail');
    });
  });

  describe('update', () => {
    it('should throw ForbiddenException if user is not manager or admin', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        workspaceId: 'ws-1',
        organizationId: 'org-1',
      });
      mockPrismaService.projectMember.findUnique.mockResolvedValue({
        role: ProjectRole.VIEWER,
      });
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.update('proj-1', 'user-1', { name: 'New Name' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update project fields if user is manager', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        workspaceId: 'ws-1',
        organizationId: 'org-1',
      });
      mockPrismaService.projectMember.findUnique.mockResolvedValue({
        role: ProjectRole.MANAGER,
      });
      mockPrismaService.project.update.mockResolvedValue({
        id: 'proj-1',
        name: 'New Name',
      });

      const res = await service.update('proj-1', 'user-1', { name: 'New Name' });
      expect(res.name).toBe('New Name');
      expect(mockPrismaService.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'proj-1' },
          data: expect.objectContaining({ name: 'New Name' }),
        }),
      );
    });
  });

  describe('archive and restore', () => {
    it('should archive project', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        workspaceId: 'ws-1',
        organizationId: 'org-1',
      });
      mockPrismaService.projectMember.findUnique.mockResolvedValue({
        role: ProjectRole.MANAGER,
      });
      mockPrismaService.project.update.mockResolvedValue({
        id: 'proj-1',
        archivedAt: new Date(),
      });

      const res = await service.archive('proj-1', 'user-1');
      expect(res.archivedAt).toBeDefined();
    });

    it('should restore project', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        workspaceId: 'ws-1',
        organizationId: 'org-1',
      });
      mockPrismaService.projectMember.findUnique.mockResolvedValue({
        role: ProjectRole.MANAGER,
      });
      mockPrismaService.project.update.mockResolvedValue({
        id: 'proj-1',
        archivedAt: null,
      });

      const res = await service.restore('proj-1', 'user-1');
      expect(res.archivedAt).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete project if user is manager or admin', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        workspaceId: 'ws-1',
        organizationId: 'org-1',
      });
      mockPrismaService.projectMember.findUnique.mockResolvedValue({
        role: ProjectRole.MANAGER,
      });
      mockPrismaService.project.delete.mockResolvedValue({});

      const res = await service.delete('proj-1', 'user-1');
      expect(res.success).toBe(true);
      expect(mockPrismaService.project.delete).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
      });
    });
  });
});
