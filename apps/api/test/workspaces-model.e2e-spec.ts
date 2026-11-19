import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/database/prisma.service';
import { AppModule } from '../src/app.module';
import { OrganizationsService } from '../src/modules/organizations/organizations.service';
import { WorkspacesService } from '../src/modules/workspaces/workspaces.service';
import { UsersService } from '../src/modules/users/users.service';
import { WorkspaceRole } from '@prisma/client';
import { ConflictException } from '@nestjs/common';

describe('Workspace Model Database Constraints (Integration)', () => {
  let prisma: PrismaService;
  let orgsService: OrganizationsService;
  let workspacesService: WorkspacesService;
  let usersService: UsersService;

  const uniqueId = Date.now();
  let testUser1: any;
  let testUser2: any;
  let org1: any;
  let org2: any;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get<PrismaService>(PrismaService);
    orgsService = moduleRef.get<OrganizationsService>(OrganizationsService);
    workspacesService = moduleRef.get<WorkspacesService>(WorkspacesService);
    usersService = moduleRef.get<UsersService>(UsersService);

    // Create test users
    testUser1 = await usersService.create({
      email: `ws-user1-${uniqueId}@flowspace-test.internal`,
      name: 'Workspace User One',
      passwordHash: '$argon2id$fake1',
    });

    testUser2 = await usersService.create({
      email: `ws-user2-${uniqueId}@flowspace-test.internal`,
      name: 'Workspace User Two',
      passwordHash: '$argon2id$fake2',
    });

    // Create 2 test organizations
    org1 = await orgsService.create(testUser1.id, {
      name: `Org 1 ${uniqueId}`,
      slug: `org1-ws-${uniqueId}`,
    });

    org2 = await orgsService.create(testUser2.id, {
      name: `Org 2 ${uniqueId}`,
      slug: `org2-ws-${uniqueId}`,
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.organization.deleteMany({
        where: { slug: { contains: `-ws-${uniqueId}` } },
      });
      await prisma.user.deleteMany({
        where: { email: { contains: 'ws-user' } },
      });
      await prisma.$disconnect();
    }
  });

  it('should create a workspace under an organization and auto-assign OWNER membership', async () => {
    const ws = await workspacesService.create(org1.id, testUser1.id, {
      name: 'Frontend Team',
      slug: `frontend-${uniqueId}`,
      description: 'Main frontend development workspace',
    });

    expect(ws.id).toBeDefined();
    expect(ws.organizationId).toBe(org1.id);
    expect(ws.name).toBe('Frontend Team');
    expect(ws.slug).toBe(`frontend-${uniqueId}`);
    expect(ws.createdBy).toBe(testUser1.id);
    expect(ws.members).toHaveLength(1);
    expect(ws.members[0].userId).toBe(testUser1.id);
    expect(ws.members[0].role).toBe(WorkspaceRole.OWNER);

    // Verify in PostgreSQL via Prisma
    const dbWs = await prisma.workspace.findUnique({
      where: { id: ws.id },
      include: { members: true },
    });
    expect(dbWs).not.toBeNull();
    expect(dbWs!.organizationId).toBe(org1.id);
    expect(dbWs!.members[0].role).toBe(WorkspaceRole.OWNER);
  });

  it('should enforce unique slug within same organization, but allow same slug in different organizations', async () => {
    const sharedSlug = `shared-eng-${uniqueId}`;

    // Create in Org 1
    await workspacesService.create(org1.id, testUser1.id, {
      name: 'Engineering in Org 1',
      slug: sharedSlug,
    });

    // Duplicate in Org 1 -> must fail
    await expect(
      workspacesService.create(org1.id, testUser1.id, {
        name: 'Another Engineering in Org 1',
        slug: sharedSlug,
      }),
    ).rejects.toThrow(ConflictException);

    // Same slug in Org 2 -> must succeed (per-organization scoped slug)
    const wsInOrg2 = await workspacesService.create(org2.id, testUser2.id, {
      name: 'Engineering in Org 2',
      slug: sharedSlug,
    });
    expect(wsInOrg2.slug).toBe(sharedSlug);
    expect(wsInOrg2.organizationId).toBe(org2.id);
  });

  it('should enforce unique @@unique([workspaceId, userId]) preventing duplicate workspace membership', async () => {
    const ws = await workspacesService.create(org1.id, testUser1.id, {
      name: 'Membership Test Workspace',
      slug: `membership-ws-${uniqueId}`,
    });

    // testUser1 is already OWNER -> adding again should fail
    await expect(
      workspacesService.addMember(ws.id, testUser1.id, WorkspaceRole.MEMBER),
    ).rejects.toThrow(ConflictException);

    // Add testUser2 -> succeeds
    const member = await workspacesService.addMember(
      ws.id,
      testUser2.id,
      WorkspaceRole.MEMBER,
    );
    expect(member.userId).toBe(testUser2.id);

    // Add testUser2 a second time -> fails
    await expect(
      workspacesService.addMember(ws.id, testUser2.id, WorkspaceRole.ADMIN),
    ).rejects.toThrow(ConflictException);
  });

  it('should cascade delete workspaces and members when parent organization is deleted', async () => {
    const tempOrg = await orgsService.create(testUser1.id, {
      name: `Temp Org Cascade ${uniqueId}`,
      slug: `temp-cascade-${uniqueId}`,
    });

    const tempWs = await workspacesService.create(tempOrg.id, testUser1.id, {
      name: 'Temp Workspace',
      slug: `temp-ws-${uniqueId}`,
    });

    // Verify workspace exists
    const wsBefore = await prisma.workspace.findUnique({ where: { id: tempWs.id } });
    expect(wsBefore).not.toBeNull();

    // Delete organization
    await prisma.organization.delete({ where: { id: tempOrg.id } });

    // Verify workspace was cascade deleted
    const wsAfter = await prisma.workspace.findUnique({ where: { id: tempWs.id } });
    expect(wsAfter).toBeNull();

    // Verify workspace member was also cascade deleted
    const wmAfter = await prisma.workspaceMember.findMany({
      where: { workspaceId: tempWs.id },
    });
    expect(wmAfter).toHaveLength(0);
  });
});
