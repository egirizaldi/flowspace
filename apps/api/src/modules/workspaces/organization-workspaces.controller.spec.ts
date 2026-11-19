import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationWorkspacesController } from './organization-workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { SessionService } from '../auth/session.service';
import { Reflector } from '@nestjs/core';

describe('OrganizationWorkspacesController', () => {
  let controller: OrganizationWorkspacesController;
  let service: WorkspacesService;

  const mockWorkspacesService = {
    create: jest.fn(),
    listWorkspacesByOrganization: jest.fn(),
  };

  const mockSessionService = {
    getCookieName: jest.fn().mockReturnValue('flowspace_session'),
    validateSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationWorkspacesController],
      providers: [
        { provide: WorkspacesService, useValue: mockWorkspacesService },
        { provide: SessionService, useValue: mockSessionService },
        Reflector,
      ],
    }).compile();

    controller = module.get<OrganizationWorkspacesController>(
      OrganizationWorkspacesController,
    );
    service = module.get<WorkspacesService>(WorkspacesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create workspace and return standardized response', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        organizationId: 'org-1',
        name: 'Backend',
        slug: 'backend',
        members: [{ id: 'wm-1', role: 'OWNER', userId: 'user-1' }],
      };

      mockWorkspacesService.create.mockResolvedValue(mockWorkspace);

      const dto = { name: 'Backend', slug: 'backend' };
      const result = await controller.create('org-1', 'user-1', dto);

      expect(mockWorkspacesService.create).toHaveBeenCalledWith(
        'org-1',
        'user-1',
        dto,
      );
      expect(result).toEqual({
        success: true,
        message: 'Workspace created successfully',
        data: mockWorkspace,
      });
    });
  });

  describe('list', () => {
    it('should list workspaces and return standardized response', async () => {
      const mockList = [
        { id: 'ws-1', name: 'Backend', userRole: 'OWNER' },
        { id: 'ws-2', name: 'Frontend', userRole: 'MEMBER' },
      ];

      mockWorkspacesService.listWorkspacesByOrganization.mockResolvedValue(
        mockList,
      );

      const result = await controller.list('org-1', 'user-1');

      expect(
        mockWorkspacesService.listWorkspacesByOrganization,
      ).toHaveBeenCalledWith('org-1', 'user-1');
      expect(result).toEqual({
        success: true,
        message: 'Workspaces retrieved successfully',
        data: mockList,
      });
    });
  });
});
