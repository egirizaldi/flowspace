import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Organization, OrganizationMember, OrganizationRole } from '@prisma/client';
import { CreateOrganizationDto } from './dto/create-organization.dto';

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
}
