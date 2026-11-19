import { Test, TestingModule } from '@nestjs/testing';
import { ProjectTasksController } from './project-tasks.controller';
import { TasksService } from './tasks.service';
import { SessionService } from '../auth/session.service';
import { TaskPriority } from '@prisma/client';

describe('ProjectTasksController', () => {
  let controller: ProjectTasksController;
  let service: TasksService;

  const mockTasksService = {
    findProjectTasks: jest.fn(),
    createTask: jest.fn(),
  };

  const mockSessionService = {
    validateSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectTasksController],
      providers: [
        { provide: TasksService, useValue: mockTasksService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile();

    controller = module.get<ProjectTasksController>(ProjectTasksController);
    service = module.get<TasksService>(TasksService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listTasks', () => {
    it('should list tasks with metadata', async () => {
      const mockResult = {
        tasks: [{ id: 't-1', title: 'Task 1' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      mockTasksService.findProjectTasks.mockResolvedValue(mockResult);

      const res = await controller.listTasks('p-1', { page: 1 }, 'u-1');
      expect(res).toEqual({
        success: true,
        message: 'Tasks retrieved successfully',
        data: mockResult.tasks,
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      });
      expect(mockTasksService.findProjectTasks).toHaveBeenCalledWith('p-1', 'u-1', {
        page: 1,
      });
    });
  });

  describe('createTask', () => {
    it('should create task and return wrapped ApiResponse', async () => {
      const dto = {
        title: 'Build login flow',
        priority: TaskPriority.HIGH,
      };
      const createdTask = {
        id: 't-123',
        taskNumber: 1,
        taskKey: 'CORE-1',
        title: dto.title,
        priority: dto.priority,
      };
      mockTasksService.createTask.mockResolvedValue(createdTask);

      const res = await controller.createTask('p-1', dto, 'u-1');
      expect(res).toEqual({
        success: true,
        message: 'Task created successfully',
        data: createdTask,
      });
      expect(mockTasksService.createTask).toHaveBeenCalledWith(
        'p-1',
        'u-1',
        dto,
      );
    });
  });
});
