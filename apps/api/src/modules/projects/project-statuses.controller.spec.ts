import { Test, TestingModule } from '@nestjs/testing';
import { ProjectStatusesController } from './project-statuses.controller';
import { ProjectsService } from './projects.service';
import { SessionService } from '../auth/session.service';
import { ProjectStatusCategory } from '@prisma/client';

describe('ProjectStatusesController', () => {
  let controller: ProjectStatusesController;
  let service: ProjectsService;

  const mockProjectsService = {
    listStatuses: jest.fn(),
    createStatus: jest.fn(),
    updateStatus: jest.fn(),
    deleteStatus: jest.fn(),
    reorderStatuses: jest.fn(),
  };

  const mockSessionService = {
    validateSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectStatusesController],
      providers: [
        { provide: ProjectsService, useValue: mockProjectsService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile();

    controller = module.get<ProjectStatusesController>(
      ProjectStatusesController,
    );
    service = module.get<ProjectsService>(ProjectsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listStatuses', () => {
    it('should return list of project statuses wrapped in ApiResponse', async () => {
      const mockStatuses = [
        { id: 's-1', name: 'Backlog', position: 1000 },
        { id: 's-2', name: 'In Progress', position: 2000 },
      ];
      mockProjectsService.listStatuses.mockResolvedValue(mockStatuses);

      const res = await controller.listStatuses('p-1', 'u-1');
      expect(res).toEqual({
        success: true,
        message: 'Project statuses retrieved successfully',
        data: mockStatuses,
      });
      expect(mockProjectsService.listStatuses).toHaveBeenCalledWith('p-1', 'u-1');
    });
  });

  describe('createStatus', () => {
    it('should create status and return wrapped response', async () => {
      const dto = {
        name: 'In Review',
        category: ProjectStatusCategory.IN_PROGRESS,
        color: '#f59e0b',
        position: 3000,
      };
      const createdStatus = { id: 's-new', ...dto };
      mockProjectsService.createStatus.mockResolvedValue(createdStatus);

      const res = await controller.createStatus('p-1', dto, 'u-1');
      expect(res).toEqual({
        success: true,
        message: 'Project status created successfully',
        data: createdStatus,
      });
      expect(mockProjectsService.createStatus).toHaveBeenCalledWith(
        'p-1',
        'u-1',
        dto,
      );
    });
  });

  describe('reorderStatuses', () => {
    it('should reorder statuses and return wrapped response', async () => {
      const dto = { statusIds: ['s-2', 's-1'] };
      const reordered = [
        { id: 's-2', position: 1000 },
        { id: 's-1', position: 2000 },
      ];
      mockProjectsService.reorderStatuses.mockResolvedValue(reordered);

      const res = await controller.reorderStatuses('p-1', dto, 'u-1');
      expect(res).toEqual({
        success: true,
        message: 'Project statuses reordered successfully',
        data: reordered,
      });
      expect(mockProjectsService.reorderStatuses).toHaveBeenCalledWith(
        'p-1',
        'u-1',
        dto,
      );
    });
  });

  describe('updateStatus', () => {
    it('should update status and return wrapped response', async () => {
      const dto = { name: 'Done (Verified)' };
      const updatedStatus = { id: 's-1', name: 'Done (Verified)' };
      mockProjectsService.updateStatus.mockResolvedValue(updatedStatus);

      const res = await controller.updateStatus('p-1', 's-1', dto, 'u-1');
      expect(res).toEqual({
        success: true,
        message: 'Project status updated successfully',
        data: updatedStatus,
      });
      expect(mockProjectsService.updateStatus).toHaveBeenCalledWith(
        'p-1',
        's-1',
        'u-1',
        dto,
      );
    });
  });

  describe('deleteStatus', () => {
    it('should delete status and return wrapped response', async () => {
      const result = { success: true, message: 'Deleted', deletedId: 's-1' };
      mockProjectsService.deleteStatus.mockResolvedValue(result);

      const res = await controller.deleteStatus('p-1', 's-1', 'u-1');
      expect(res).toEqual({
        success: true,
        message: 'Project status deleted successfully',
        data: result,
      });
      expect(mockProjectsService.deleteStatus).toHaveBeenCalledWith(
        'p-1',
        's-1',
        'u-1',
      );
    });
  });
});
