import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { SessionService } from '../auth/session.service';
import { TaskPriority } from '@prisma/client';

describe('TasksController', () => {
  let controller: TasksController;
  let service: TasksService;

  const mockTasksService = {
    findTaskById: jest.fn(),
    updateTask: jest.fn(),
    updateTaskStatus: jest.fn(),
    assignTask: jest.fn(),
    removeAssignee: jest.fn(),
    getTaskActivities: jest.fn(),
    moveTask: jest.fn(),
    deleteTask: jest.fn(),
  };

  const mockSessionService = {
    validateSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        { provide: TasksService, useValue: mockTasksService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
    service = module.get<TasksService>(TasksService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTask', () => {
    it('should return task details wrapped in ApiResponse', async () => {
      const mockTask = { id: 't-1', title: 'Task detail', taskKey: 'PROJ-1' };
      mockTasksService.findTaskById.mockResolvedValue(mockTask);

      const res = await controller.getTask('t-1', 'u-1');
      expect(res).toEqual({
        success: true,
        message: 'Task retrieved successfully',
        data: mockTask,
      });
      expect(mockTasksService.findTaskById).toHaveBeenCalledWith('t-1', 'u-1');
    });
  });

  describe('updateTask', () => {
    it('should update task details and return wrapped response', async () => {
      const dto = { title: 'Updated Title', version: 1 };
      const updated = { id: 't-1', title: 'Updated Title', version: 2 };
      mockTasksService.updateTask.mockResolvedValue(updated);

      const res = await controller.updateTask('t-1', dto, 'u-1');
      expect(res).toEqual({
        success: true,
        message: 'Task updated successfully',
        data: updated,
      });
      expect(mockTasksService.updateTask).toHaveBeenCalledWith('t-1', 'u-1', dto);
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status and return wrapped response', async () => {
      const dto = { statusId: 's-2', version: 1 };
      const updated = { id: 't-1', statusId: 's-2', version: 2 };
      mockTasksService.updateTaskStatus.mockResolvedValue(updated);

      const res = await controller.updateTaskStatus('t-1', dto, 'u-1');
      expect(res).toEqual({
        success: true,
        message: 'Task status updated successfully',
        data: updated,
      });
      expect(mockTasksService.updateTaskStatus).toHaveBeenCalledWith(
        't-1',
        'u-1',
        dto,
      );
    });
  });

  describe('assignTask', () => {
    it('should update task assignee and return wrapped response', async () => {
      const dto = { assigneeId: 'u-2', version: 1 };
      const updated = { id: 't-1', assigneeId: 'u-2', version: 2 };
      mockTasksService.assignTask.mockResolvedValue(updated);

      const res = await controller.assignTask('t-1', dto, 'u-1');
      expect(res).toEqual({
        success: true,
        message: 'Task assignee updated successfully',
        data: updated,
      });
      expect(mockTasksService.assignTask).toHaveBeenCalledWith(
        't-1',
        'u-1',
        dto,
      );
    });

    it('should remove assignee and return wrapped response', async () => {
      const updated = { id: 't-1', assigneeId: null, version: 3 };
      mockTasksService.removeAssignee.mockResolvedValue(updated);

      const res = await controller.removeAssignee('t-1', 'u-1');
      expect(res).toEqual({
        success: true,
        message: 'Task assignee removed successfully',
        data: updated,
      });
      expect(mockTasksService.removeAssignee).toHaveBeenCalledWith('t-1', 'u-1');
    });
  });

  describe('getTaskActivities', () => {
    it('should return activities wrapped in ApiResponse', async () => {
      const mockActivities = [
        { id: 'act-1', action: 'TASK_ASSIGNED', taskId: 't-1' },
      ];
      mockTasksService.getTaskActivities.mockResolvedValue(mockActivities);

      const res = await controller.getTaskActivities('t-1', 'u-1');
      expect(res).toEqual({
        success: true,
        message: 'Task activities retrieved successfully',
        data: mockActivities,
      });
      expect(mockTasksService.getTaskActivities).toHaveBeenCalledWith('t-1', 'u-1');
    });
  });

  describe('moveTask', () => {
    it('should move task position and return wrapped response', async () => {
      const dto = { statusId: 's-3', position: '120000', version: 1 };
      const updated = { id: 't-1', statusId: 's-3', position: '120000', version: 2 };
      mockTasksService.moveTask.mockResolvedValue(updated);

      const res = await controller.moveTask('t-1', dto, 'u-1');
      expect(res).toEqual({
        success: true,
        message: 'Task moved successfully',
        data: updated,
      });
      expect(mockTasksService.moveTask).toHaveBeenCalledWith('t-1', 'u-1', dto);
    });
  });

  describe('deleteTask', () => {
    it('should delete task and return wrapped response', async () => {
      const result = { success: true, message: 'Deleted', deletedId: 't-1' };
      mockTasksService.deleteTask.mockResolvedValue(result);

      const res = await controller.deleteTask('t-1', 'u-1');
      expect(res).toEqual({
        success: true,
        message: 'Task deleted successfully',
        data: result,
      });
      expect(mockTasksService.deleteTask).toHaveBeenCalledWith('t-1', 'u-1');
    });
  });
});
