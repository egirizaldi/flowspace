import { Test, TestingModule } from '@nestjs/testing';
import { InvitationsService } from './invitations.service';
import { PrismaService } from '../../database/prisma.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  InvitationStatus,
  OrganizationRole,
  WorkspaceRole,
  ProjectRole,
} from '@prisma/client';

describe('InvitationsService', () => {
  let service: InvitationsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
    organizationMember: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    workspace: {
      findUnique: jest.fn(),
    },
    workspaceMember: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
    projectMember: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    invitation: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('tokens', () => {
    it('should generate a 64-character raw hex token', () => {
      const rawToken = service.generateRawToken();
      expect(rawToken).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(rawToken)).toBe(true);
    });

    it('should hash token with SHA-256 deterministically', () => {
      const token = 'sample-invitation-token-12345';
      const hash1 = service.hashToken(token);
      const hash2 = service.hashToken(token);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });
  });

  describe('create', () => {
    it('should throw BadRequestException if no target scope is specified', async () => {
      await expect(
        service.create('user-1', {
          email: 'invitee@example.com',
          role: 'MEMBER',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if specified organization does not exist', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.create('user-1', {
          email: 'invitee@example.com',
          role: 'MEMBER',
          organizationId: 'non-existent-org',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if active invitation for email and scope already exists', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: 'org-1',
      });
      mockPrismaService.invitation.findFirst.mockResolvedValue({
        id: 'inv-existing',
      });

      await expect(
        service.create('user-1', {
          email: 'invitee@example.com',
          role: 'MEMBER',
          organizationId: 'org-1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully create invitation with hashed token', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: 'org-1',
      });
      mockPrismaService.invitation.findFirst.mockResolvedValue(null);

      const mockCreated = {
        id: 'inv-1',
        email: 'invitee@example.com',
        tokenHash: 'hashed-value',
        organizationId: 'org-1',
        role: 'MEMBER',
        status: InvitationStatus.PENDING,
        invitedBy: 'user-1',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      mockPrismaService.invitation.create.mockResolvedValue(mockCreated);

      const result = await service.create('user-1', {
        email: 'INVITEE@EXAMPLE.COM',
        role: 'MEMBER',
        organizationId: 'org-1',
      });

      expect(result.invitation).toEqual(mockCreated);
      expect(result.rawToken).toHaveLength(64);
      expect(mockPrismaService.invitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'invitee@example.com',
            organizationId: 'org-1',
            role: 'MEMBER',
            status: InvitationStatus.PENDING,
            invitedBy: 'user-1',
          }),
        }),
      );
    });
  });

  describe('inviteToOrganization', () => {
    it('should throw NotFoundException if organization not found', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.inviteToOrganization('org-1', 'user-1', {
          email: 'dev@example.com',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if inviter is only a MEMBER', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: 'org-1',
      });
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        role: OrganizationRole.MEMBER,
      });

      await expect(
        service.inviteToOrganization('org-1', 'user-1', {
          email: 'dev@example.com',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if user is already in organization', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: 'org-1',
      });
      mockPrismaService.organizationMember.findUnique
        .mockResolvedValueOnce({ role: OrganizationRole.OWNER }) // Inviter
        .mockResolvedValueOnce({ role: OrganizationRole.MEMBER }); // Target user membership
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-target' });

      await expect(
        service.inviteToOrganization('org-1', 'user-1', {
          email: 'dev@example.com',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('inviteToWorkspace', () => {
    it('should throw NotFoundException if workspace not found', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(null);

      await expect(
        service.inviteToWorkspace('ws-1', 'user-1', {
          email: 'dev@example.com',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if caller has insufficient workspace role', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        organizationId: 'org-1',
      });
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue({
        role: WorkspaceRole.MEMBER,
      });
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        role: OrganizationRole.MEMBER,
      });

      await expect(
        service.inviteToWorkspace('ws-1', 'user-1', {
          email: 'dev@example.com',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findValidByRawToken', () => {
    it('should throw NotFoundException if token does not exist', async () => {
      mockPrismaService.invitation.findUnique.mockResolvedValue(null);

      await expect(
        service.findValidByRawToken('invalid-raw-token'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if invitation is already accepted', async () => {
      mockPrismaService.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: InvitationStatus.ACCEPTED,
      });

      await expect(
        service.findValidByRawToken('valid-raw-token'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should mark as EXPIRED and throw BadRequestException if expired', async () => {
      mockPrismaService.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() - 1000), // Past expiration
      });
      mockPrismaService.invitation.update.mockResolvedValue({});

      await expect(
        service.findValidByRawToken('valid-raw-token'),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.invitation.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: InvitationStatus.EXPIRED },
      });
    });

    it('should return invitation if pending and not expired', async () => {
      const mockInvitation = {
        id: 'inv-1',
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 100000),
        organizationId: 'org-1',
      };
      mockPrismaService.invitation.findUnique.mockResolvedValue(mockInvitation);

      const result = await service.findValidByRawToken('valid-raw-token');
      expect(result).toEqual(mockInvitation);
    });
  });

  describe('revoke', () => {
    it('should throw NotFoundException if invitation does not exist', async () => {
      mockPrismaService.invitation.findUnique.mockResolvedValue(null);

      await expect(service.revoke('inv-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not the inviter', async () => {
      mockPrismaService.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: InvitationStatus.PENDING,
        invitedBy: 'user-other',
      });

      await expect(service.revoke('inv-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should successfully revoke pending invitation', async () => {
      mockPrismaService.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: InvitationStatus.PENDING,
        invitedBy: 'user-1',
      });
      mockPrismaService.invitation.update.mockResolvedValue({
        id: 'inv-1',
        status: InvitationStatus.REVOKED,
      });

      const result = await service.revoke('inv-1', 'user-1');
      expect(result.status).toBe(InvitationStatus.REVOKED);
      expect(mockPrismaService.invitation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-1' },
          data: expect.objectContaining({
            status: InvitationStatus.REVOKED,
          }),
        }),
      );
    });
  });

  describe('accept', () => {
    it('should mark invitation status as ACCEPTED', async () => {
      const mockInvitation = {
        id: 'inv-1',
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 100000),
        organizationId: 'org-1',
        role: 'MEMBER',
      };
      mockPrismaService.invitation.findUnique.mockResolvedValue(mockInvitation);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);
      mockPrismaService.organizationMember.create.mockResolvedValue({});
      mockPrismaService.invitation.update.mockResolvedValue({
        ...mockInvitation,
        status: InvitationStatus.ACCEPTED,
      });

      const result = await service.accept('valid-raw-token', 'user-2');
      expect(result.status).toBe(InvitationStatus.ACCEPTED);
      expect(mockPrismaService.invitation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-1' },
          data: expect.objectContaining({
            status: InvitationStatus.ACCEPTED,
          }),
        }),
      );
    });
  });

  describe('listByOrganization', () => {
    it('should throw ForbiddenException if user is not member of organization', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);
      await expect(
        service.listByOrganization('org-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return pending invitations for organization', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'member-1',
      });
      mockPrismaService.invitation.findMany.mockResolvedValue([
        { id: 'inv-1', email: 'test@example.com' },
      ]);

      const result = await service.listByOrganization('org-1', 'user-1');
      expect(result).toHaveLength(1);
      expect(mockPrismaService.invitation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
            status: InvitationStatus.PENDING,
          }),
        }),
      );
    });
  });

  describe('listByWorkspace', () => {
    it('should throw NotFoundException if workspace does not exist', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(null);
      await expect(
        service.listByWorkspace('ws-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not member of workspace or org', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        organizationId: 'org-1',
      });
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.listByWorkspace('ws-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return pending invitations for workspace', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        organizationId: 'org-1',
      });
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue({
        id: 'member-1',
      });
      mockPrismaService.invitation.findMany.mockResolvedValue([
        { id: 'inv-2', email: 'ws-invite@example.com' },
      ]);

      const result = await service.listByWorkspace('ws-1', 'user-1');
      expect(result).toHaveLength(1);
      expect(mockPrismaService.invitation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: 'ws-1',
            status: InvitationStatus.PENDING,
          }),
        }),
      );
    });
  });
});
