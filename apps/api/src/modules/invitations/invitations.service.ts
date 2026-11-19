import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Invitation, InvitationStatus } from '@prisma/client';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import * as crypto from 'crypto';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface CreateInvitationResult {
  invitation: Invitation;
  rawToken: string;
}

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  generateRawToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async create(
    invitedBy: string,
    dto: CreateInvitationDto,
    expiresInMs: number = SEVEN_DAYS_MS,
  ): Promise<CreateInvitationResult> {
    const email = dto.email.toLowerCase().trim();

    // 1. Validate scope: At least one target scope must be provided
    if (!dto.organizationId && !dto.workspaceId && !dto.projectId) {
      throw new BadRequestException(
        'Invitation must target an organization, workspace, or project',
      );
    }

    // 2. Validate target scope existence
    if (dto.organizationId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: dto.organizationId },
      });
      if (!org) {
        throw new NotFoundException('Target organization not found');
      }
    }

    if (dto.workspaceId) {
      const ws = await this.prisma.workspace.findUnique({
        where: { id: dto.workspaceId },
      });
      if (!ws) {
        throw new NotFoundException('Target workspace not found');
      }
    }

    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: dto.projectId },
      });
      if (!project) {
        throw new NotFoundException('Target project not found');
      }
    }

    // 3. Check for existing pending invitation with same email and scope
    const existing = await this.prisma.invitation.findFirst({
      where: {
        email,
        status: InvitationStatus.PENDING,
        organizationId: dto.organizationId ?? null,
        workspaceId: dto.workspaceId ?? null,
        projectId: dto.projectId ?? null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existing) {
      throw new ConflictException(
        'An active pending invitation for this email and scope already exists',
      );
    }

    // 4. Generate token and hash
    const rawToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + expiresInMs);

    // 5. Persist invitation
    const invitation = await this.prisma.invitation.create({
      data: {
        email,
        tokenHash,
        organizationId: dto.organizationId ?? null,
        workspaceId: dto.workspaceId ?? null,
        projectId: dto.projectId ?? null,
        role: dto.role,
        status: InvitationStatus.PENDING,
        invitedBy,
        expiresAt,
      },
      include: {
        organization: true,
        workspace: true,
        project: true,
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      invitation,
      rawToken,
    };
  }

  async findValidByRawToken(rawToken: string): Promise<Invitation> {
    const tokenHash = this.hashToken(rawToken);

    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
      include: {
        organization: true,
        workspace: true,
        project: true,
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invalid invitation token');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `Invitation is no longer pending (status: ${invitation.status})`,
      );
    }

    // Check expiration
    if (new Date() > invitation.expiresAt) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestException('Invitation has expired');
    }

    return invitation;
  }

  async findById(id: string): Promise<Invitation | null> {
    return this.prisma.invitation.findUnique({
      where: { id },
      include: {
        organization: true,
        workspace: true,
        project: true,
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async revoke(id: string, userId: string): Promise<Invitation> {
    const invitation = await this.findById(id);
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `Cannot revoke invitation with status ${invitation.status}`,
      );
    }

    // Only inviter can revoke directly
    if (invitation.invitedBy !== userId) {
      throw new ForbiddenException(
        'You do not have permission to revoke this invitation',
      );
    }

    return this.prisma.invitation.update({
      where: { id },
      data: {
        status: InvitationStatus.REVOKED,
        revokedAt: new Date(),
      },
    });
  }

  async accept(rawToken: string, userId: string): Promise<Invitation> {
    const invitation = await this.findValidByRawToken(rawToken);

    return this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });
  }
}
