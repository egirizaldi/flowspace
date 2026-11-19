import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { SessionService } from '../auth/session.service';
import { ProjectLifecycleStatus } from '@prisma/client';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: ProjectsService;

  const mockProjectsService = {
    findById: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
    restore: jest.fn(),
    delete: jest.fn(),
  };

  const mockSessionService = {
    validateSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        { provide: ProjectsService, useValue: mockProjectsService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    service = module.get<ProjectsService>(ProjectsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findById', () => {
    it('should return project detail wrapped in ApiResponse', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Project One',
        key: 'P1',
      };
      mockProjectsService.findById.mockResolvedValue(mockProject);

      const res = await controller.findById('proj-1', 'user-1');
      expect(res).toEqual({
        success: true,
        message: 'Project retrieved successfully',
        data: mockProject,
      });
      expect(mockProjectsService.findById).toHaveBeenCalledWith('proj-1', 'user-1');
    });
  });

  describe('update', () => {
    it('should update project and return updated data in ApiResponse', async () => {
      const mockUpdated = {
        id: 'proj-1',
        name: 'Updated Project Name',
        status: ProjectLifecycleStatus.ACTIVE,
      };
      mockProjectsService.update.mockResolvedValue(mockUpdated);

      const res = await controller.update('proj-1', 'user-1', {
        name: 'Updated Project Name',
        status: ProjectLifecycleStatus.ACTIVE,
      });

      expect(res).toEqual({
        success: true,
        message: 'Project updated successfully',
        data: mockUpdated,
      });
      expect(mockProjectsService.update).toHaveBeenCalledWith(
        'proj-1',
        'user-1',
        expect.objectContaining({
          name: 'Updated Project Name',
          status: ProjectLifecycleStatus.ACTIVE,
        }),
      );
    });
  });

  describe('archive', () => {
    it('should archive project and return success', async () => {
      const mockArchived = {
        id: 'proj-1',
        archivedAt: new Date(),
      };
      mockProjectsService.archive.mockResolvedValue(mockArchived);

      const res = await controller.archive('proj-1', 'user-1');
      expect(res).toEqual({
        success: true,
        message: 'Project archived successfully',
        data: mockArchived,
      });
      expect(mockProjectsService.archive).toHaveBeenCalledWith('proj-1', 'user-1');
    });
  });

  describe('restore', () => {
    it('should restore project and return success', async () => {
      const mockRestored = {
        id: 'proj-1',
        archivedAt: null,
      };
      mockProjectsService.restore.mockResolvedValue(mockRestored);

      const res = await controller.restore('proj-1', 'user-1');
      expect(res).toEqual({
        success: true,
        message: 'Project restored successfully',
        data: mockRestored,
      });
      expect(mockProjectsService.restore).toHaveBeenCalledWith('proj-1', 'user-1');
    });
  });

  describe('delete', () => {
    it('should delete project and return standard success message', async () => {
      mockProjectsService.delete.mockResolvedValue({
        success: true,
        message: 'Project deleted successfully',
      });

      const res = await controller.delete('proj-1', 'user-1');
      expect(res).toEqual({
        success: true,
        message: 'Project deleted successfully',
      });
      expect(mockProjectsService.delete).toHaveBeenCalledWith('proj-1', 'user-1');
    });
  });
});
