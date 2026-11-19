import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/database/prisma.service';
import { AppModule } from '../src/app.module';
import { OrganizationsService } from '../src/modules/organizations/organizations.service';
import { UsersService } from '../src/modules/users/users.service';
import { OrganizationRole } from '@prisma/client';
import { ConflictException } from '@nestjs/common';

describe('Organization Model Database Constraints (Integration)', () => {
  let prisma: PrismaService;
  let organizationsService: OrganizationsService;
  let usersService: UsersService;

  const uniqueId = Date.now();
  let ownerUser: any;
  let secondUser: any;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get<PrismaService>(PrismaService);
    organizationsService = moduleRef.get<OrganizationsService>(OrganizationsService);
    usersService = moduleRef.get<UsersService>(UsersService);

    // Create test users
    ownerUser = await usersService.create({
      email: `org-owner-${uniqueId}@flowspace-test.internal`,
      name: 'Org Owner User',
      passwordHash: '$argon2id$fakehash1',
    });

    secondUser = await usersService.create({
      email: `org-member-${uniqueId}@flowspace-test.internal`,
      name: 'Second Test User',
      passwordHash: '$argon2id$fakehash2',
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.organization.deleteMany({
        where: { slug: { contains: `org-test-${uniqueId}` } },
      });
      await prisma.user.deleteMany({
        where: { email: { contains: `org-` } },
      });
      await prisma.$disconnect();
    }
  });

  it('should create an organization with UUID and auto-assign OWNER membership', async () => {
    const testSlug = `org-test-${uniqueId}-corp`;
    const org = await organizationsService.create(ownerUser.id, {
      name: 'Org Test Corporation',
      slug: testSlug,
      description: 'Test organization for database constraints',
    });

    expect(org.id).toBeDefined();
    expect(org.name).toBe('Org Test Corporation');
    expect(org.slug).toBe(testSlug);
    expect(org.createdBy).toBe(ownerUser.id);
    expect(org.members).toHaveLength(1);
    expect(org.members[0].userId).toBe(ownerUser.id);
    expect(org.members[0].role).toBe(OrganizationRole.OWNER);

    // Verify directly in PostgreSQL via Prisma
    const dbOrg = await prisma.organization.findUnique({
      where: { id: org.id },
      include: { members: true },
    });
    expect(dbOrg).not.toBeNull();
    expect(dbOrg!.members).toHaveLength(1);
    expect(dbOrg!.members[0].role).toBe(OrganizationRole.OWNER);
  });

  it('should enforce unique slug constraint and reject duplicate organization slug', async () => {
    const duplicateSlug = `org-test-${uniqueId}-dup`;

    await organizationsService.create(ownerUser.id, {
      name: 'First Org',
      slug: duplicateSlug,
    });

    await expect(
      organizationsService.create(secondUser.id, {
        name: 'Second Org Same Slug',
        slug: duplicateSlug,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should enforce unique constraint @@unique([organizationId, userId]) preventing duplicate membership', async () => {
    const org = await organizationsService.create(ownerUser.id, {
      name: 'Membership Constraint Org',
      slug: `org-test-${uniqueId}-membership`,
    });

    // Owner is already a member, adding again should throw ConflictException
    await expect(
      organizationsService.addMember(org.id, ownerUser.id, OrganizationRole.MEMBER),
    ).rejects.toThrow(ConflictException);

    // Add second user once -> succeeds
    const member = await organizationsService.addMember(
      org.id,
      secondUser.id,
      OrganizationRole.MEMBER,
    );
    expect(member.userId).toBe(secondUser.id);

    // Try adding second user a second time -> rejects with ConflictException
    await expect(
      organizationsService.addMember(org.id, secondUser.id, OrganizationRole.ADMIN),
    ).rejects.toThrow(ConflictException);
  });

  it('should cascade delete memberships when an organization is deleted', async () => {
    const org = await organizationsService.create(ownerUser.id, {
      name: 'Cascade Delete Test Org',
      slug: `org-test-${uniqueId}-cascade`,
    });

    await organizationsService.addMember(org.id, secondUser.id, OrganizationRole.MEMBER);

    // Verify 2 members exist
    const countBefore = await prisma.organizationMember.count({
      where: { organizationId: org.id },
    });
    expect(countBefore).toBe(2);

    // Delete organization
    await prisma.organization.delete({
      where: { id: org.id },
    });

    // Verify cascade deleted all memberships
    const countAfter = await prisma.organizationMember.count({
      where: { organizationId: org.id },
    });
    expect(countAfter).toBe(0);
  });
});
