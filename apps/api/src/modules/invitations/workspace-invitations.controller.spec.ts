import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceInvitationsController } from './workspace-invitations.controller';
import { InvitationsService } from './invitations.service';
import { SessionService } from '../auth/session.service';
import { Reflector } from '@nestjs/core';
import { WorkspaceRole } from '@prisma/client';

describe('WorkspaceInvitationsController', () => {
  let controller: WorkspaceInvitationsController;
  let service: InvitationsService;

  const mockInvitationsService = {
    inviteToWorkspace: jest.fn(),
  };

  const mockSessionService = {
    getCookieName: jest.fn().mockReturnValue('flowspace_session'),
    validateSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkspaceInvitationsController],
      providers: [
        { provide: InvitationsService, useValue: mockInvitationsService },
        { provide: SessionService, useValue: mockSessionService },
        Reflector,
      ],
    }).compile();

    controller = module.get<WorkspaceInvitationsController>(
      WorkspaceInvitationsController,
    );
    service = module.get<InvitationsService>(InvitationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('invite', () => {
    it('should call inviteToWorkspace and return response', async () => {
      const mockResult = {
        invitation: { id: 'inv-2', email: 'dev@example.com' },
        rawToken: 'token456',
      };
      mockInvitationsService.inviteToWorkspace.mockResolvedValue(mockResult);

      const dto = {
        email: 'dev@example.com',
        role: WorkspaceRole.MEMBER,
      };
      const result = await controller.invite('ws-1', 'user-1', dto);

      expect(mockInvitationsService.inviteToWorkspace).toHaveBeenCalledWith(
        'ws-1',
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
