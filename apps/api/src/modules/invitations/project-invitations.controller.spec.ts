import { Test, TestingModule } from '@nestjs/testing';
import { ProjectInvitationsController } from './project-invitations.controller';
import { InvitationsService } from './invitations.service';
import { SessionService } from '../auth/session.service';
import { Reflector } from '@nestjs/core';
import { ProjectRole } from '@prisma/client';

describe('ProjectInvitationsController', () => {
  let controller: ProjectInvitationsController;
  let service: InvitationsService;

  const mockInvitationsService = {
    inviteToProject: jest.fn(),
  };

  const mockSessionService = {
    getCookieName: jest.fn().mockReturnValue('flowspace_session'),
    validateSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectInvitationsController],
      providers: [
        { provide: InvitationsService, useValue: mockInvitationsService },
        { provide: SessionService, useValue: mockSessionService },
        Reflector,
      ],
    }).compile();

    controller = module.get<ProjectInvitationsController>(
      ProjectInvitationsController,
    );
    service = module.get<InvitationsService>(InvitationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('invite', () => {
    it('should call inviteToProject and return response', async () => {
      const mockResult = {
        invitation: { id: 'inv-3', email: 'dev@example.com' },
        rawToken: 'token789',
      };
      mockInvitationsService.inviteToProject.mockResolvedValue(mockResult);

      const dto = {
        email: 'dev@example.com',
        role: ProjectRole.MEMBER,
      };
      const result = await controller.invite('proj-1', 'user-1', dto);

      expect(mockInvitationsService.inviteToProject).toHaveBeenCalledWith(
        'proj-1',
        'user-1',
        dto,
      );
      expect(result).toEqual({
        success: true,
        message: 'Invitation created successfully',
        data: mockResult,
      });
    });
  });
});
