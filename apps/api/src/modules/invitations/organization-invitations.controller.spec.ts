import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationInvitationsController } from './organization-invitations.controller';
import { InvitationsService } from './invitations.service';
import { SessionService } from '../auth/session.service';
import { Reflector } from '@nestjs/core';
import { OrganizationRole } from '@prisma/client';

describe('OrganizationInvitationsController', () => {
  let controller: OrganizationInvitationsController;
  let service: InvitationsService;

  const mockInvitationsService = {
    inviteToOrganization: jest.fn(),
  };

  const mockSessionService = {
    getCookieName: jest.fn().mockReturnValue('flowspace_session'),
    validateSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationInvitationsController],
      providers: [
        { provide: InvitationsService, useValue: mockInvitationsService },
        { provide: SessionService, useValue: mockSessionService },
        Reflector,
      ],
    }).compile();

    controller = module.get<OrganizationInvitationsController>(
      OrganizationInvitationsController,
    );
    service = module.get<InvitationsService>(InvitationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('invite', () => {
    it('should call inviteToOrganization and return response', async () => {
      const mockResult = {
        invitation: { id: 'inv-1', email: 'dev@example.com' },
        rawToken: 'token123',
      };
      mockInvitationsService.inviteToOrganization.mockResolvedValue(mockResult);

      const dto = {
        email: 'dev@example.com',
        role: OrganizationRole.MEMBER,
      };
      const result = await controller.invite('org-1', 'user-1', dto);

      expect(mockInvitationsService.inviteToOrganization).toHaveBeenCalledWith(
        'org-1',
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
