import { Test, TestingModule } from '@nestjs/testing';
import { ProjectLabelsController } from './project-labels.controller';
import { TasksService } from './tasks.service';
import { SessionService } from '../auth/session.service';

describe('ProjectLabelsController', () => {
  let controller: ProjectLabelsController;
  let service: TasksService;

  const mockTasksService = {
    listProjectLabels: jest.fn(),
    createProjectLabel: jest.fn(),
    updateProjectLabel: jest.fn(),
    deleteProjectLabel: jest.fn(),
  };

  const mockSessionService = {
    validateSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectLabelsController],
      providers: [
        { provide: TasksService, useValue: mockTasksService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile();

    controller = module.get<ProjectLabelsController>(ProjectLabelsController);
    service = module.get<TasksService>(TasksService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listLabels', () => {
    it('should return labels wrapped in ApiResponse', async () => {
      const mockLabels = [{ id: 'l-1', name: 'Frontend', color: '#3b82f6' }];
      mockTasksService.listProjectLabels.mockResolvedValue(mockLabels);

      const res = await controller.listLabels('p-1', 'u-1');
      expect(res).toEqual({
        success: true,
        message: 'Project labels retrieved successfully',
        data: mockLabels,
      });
      expect(mockTasksService.listProjectLabels).toHaveBeenCalledWith(
        'p-1',
        'u-1',
      );
    });
  });

  describe('createLabel', () => {
    it('should create label and return wrapped response', async () => {
      const dto = { name: 'Bug', color: '#ef4444' };
      const created = { id: 'l-new', ...dto };
      mockTasksService.createProjectLabel.mockResolvedValue(created);

      const res = await controller.createLabel('p-1', dto, 'u-1');
      expect(res).toEqual({
        success: true,
        message: 'Project label created successfully',
        data: created,
      });
      expect(mockTasksService.createProjectLabel).toHaveBeenCalledWith(
        'p-1',
        'u-1',
        dto,
      );
    });
  });

  describe('updateLabel', () => {
    it('should update label and return wrapped response', async () => {
      const dto = { name: 'Critical Bug' };
      const updated = { id: 'l-1', name: 'Critical Bug', color: '#ef4444' };
      mockTasksService.updateProjectLabel.mockResolvedValue(updated);

      const res = await controller.updateLabel('p-1', 'l-1', dto, 'u-1');
      expect(res).toEqual({
        success: true,
        message: 'Project label updated successfully',
        data: updated,
      });
      expect(mockTasksService.updateProjectLabel).toHaveBeenCalledWith(
        'p-1',
        'l-1',
        'u-1',
        dto,
      );
    });
  });

  describe('deleteLabel', () => {
    it('should delete label and return wrapped response', async () => {
      const result = { success: true, message: 'Deleted', deletedId: 'l-1' };
      mockTasksService.deleteProjectLabel.mockResolvedValue(result);

      const res = await controller.deleteLabel('p-1', 'l-1', 'u-1');
      expect(res).toEqual({
        success: true,
        message: 'Project label deleted successfully',
        data: result,
      });
      expect(mockTasksService.deleteProjectLabel).toHaveBeenCalledWith(
        'p-1',
        'l-1',
        'u-1',
      );
    });
  });
});
