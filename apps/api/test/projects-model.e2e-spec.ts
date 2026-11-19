import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/database/prisma.service';
import { AppModule } from '../src/app.module';
import {
  ProjectLifecycleStatus,
  ProjectRole,
  ProjectStatusCategory,
  Prisma,
} from '@prisma/client';

describe('Project Model Database Constraints & Lifecycle (Integration)', () => {
  let prisma: PrismaService;

  const uniqueId = Date.now();
  let user1: any;
  let user2: any;
  let org: any;
  let workspace1: any;
  let workspace2: any;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get<PrismaService>(PrismaService);

    // 1. Create test users
    user1 = await prisma.user.create({
      data: {
        name: 'Project Lead',
        email: `proj-lead-${uniqueId}@flowspace-proj-test.internal`,
        passwordHash: '$argon2id$leadHash1',
      },
    });

    user2 = await prisma.user.create({
      data: {
        name: 'Project Dev',
        email: `proj-dev-${uniqueId}@flowspace-proj-test.internal`,
        passwordHash: '$argon2id$devHash2',
      },
    });

    // 2. Create organization
    org = await prisma.organization.create({
      data: {
        name: `Org for Projects ${uniqueId}`,
        slug: `org-proj-${uniqueId}`,
        createdBy: user1.id,
      },
    });

    // 3. Create two workspaces under the organization
    workspace1 = await prisma.workspace.create({
      data: {
        organizationId: org.id,
        name: `Workspace Alpha ${uniqueId}`,
        slug: `ws-alpha-${uniqueId}`,
        createdBy: user1.id,
      },
    });

    workspace2 = await prisma.workspace.create({
      data: {
        organizationId: org.id,
        name: `Workspace Beta ${uniqueId}`,
        slug: `ws-beta-${uniqueId}`,
        createdBy: user1.id,
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.organization.deleteMany({
        where: { slug: { contains: `-proj-${uniqueId}` } },
      });
      await prisma.user.deleteMany({
        where: { email: { contains: '-proj-test.internal' } },
      });
      await prisma.$disconnect();
    }
  });

  describe('Project Creation & Attributes', () => {
    it('should create a project with all attributes and default status to PLANNING', async () => {
      const startDate = new Date('2026-01-01');
      const dueDate = new Date('2026-06-30');

      const project = await prisma.project.create({
        data: {
          organizationId: org.id,
          workspaceId: workspace1.id,
          name: 'Core Engine Platform',
          key: 'ENG',
          description: 'Core infrastructure and platform engine',
          startDate,
          dueDate,
          createdBy: user1.id,
        },
      });

      expect(project.id).toBeDefined();
      expect(project.organizationId).toBe(org.id);
      expect(project.workspaceId).toBe(workspace1.id);
      expect(project.name).toBe('Core Engine Platform');
      expect(project.key).toBe('ENG');
      expect(project.description).toBe('Core infrastructure and platform engine');
      expect(project.status).toBe(ProjectLifecycleStatus.PLANNING);
      expect(project.startDate).toEqual(startDate);
      expect(project.dueDate).toEqual(dueDate);
      expect(project.createdBy).toBe(user1.id);
      expect(project.createdAt).toBeInstanceOf(Date);
      expect(project.updatedAt).toBeInstanceOf(Date);
      expect(project.archivedAt).toBeNull();
    });

    it('should allow explicitly setting status and lifecycle transitions', async () => {
      const project = await prisma.project.create({
        data: {
          organizationId: org.id,
          workspaceId: workspace1.id,
          name: 'Mobile App',
          key: 'MOB',
          status: ProjectLifecycleStatus.ACTIVE,
          createdBy: user1.id,
        },
      });

      expect(project.status).toBe(ProjectLifecycleStatus.ACTIVE);

      // Transition to ON_HOLD
      const onHold = await prisma.project.update({
        where: { id: project.id },
        data: { status: ProjectLifecycleStatus.ON_HOLD },
      });
      expect(onHold.status).toBe(ProjectLifecycleStatus.ON_HOLD);

      // Transition to COMPLETED with archivedAt
      const now = new Date();
      const completed = await prisma.project.update({
        where: { id: project.id },
        data: {
          status: ProjectLifecycleStatus.COMPLETED,
          archivedAt: now,
        },
      });
      expect(completed.status).toBe(ProjectLifecycleStatus.COMPLETED);
      expect(completed.archivedAt).toEqual(now);
    });
  });

  describe('Project Key Constraints (@@unique([workspaceId, key]))', () => {
    it('should enforce unique project key within the same workspace', async () => {
      // First project with key 'WEB' in workspace1
      await prisma.project.create({
        data: {
          organizationId: org.id,
          workspaceId: workspace1.id,
          name: 'Web Portal',
          key: 'WEB',
          createdBy: user1.id,
        },
      });

      // Duplicate key 'WEB' in the same workspace1 -> must fail
      await expect(
        prisma.project.create({
          data: {
            organizationId: org.id,
            workspaceId: workspace1.id,
            name: 'Another Web Portal',
            key: 'WEB',
            createdBy: user1.id,
          },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should allow the same project key in different workspaces', async () => {
      // Key 'WEB' in workspace2 -> must succeed
      const projInWs2 = await prisma.project.create({
        data: {
          organizationId: org.id,
          workspaceId: workspace2.id,
          name: 'Web Portal for Beta',
          key: 'WEB',
          createdBy: user1.id,
        },
      });

      expect(projInWs2.id).toBeDefined();
      expect(projInWs2.workspaceId).toBe(workspace2.id);
      expect(projInWs2.key).toBe('WEB');
    });
  });

  describe('Project Members (ProjectMember model)', () => {
    it('should assign a user as ProjectMember with a valid role', async () => {
      const project = await prisma.project.create({
        data: {
          organizationId: org.id,
          workspaceId: workspace1.id,
          name: 'API Service',
          key: 'API',
          createdBy: user1.id,
        },
      });

      const member = await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: user1.id,
          role: ProjectRole.MANAGER,
        },
      });

      expect(member.id).toBeDefined();
      expect(member.projectId).toBe(project.id);
      expect(member.userId).toBe(user1.id);
      expect(member.role).toBe(ProjectRole.MANAGER);
      expect(member.joinedAt).toBeInstanceOf(Date);
    });

    it('should enforce unique constraint @@unique([projectId, userId])', async () => {
      const project = await prisma.project.create({
        data: {
          organizationId: org.id,
          workspaceId: workspace1.id,
          name: 'Auth Gateway',
          key: 'AUTH',
          createdBy: user1.id,
        },
      });

      // Add user2 as MEMBER
      await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: user2.id,
          role: ProjectRole.MEMBER,
        },
      });

      // Attempting to add user2 again -> must fail
      await expect(
        prisma.projectMember.create({
          data: {
            projectId: project.id,
            userId: user2.id,
            role: ProjectRole.VIEWER,
          },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Project Statuses (ProjectStatus model)', () => {
    it('should create custom project statuses with categories and positions', async () => {
      const project = await prisma.project.create({
        data: {
          organizationId: org.id,
          workspaceId: workspace1.id,
          name: 'Workflow Engine',
          key: 'WFL',
          createdBy: user1.id,
        },
      });

      // Add default statuses
      await prisma.projectStatus.createMany({
        data: [
          {
            projectId: project.id,
            name: 'Backlog',
            category: ProjectStatusCategory.TODO,
            color: '#64748B',
            position: 0,
            isDefault: false,
          },
          {
            projectId: project.id,
            name: 'Todo',
            category: ProjectStatusCategory.TODO,
            color: '#94A3B8',
            position: 1,
            isDefault: true,
          },
          {
            projectId: project.id,
            name: 'In Progress',
            category: ProjectStatusCategory.IN_PROGRESS,
            color: '#3B82F6',
            position: 2,
            isDefault: false,
          },
          {
            projectId: project.id,
            name: 'Done',
            category: ProjectStatusCategory.DONE,
            color: '#22C55E',
            position: 3,
            isDefault: false,
          },
        ],
      });

      const statuses = await prisma.projectStatus.findMany({
        where: { projectId: project.id },
        orderBy: { position: 'asc' },
      });

      expect(statuses).toHaveLength(4);
      expect(statuses[0].name).toBe('Backlog');
      expect(statuses[1].isDefault).toBe(true);
      expect(statuses[2].category).toBe(ProjectStatusCategory.IN_PROGRESS);
      expect(statuses[3].category).toBe(ProjectStatusCategory.DONE);
    });
  });

  describe('Cascade Deletion', () => {
    it('should cascade delete project members and statuses when project is deleted', async () => {
      const project = await prisma.project.create({
        data: {
          organizationId: org.id,
          workspaceId: workspace1.id,
          name: 'Temporary Project',
          key: 'TEMP',
          createdBy: user1.id,
        },
      });

      await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: user1.id,
          role: ProjectRole.MANAGER,
        },
      });

      await prisma.projectStatus.create({
        data: {
          projectId: project.id,
          name: 'Open',
          category: ProjectStatusCategory.TODO,
          color: '#3B82F6',
          position: 0,
          isDefault: true,
        },
      });

      // Delete project
      await prisma.project.delete({
        where: { id: project.id },
      });

      // Verify members and statuses were cascaded
      const members = await prisma.projectMember.findMany({
        where: { projectId: project.id },
      });
      const statuses = await prisma.projectStatus.findMany({
        where: { projectId: project.id },
      });

      expect(members).toHaveLength(0);
      expect(statuses).toHaveLength(0);
    });

    it('should cascade delete projects when parent workspace is deleted', async () => {
      const tempWs = await prisma.workspace.create({
        data: {
          organizationId: org.id,
          name: 'Ephemeral Workspace',
          slug: `ephemeral-${uniqueId}`,
          createdBy: user1.id,
        },
      });

      const proj = await prisma.project.create({
        data: {
          organizationId: org.id,
          workspaceId: tempWs.id,
          name: 'Ephemeral Project',
          key: 'EPH',
          createdBy: user1.id,
        },
      });

      // Delete workspace
      await prisma.workspace.delete({
        where: { id: tempWs.id },
      });

      // Verify project is deleted
      const found = await prisma.project.findUnique({
        where: { id: proj.id },
      });
      expect(found).toBeNull();
    });
  });
});
