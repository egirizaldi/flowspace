import { Test, TestingModule } from '@nestjs/testing';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { SessionService } from '../auth/session.service';
import { Reflector } from '@nestjs/core';
import { BadRequestException } from '@nestjs/common';

describe('InvitationsController', () => {
  let controller: InvitationsController;
  let service: InvitationsService;

  const mockInvitationsService = {
    getInvitationInfo: jest.fn(),
    accept: jest.fn(),
  };

  const mockSessionService = {
    getCookieName: jest.fn().mockReturnValue('flowspace_session'),
    validateSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationsController],
      providers: [
        { provide: InvitationsService, useValue: mockInvitationsService },
        { provide: SessionService, useValue: mockSessionService },
        Reflector,
      ],
    }).compile();

    controller = module.get<InvitationsController>(InvitationsController);
    service = module.get<InvitationsService>(InvitationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getInfo', () => {
    it('should throw BadRequestException if token is not provided', async () => {
      await expect(controller.getInfo(undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return invitation preview info', async () => {
      const mockInfo = {
        id: 'inv-1',
        email: 'dev@example.com',
        role: 'MEMBER',
        organization: { id: 'org-1', name: 'Acme Corp' },
      };
      mockInvitationsService.getInvitationInfo.mockResolvedValue(mockInfo);

      const result = await controller.getInfo('token123');

      expect(mockInvitationsService.getInvitationInfo).toHaveBeenCalledWith(
        'token123',
      );
      expect(result).toEqual({
        success: true,
        message: 'Invitation details retrieved successfully',
        data: mockInfo,
      });
    });
  });

  describe('accept', () => {
    it('should accept invitation and return updated record', async () => {
      const mockAccepted = {
        id: 'inv-1',
        status: 'ACCEPTED',
      };
      mockInvitationsService.accept.mockResolvedValue(mockAccepted);

      const result = await controller.accept('user-1', { token: 'token123' });

      expect(mockInvitationsService.accept).toHaveBeenCalledWith(
        'token123',
        'user-1',
      );
      expect(result).toEqual({
        success: true,
        message: 'Invitation accepted successfully',
        data: mockAccepted,
      });
    });
  });
});
