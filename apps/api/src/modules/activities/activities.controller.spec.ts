import { Test, TestingModule } from '@nestjs/testing';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { SessionService } from '../auth/session.service';

describe('ActivitiesController', () => {
  let controller: ActivitiesController;
  let service: ActivitiesService;

  const mockActivitiesService = {
    getTaskActivities: jest.fn(),
    getProjectActivities: jest.fn(),
  };

  const mockSessionService = {
    validateSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivitiesController],
      providers: [
        { provide: ActivitiesService, useValue: mockActivitiesService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile();

    controller = module.get<ActivitiesController>(ActivitiesController);
    service = module.get<ActivitiesService>(ActivitiesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTaskActivities', () => {
    it('should return paginated task activities', async () => {
      const mockResult = {
        activities: [
          { id: 'act-1', action: 'TASK_CREATED', taskId: 't-1' },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      mockActivitiesService.getTaskActivities.mockResolvedValue(mockResult);

      const res = await controller.getTaskActivities('t-1', 'u-1', {
        page: 1,
        limit: 20,
      });

      expect(res).toEqual({
        success: true,
        message: 'Task activities retrieved successfully',
        data: mockResult.activities,
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      });
      expect(mockActivitiesService.getTaskActivities).toHaveBeenCalledWith(
        't-1',
        'u-1',
        { page: 1, limit: 20 },
      );
    });
  });

  describe('getProjectActivities', () => {
    it('should return paginated project activities', async () => {
      const mockResult = {
        activities: [
          { id: 'act-2', action: 'TASK_STATUS_CHANGED', projectId: 'p-1' },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      mockActivitiesService.getProjectActivities.mockResolvedValue(mockResult);

      const res = await controller.getProjectActivities('p-1', 'u-1', {
        page: 1,
        limit: 20,
      });

      expect(res).toEqual({
        success: true,
        message: 'Project activities retrieved successfully',
        data: mockResult.activities,
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      });
      expect(mockActivitiesService.getProjectActivities).toHaveBeenCalledWith(
        'p-1',
        'u-1',
        { page: 1, limit: 20 },
      );
    });
  });
});
