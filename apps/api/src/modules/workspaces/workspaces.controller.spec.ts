import { Test, TestingModule } from '@nestjs/testing';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { SessionService } from '../auth/session.service';
import { Reflector } from '@nestjs/core';

describe('WorkspacesController', () => {
  let controller: WorkspacesController;
  let service: WorkspacesService;

  const mockWorkspacesService = {
    findByIdForUser: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockSessionService = {
    getCookieName: jest.fn().mockReturnValue('flowspace_session'),
    validateSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkspacesController],
      providers: [
        { provide: WorkspacesService, useValue: mockWorkspacesService },
        { provide: SessionService, useValue: mockSessionService },
        Reflector,
      ],
    }).compile();

    controller = module.get<WorkspacesController>(WorkspacesController);
    service = module.get<WorkspacesService>(WorkspacesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getWorkspaceDetail', () => {
    it('should return workspace details for user', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        name: 'Backend',
        currentUserRole: 'OWNER',
      };
      mockWorkspacesService.findByIdForUser.mockResolvedValue(mockWorkspace);

      const result = await controller.getWorkspaceDetail('user-1', 'ws-1');

      expect(mockWorkspacesService.findByIdForUser).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
      );
      expect(result).toEqual({
        success: true,
        message: 'Workspace details retrieved successfully',
        data: mockWorkspace,
      });
    });
  });

  describe('updateWorkspace', () => {
    it('should update workspace and return standardized response', async () => {
      const mockUpdated = { id: 'ws-1', name: 'Updated Workspace' };
      mockWorkspacesService.update.mockResolvedValue(mockUpdated);

      const dto = { name: 'Updated Workspace' };
      const result = await controller.updateWorkspace(
        'user-1',
        'ws-1',
        dto,
      );

      expect(mockWorkspacesService.update).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
        dto,
      );
      expect(result).toEqual({
        success: true,
        message: 'Workspace updated successfully',
        data: mockUpdated,
      });
    });
  });

  describe('deleteWorkspace', () => {
    it('should delete workspace and return standardized response', async () => {
      mockWorkspacesService.delete.mockResolvedValue(true);

      const result = await controller.deleteWorkspace('user-1', 'ws-1');

      expect(mockWorkspacesService.delete).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
      );
      expect(result).toEqual({
        success: true,
        message: 'Workspace deleted successfully',
      });
    });
  });
});
