import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { InvitationsService } from '../src/modules/invitations/invitations.service';
import { InvitationStatus } from '@prisma/client';

describe('Invitation Database Model & Service (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let invitationsService: InvitationsService;

  const uniqueId = Date.now();
  const testUser = {
    name: 'Inviter User',
    email: `inviter-${uniqueId}@flowspace-inv-test.internal`,
    passwordHash: 'dummyhash123',
  };

  let userId: string;
  let orgId: string;
  let wsId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    invitationsService =
      moduleFixture.get<InvitationsService>(InvitationsService);
    await app.init();

    // 1. Create inviter user
    const user = await prisma.user.create({
      data: testUser,
    });
    userId = user.id;

    // 2. Create organization
    const org = await prisma.organization.create({
      data: {
        name: `Org ${uniqueId}`,
        slug: `org-${uniqueId}`,
        createdBy: userId,
      },
    });
    orgId = org.id;

    // 3. Create workspace
    const ws = await prisma.workspace.create({
      data: {
        organizationId: orgId,
        name: `WS ${uniqueId}`,
        slug: `ws-${uniqueId}`,
        createdBy: userId,
      },
    });
    wsId = ws.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.invitation.deleteMany({
        where: { email: { contains: '-test.internal' } },
      });
      await prisma.organization.deleteMany({
        where: { slug: { contains: `-${uniqueId}` } },
      });
      await prisma.user.deleteMany({
        where: { email: { contains: '-inv-test.internal' } },
      });
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  it('should create an organization-scoped invitation with hashed token', async () => {
    const inviteeEmail = `invitee1-${uniqueId}@flowspace-inv-test.internal`;
    const { invitation, rawToken } = await invitationsService.create(userId, {
      email: inviteeEmail,
      role: 'MEMBER',
      organizationId: orgId,
    });

    expect(invitation.id).toBeDefined();
    expect(invitation.email).toBe(inviteeEmail);
    expect(invitation.status).toBe(InvitationStatus.PENDING);
    expect(invitation.organizationId).toBe(orgId);
    expect(invitation.workspaceId).toBeNull();
    expect(invitation.tokenHash).not.toBe(rawToken);
    expect(invitation.tokenHash).toBe(invitationsService.hashToken(rawToken));

    // Verify stored in DB
    const dbRecord = await prisma.invitation.findUnique({
      where: { id: invitation.id },
    });
    expect(dbRecord).toBeDefined();
    expect(dbRecord!.tokenHash).toBe(invitationsService.hashToken(rawToken));
  });

  it('should create a workspace-scoped invitation', async () => {
    const inviteeEmail = `invitee2-${uniqueId}@flowspace-inv-test.internal`;
    const { invitation, rawToken } = await invitationsService.create(userId, {
      email: inviteeEmail,
      role: 'ADMIN',
      workspaceId: wsId,
    });

    expect(invitation.workspaceId).toBe(wsId);
    expect(invitation.organizationId).toBeNull();

    // Verify can find valid by raw token
    const found = await invitationsService.findValidByRawToken(rawToken);
    expect(found.id).toBe(invitation.id);
    expect(found.workspaceId).toBe(wsId);
  });

  it('should reject duplicate pending invitation for same email and scope', async () => {
    const inviteeEmail = `invitee3-${uniqueId}@flowspace-inv-test.internal`;
    await invitationsService.create(userId, {
      email: inviteeEmail,
      role: 'MEMBER',
      organizationId: orgId,
    });

    await expect(
      invitationsService.create(userId, {
        email: inviteeEmail,
        role: 'ADMIN',
        organizationId: orgId,
      }),
    ).rejects.toThrow('already exists');
  });

  it('should mark expired invitation and reject retrieval', async () => {
    const inviteeEmail = `invitee-expired-${uniqueId}@flowspace-inv-test.internal`;
    // Create with -1 ms expiration (already expired)
    const { invitation, rawToken } = await invitationsService.create(
      userId,
      {
        email: inviteeEmail,
        role: 'MEMBER',
        organizationId: orgId,
      },
      -1000,
    );

    await expect(
      invitationsService.findValidByRawToken(rawToken),
    ).rejects.toThrow('expired');

    // Verify DB status transitioned to EXPIRED
    const dbRecord = await prisma.invitation.findUnique({
      where: { id: invitation.id },
    });
    expect(dbRecord!.status).toBe(InvitationStatus.EXPIRED);
  });

  it('should cascade delete invitations when organization is deleted', async () => {
    // Create a temporary org and invitation
    const tempOrg = await prisma.organization.create({
      data: {
        name: `Temp Org ${uniqueId}`,
        slug: `temp-org-${uniqueId}`,
        createdBy: userId,
      },
    });

    const { invitation } = await invitationsService.create(userId, {
      email: `temp-inv-${uniqueId}@flowspace-inv-test.internal`,
      role: 'MEMBER',
      organizationId: tempOrg.id,
    });

    // Delete temporary organization
    await prisma.organization.delete({
      where: { id: tempOrg.id },
    });

    // Verify invitation was cascade deleted
    const dbInvitation = await prisma.invitation.findUnique({
      where: { id: invitation.id },
    });
    expect(dbInvitation).toBeNull();
  });
});
