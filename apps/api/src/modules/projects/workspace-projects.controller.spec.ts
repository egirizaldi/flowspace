import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceProjectsController } from './workspace-projects.controller';
import { ProjectsService } from './projects.service';
import { SessionService } from '../auth/session.service';
import { ProjectLifecycleStatus, ProjectRole } from '@prisma/client';

describe('WorkspaceProjectsController', () => {
  let controller: WorkspaceProjectsController;
  let service: ProjectsService;

  const mockProjectsService = {
    create: jest.fn(),
  };

  const mockSessionService = {
    validateSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkspaceProjectsController],
      providers: [
        { provide: ProjectsService, useValue: mockProjectsService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile();

    controller = module.get<WorkspaceProjectsController>(
      WorkspaceProjectsController,
    );
    service = module.get<ProjectsService>(ProjectsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create project and return standard ApiResponse format', async () => {
      const mockCreated = {
        id: 'proj-123',
        name: 'New Architecture',
        key: 'ARCH',
        status: ProjectLifecycleStatus.PLANNING,
        members: [{ userId: 'user-1', role: ProjectRole.MANAGER }],
        statuses: [{ name: 'Todo', isDefault: true }],
      };

      mockProjectsService.create.mockResolvedValue(mockCreated);

      const result = await controller.create('ws-1', 'user-1', {
        name: 'New Architecture',
        key: 'ARCH',
      });

      expect(result).toEqual({
        success: true,
        message: 'Project created successfully',
        data: mockCreated,
      });

      expect(mockProjectsService.create).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
        expect.objectContaining({
          name: 'New Architecture',
          key: 'ARCH',
        }),
      );
    });
  });
});
