import { Test, TestingModule } from '@nestjs/testing';
import { ProjectMembersController } from './project-members.controller';
import { ProjectsService } from './projects.service';
import { SessionService } from '../auth/session.service';
import { ProjectRole } from '@prisma/client';

describe('ProjectMembersController', () => {
  let controller: ProjectMembersController;
  let service: ProjectsService;

  const mockProjectsService = {
    listMembers: jest.fn(),
    addMember: jest.fn(),
    updateMemberRole: jest.fn(),
    removeMember: jest.fn(),
  };

  const mockSessionService = {
    validateSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectMembersController],
      providers: [
        { provide: ProjectsService, useValue: mockProjectsService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile();

    controller = module.get<ProjectMembersController>(
      ProjectMembersController,
    );
    service = module.get<ProjectsService>(ProjectsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('should return list of project members wrapped in ApiResponse', async () => {
      const mockMembers = [
        { id: 'm-1', userId: 'u-1', role: ProjectRole.MANAGER },
        { id: 'm-2', userId: 'u-2', role: ProjectRole.MEMBER },
      ];
      mockProjectsService.listMembers.mockResolvedValue(mockMembers);

      const res = await controller.list('p-1', 'u-1');
      expect(res).toEqual({
        success: true,
        message: 'Project members retrieved successfully',
        data: mockMembers,
      });
      expect(mockProjectsService.listMembers).toHaveBeenCalledWith('p-1', 'u-1');
    });
  });

  describe('add', () => {
    it('should add member to project and return created record in ApiResponse', async () => {
      const mockCreated = {
        id: 'm-3',
        userId: 'u-3',
        role: ProjectRole.MEMBER,
      };
      mockProjectsService.addMember.mockResolvedValue(mockCreated);

      const res = await controller.add('p-1', 'actor-1', {
        userId: 'u-3',
        role: ProjectRole.MEMBER,
      });

      expect(res).toEqual({
        success: true,
        message: 'Member added to project successfully',
        data: mockCreated,
      });
      expect(mockProjectsService.addMember).toHaveBeenCalledWith(
        'p-1',
        'actor-1',
        {
          userId: 'u-3',
          role: ProjectRole.MEMBER,
        },
      );
    });
  });

  describe('updateRole', () => {
    it('should update member role and return updated record in ApiResponse', async () => {
      const mockUpdated = {
        id: 'm-2',
        role: ProjectRole.VIEWER,
      };
      mockProjectsService.updateMemberRole.mockResolvedValue(mockUpdated);

      const res = await controller.updateRole('p-1', 'm-2', 'actor-1', {
        role: ProjectRole.VIEWER,
      });

      expect(res).toEqual({
        success: true,
        message: 'Project member role updated successfully',
        data: mockUpdated,
      });
      expect(mockProjectsService.updateMemberRole).toHaveBeenCalledWith(
        'p-1',
        'm-2',
        'actor-1',
        { role: ProjectRole.VIEWER },
      );
    });
  });

  describe('remove', () => {
    it('should remove member from project and return success message', async () => {
      mockProjectsService.removeMember.mockResolvedValue({
        success: true,
        message: 'Member removed from project successfully',
      });

      const res = await controller.remove('p-1', 'm-2', 'actor-1');
      expect(res).toEqual({
        success: true,
        message: 'Member removed from project successfully',
      });
      expect(mockProjectsService.removeMember).toHaveBeenCalledWith(
        'p-1',
        'm-2',
        'actor-1',
      );
    });
  });
});
