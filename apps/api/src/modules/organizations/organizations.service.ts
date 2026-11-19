import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Organization, OrganizationMember, OrganizationRole } from '@prisma/client';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  generateSlug(name: string): string {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    return slug || 'org';
  }

  async create(
    userId: string,
    dto: CreateOrganizationDto,
  ): Promise<Organization & { members: OrganizationMember[] }> {
    const slug = dto.slug
      ? dto.slug.toLowerCase().trim()
      : this.generateSlug(dto.name);

    const existingSlug = await this.prisma.organization.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      throw new ConflictException('Organization with this slug already exists');
    }

    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.name.trim(),
          slug,
          description: dto.description?.trim() ?? null,
          logoUrl: dto.logoUrl ?? null,
          createdBy: userId,
        },
      });

      const member = await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId,
          role: OrganizationRole.OWNER,
        },
      });

      return {
        ...organization,
        members: [member],
      };
    });
  }

  async findById(id: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: true,
            workspaces: true,
          },
        },
      },
    });
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({
      where: { slug: slug.toLowerCase().trim() },
    });
  }

  async findMember(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember | null> {
    return this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });
  }

  async addMember(
    organizationId: string,
    userId: string,
    role: OrganizationRole = OrganizationRole.MEMBER,
  ): Promise<OrganizationMember> {
    const existing = await this.findMember(organizationId, userId);
    if (existing) {
      throw new ConflictException('User is already a member of this organization');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return this.prisma.organizationMember.create({
      data: {
        organizationId,
        userId,
        role,
      },
    });
  }

  async listUserOrganizations(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                members: true,
                workspaces: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((m) => ({
      ...m.organization,
      userRole: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  async findByIdForUser(organizationId: string, userId: string) {
    const member = await this.findMember(organizationId, userId);
    if (!member) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            members: true,
            workspaces: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return {
      ...org,
      currentUserRole: member.role,
    };
  }

  async update(
    organizationId: string,
    userId: string,
    dto: UpdateOrganizationDto,
  ): Promise<Organization> {
    const member = await this.findMember(organizationId, userId);
    if (!member) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    if (
      member.role !== OrganizationRole.OWNER &&
      member.role !== OrganizationRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only organization owners and admins can update organization details',
      );
    }

    return this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        description: dto.description !== undefined ? dto.description?.trim() ?? null : undefined,
        logoUrl: dto.logoUrl !== undefined ? dto.logoUrl : undefined,
      },
    });
  }

  async delete(organizationId: string, userId: string): Promise<boolean> {
    const member = await this.findMember(organizationId, userId);
    if (!member) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    if (member.role !== OrganizationRole.OWNER) {
      throw new ForbiddenException(
        'Only the organization owner can delete the organization',
      );
    }

    await this.prisma.organization.delete({
      where: { id: organizationId },
    });

    return true;
  }
}
