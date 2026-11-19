import { Test, TestingModule } from '@nestjs/testing';
import { ProjectBoardController } from './project-board.controller';
import { TasksService } from './tasks.service';
import { SessionService } from '../auth/session.service';

describe('ProjectBoardController', () => {
  let controller: ProjectBoardController;
  let tasksService: TasksService;

  const mockTasksService = {
    getKanbanBoard: jest.fn(),
  };

  const mockSessionService = {
    validateSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectBoardController],
      providers: [
        { provide: TasksService, useValue: mockTasksService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile();

    controller = module.get<ProjectBoardController>(ProjectBoardController);
    tasksService = module.get<TasksService>(TasksService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getBoard', () => {
    it('should return kanban board data wrapped in ApiResponse', async () => {
      const mockBoard = {
        projectId: 'p-1',
        projectKey: 'PROJ',
        projectName: 'Alpha',
        columns: [
          {
            id: 's-1',
            name: 'Todo',
            category: 'TODO',
            color: '#3b82f6',
            position: 0,
            isDefault: true,
            tasks: [{ id: 't-1', title: 'Task 1', position: '1000' }],
          },
        ],
      };

      mockTasksService.getKanbanBoard.mockResolvedValue(mockBoard);

      const query = { priority: undefined, assigneeId: undefined, search: undefined, includeSubtasks: false };
      const res = await controller.getBoard('p-1', query, 'u-1');

      expect(res).toEqual({
        success: true,
        message: 'Kanban board retrieved successfully',
        data: mockBoard,
      });
      expect(mockTasksService.getKanbanBoard).toHaveBeenCalledWith(
        'p-1',
        'u-1',
        query,
      );
    });
  });
});
