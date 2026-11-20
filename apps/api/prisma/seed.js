/**
 * FlowSpace — Comprehensive Database Seeder
 * Populates realistic organizations, workspaces, projects, kanban statuses,
 * labels, tasks, subtasks, markdown comments, activity logs, and notifications.
 */

const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function hashPassword(plain) {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

async function main() {
  console.log('🌱 Starting FlowSpace Comprehensive Seed...');

  const defaultPasswordHash = await hashPassword('Password123!');

  // =========================================================================
  // 1. Users
  // =========================================================================
  console.log('👤 Seeding Users...');
  const usersData = [
    {
      email: 'alex@flowspace.dev',
      name: 'Alex Morgan',
      passwordHash: defaultPasswordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
    {
      email: 'sarah@flowspace.dev',
      name: 'Sarah Chen',
      passwordHash: defaultPasswordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
    {
      email: 'david@flowspace.dev',
      name: 'David Miller',
      passwordHash: defaultPasswordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
    {
      email: 'elena@flowspace.dev',
      name: 'Elena Rostova',
      passwordHash: defaultPasswordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    },
  ];

  const users = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        passwordHash: u.passwordHash,
        avatarUrl: u.avatarUrl,
      },
      create: u,
    });
    users[u.email] = user;
  }

  const alex = users['alex@flowspace.dev'];
  const sarah = users['sarah@flowspace.dev'];
  const david = users['david@flowspace.dev'];
  const elena = users['elena@flowspace.dev'];

  // =========================================================================
  // 2. Organization
  // =========================================================================
  console.log('🏢 Seeding Organization...');
  const orgSlug = 'acme-technologies';
  let org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Acme Technologies',
        slug: orgSlug,
        createdBy: alex.id,
      },
    });
  }

  // Organization Memberships
  const orgMembers = [
    { userId: alex.id, role: 'OWNER' },
    { userId: sarah.id, role: 'ADMIN' },
    { userId: david.id, role: 'MEMBER' },
    { userId: elena.id, role: 'MEMBER' },
  ];

  for (const m of orgMembers) {
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: m.userId,
        },
      },
      update: { role: m.role },
      create: {
        organizationId: org.id,
        userId: m.userId,
        role: m.role,
      },
    });
  }

  // =========================================================================
  // 3. Workspaces
  // =========================================================================
  console.log('📁 Seeding Workspaces...');
  let wsEngineering = await prisma.workspace.findFirst({
    where: { organizationId: org.id, slug: 'engineering-hub' },
  });

  if (!wsEngineering) {
    wsEngineering = await prisma.workspace.create({
      data: {
        organizationId: org.id,
        name: 'Engineering Hub',
        slug: 'engineering-hub',
        description: 'Core platform engineering, infrastructure, and backend services',
        createdBy: alex.id,
      },
    });
  }

  let wsDesign = await prisma.workspace.findFirst({
    where: { organizationId: org.id, slug: 'product-design' },
  });

  if (!wsDesign) {
    wsDesign = await prisma.workspace.create({
      data: {
        organizationId: org.id,
        name: 'Product & Design Studio',
        slug: 'product-design',
        description: 'Product roadmap, design tokens, and user experience specifications',
        createdBy: alex.id,
      },
    });
  }

  // Workspace Memberships for Engineering
  for (const m of orgMembers) {
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: wsEngineering.id,
          userId: m.userId,
        },
      },
      update: { role: m.role === 'OWNER' ? 'OWNER' : m.role === 'ADMIN' ? 'ADMIN' : 'MEMBER' },
      create: {
        workspaceId: wsEngineering.id,
        userId: m.userId,
        role: m.role === 'OWNER' ? 'OWNER' : m.role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
      },
    });
  }

  // =========================================================================
  // 4. Projects
  // =========================================================================
  console.log('🚀 Seeding Projects...');
  let projFS = await prisma.project.findFirst({
    where: { workspaceId: wsEngineering.id, key: 'FS' },
  });

  if (!projFS) {
    projFS = await prisma.project.create({
      data: {
        organizationId: org.id,
        workspaceId: wsEngineering.id,
        name: 'FlowSpace Web & API',
        key: 'FS',
        description: 'Main collaborative SaaS web application and modular monolith REST API',
        createdBy: alex.id,
      },
    });
  }

  let projInfra = await prisma.project.findFirst({
    where: { workspaceId: wsEngineering.id, key: 'INFRA' },
  });

  if (!projInfra) {
    projInfra = await prisma.project.create({
      data: {
        organizationId: org.id,
        workspaceId: wsEngineering.id,
        name: 'Cloud Infrastructure & DevOps',
        key: 'INFRA',
        description: 'Kubernetes deployment, Docker clustering, and monitoring pipeline',
        createdBy: alex.id,
      },
    });
  }

  // Project Members for FlowSpace
  const projMembers = [
    { userId: alex.id, role: 'MANAGER' },
    { userId: sarah.id, role: 'MANAGER' },
    { userId: david.id, role: 'MEMBER' },
    { userId: elena.id, role: 'MEMBER' },
  ];

  for (const pm of projMembers) {
    await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: projFS.id,
          userId: pm.userId,
        },
      },
      update: { role: pm.role },
      create: {
        projectId: projFS.id,
        userId: pm.userId,
        role: pm.role,
      },
    });
  }

  // =========================================================================
  // 5. Project Workflow Statuses (Kanban Columns)
  // =========================================================================
  console.log('📊 Seeding Workflow Statuses...');
  const statusesData = [
    { name: 'Backlog', category: 'TODO', color: '#64748b', position: 10000, isDefault: false },
    { name: 'To Do', category: 'TODO', color: '#3b82f6', position: 20000, isDefault: true },
    { name: 'In Progress', category: 'IN_PROGRESS', color: '#f59e0b', position: 30000, isDefault: false },
    { name: 'In Review', category: 'IN_PROGRESS', color: '#8b5cf6', position: 40000, isDefault: false },
    { name: 'Done', category: 'DONE', color: '#10b981', position: 50000, isDefault: false },
  ];

  const statuses = {};
  for (const s of statusesData) {
    let status = await prisma.projectStatus.findFirst({
      where: { projectId: projFS.id, name: s.name },
    });
    if (!status) {
      status = await prisma.projectStatus.create({
        data: {
          projectId: projFS.id,
          ...s,
        },
      });
    }
    statuses[s.name] = status;
  }

  // =========================================================================
  // 6. Labels
  // =========================================================================
  console.log('🏷️  Seeding Project Labels...');
  const labelsData = [
    { name: 'Frontend', color: '#3b82f6' },
    { name: 'Backend', color: '#10b981' },
    { name: 'Security', color: '#ef4444' },
    { name: 'Bug', color: '#f97316' },
    { name: 'UX/UI', color: '#8b5cf6' },
    { name: 'Performance', color: '#06b6d4' },
  ];

  const labels = {};
  for (const l of labelsData) {
    let label = await prisma.label.findFirst({
      where: { projectId: projFS.id, name: l.name },
    });
    if (!label) {
      label = await prisma.label.create({
        data: {
          projectId: projFS.id,
          name: l.name,
          color: l.color,
        },
      });
    }
    labels[l.name] = label;
  }

  // Clean existing tasks for a fresh comprehensive demo experience
  await prisma.comment.deleteMany({ where: { task: { projectId: projFS.id } } });
  await prisma.activity.deleteMany({ where: { projectId: projFS.id } });
  await prisma.notification.deleteMany({ where: { user: { email: { in: Object.keys(users) } } } });
  await prisma.taskLabel.deleteMany({ where: { task: { projectId: projFS.id } } });
  await prisma.task.deleteMany({ where: { projectId: projFS.id } });

  // =========================================================================
  // 7. Comprehensive Tasks
  // =========================================================================
  console.log('📝 Seeding Comprehensive Tasks...');

  const tasksData = [
    // --- DONE ---
    {
      taskNumber: 1,
      title: 'Implement Argon2id Password Hashing & Opaque Session Tokens',
      description: 'Upgrade the authentication engine to compute Argon2id hashes with memory cost 64MB and parallelism 4. Session tokens are 32-byte cryptographically random hex strings stored with SHA-256 digests in PostgreSQL.',
      statusName: 'Done',
      priority: 'URGENT',
      assignee: alex,
      labels: ['Backend', 'Security'],
      position: 10000,
      completedAt: new Date(Date.now() - 86400000 * 2),
      comments: [
        {
          author: sarah,
          content: 'Benchmark results look great! Argon2id verification takes ~35ms on test machines. Ready to roll out.',
        },
        {
          author: alex,
          content: 'Merged in commit `28ab39c`. Added session invalidation checks in `@flowspace/api`.',
        },
      ],
    },
    {
      taskNumber: 2,
      title: 'Build Interactive Kanban Board with @dnd-kit & Decimal Positioning',
      description: 'Implement column sorting and cross-column card drag-and-drop. Use fractional positioning (`Decimal(65535)`) to eliminate re-indexing overhead.',
      statusName: 'Done',
      priority: 'HIGH',
      assignee: david,
      labels: ['Frontend', 'UX/UI'],
      position: 20000,
      completedAt: new Date(Date.now() - 86400000),
      comments: [
        {
          author: david,
          content: 'Smooth animations added with `@dnd-kit/sortable`! Sensor activation distance is configured to 5px so cards can be clicked easily.',
        },
      ],
    },

    // --- IN REVIEW ---
    {
      taskNumber: 3,
      title: 'Real-Time In-App Notification Center with Badge & Popover Drawer',
      description: 'Provide immediate notification feedback on task assignment and comment mentions. Include unread counter badge, filter tabs ("All" vs "Unread"), and "Mark all as read" capability.',
      statusName: 'In Review',
      priority: 'HIGH',
      assignee: alex,
      labels: ['Frontend', 'Backend'],
      position: 10000,
      comments: [
        {
          author: david,
          content: 'Reviewed the UI popover: looks very clean and responsive! Tested on mobile and desktop breakpoints.',
        },
        {
          author: elena,
          content: 'Security verification passed: verified that non-owners cannot mark another user\'s notification as read.',
        },
      ],
    },
    {
      taskNumber: 4,
      title: 'Task Comments Thread with Markdown Support & @Mention Tagging',
      description: 'Render formatted comment content including **bold**, *italic*, `code`, and highlighted `@mention` tags with relative timestamp display.',
      statusName: 'In Review',
      priority: 'MEDIUM',
      assignee: david,
      labels: ['Frontend', 'UX/UI'],
      position: 20000,
      comments: [
        {
          author: sarah,
          content: 'Looks awesome! Make sure mention suggestions handle spaces in user names gracefully.',
        },
      ],
    },

    // --- IN PROGRESS ---
    {
      taskNumber: 5,
      title: 'Multi-Tenant Role-Based Access Control (RBAC) Hardening',
      description: 'Enforce strict 3-tier boundary validation (Organization -> Workspace -> Project) across all API guards. Reject cross-tenant entity modification with 403 Forbidden.',
      statusName: 'In Progress',
      priority: 'URGENT',
      assignee: sarah,
      labels: ['Security', 'Backend'],
      position: 10000,
      comments: [
        {
          author: sarah,
          content: 'Adding test suite `security-isolation.e2e-spec.ts` covering IDOR, viewer role restrictions, and session revocation.',
        },
      ],
    },
    {
      taskNumber: 6,
      title: 'Multi-Faceted Board Filtering Bar (Priority, Assignee, Label, Due Date)',
      description: 'Equip the Kanban board with instant client-side and backend-synchronized filtering. Support combining multiple criteria with one-click filter reset.',
      statusName: 'In Progress',
      priority: 'MEDIUM',
      assignee: david,
      labels: ['Frontend'],
      position: 20000,
      comments: [],
    },

    // --- TO DO ---
    {
      taskNumber: 7,
      title: 'Redis Integration & BullMQ Worker for Asynchronous Background Jobs',
      description: 'Offload transactional email sending (invitations, password resets) and heavy webhook deliveries to dedicated Redis-backed BullMQ queues.',
      statusName: 'To Do',
      priority: 'HIGH',
      assignee: sarah,
      labels: ['Backend', 'Performance'],
      position: 10000,
      comments: [],
    },
    {
      taskNumber: 8,
      title: 'Audit Log Timeline UI & Activity History Drawer',
      description: 'Present the chronological activity trail inside the Task Detail Modal with actor avatars, timestamps, and contextual action badges.',
      statusName: 'To Do',
      priority: 'MEDIUM',
      assignee: alex,
      labels: ['Frontend', 'Backend'],
      position: 20000,
      comments: [],
    },

    // --- BACKLOG ---
    {
      taskNumber: 9,
      title: 'Automated Playwright End-to-End Test Suite for Critical Journeys',
      description: 'Write headless browser automation testing user registration, organization creation, project setup, drag-and-drop task movement, and comment posting.',
      statusName: 'Backlog',
      priority: 'MEDIUM',
      assignee: elena,
      labels: ['Security', 'Frontend'],
      position: 10000,
      comments: [],
    },
    {
      taskNumber: 10,
      title: 'Dark/Light Theme Contrast & Semantic Token Polish',
      description: 'Verify accessibility standards (WCAG AAA) across dark mode and light mode, ensuring consistent border-border and bg-surface visual hierarchy.',
      statusName: 'Backlog',
      priority: 'LOW',
      assignee: david,
      labels: ['UX/UI'],
      position: 20000,
      comments: [],
    },
  ];

  for (const t of tasksData) {
    const status = statuses[t.statusName];
    const task = await prisma.task.create({
      data: {
        projectId: projFS.id,
        statusId: status.id,
        taskNumber: t.taskNumber,
        title: t.title,
        description: t.description,
        priority: t.priority,
        assigneeId: t.assignee?.id || null,
        position: t.position,
        completedAt: t.completedAt || null,
        createdBy: alex.id,
        version: 1,
      },
    });

    // Attach Labels
    for (const labelName of t.labels) {
      const labelObj = labels[labelName];
      if (labelObj) {
        await prisma.taskLabel.create({
          data: {
            taskId: task.id,
            labelId: labelObj.id,
          },
        });
      }
    }

    // Log Activity
    await prisma.activity.create({
      data: {
        organizationId: org.id,
        projectId: projFS.id,
        taskId: task.id,
        actorId: alex.id,
        action: 'TASK_CREATED',
        entityType: 'TASK',
        entityId: task.id,
        metadata: {
          title: task.title,
          taskKey: `FS-${task.taskNumber}`,
          statusName: t.statusName,
        },
      },
    });

    if (t.assignee) {
      await prisma.activity.create({
        data: {
          organizationId: org.id,
          projectId: projFS.id,
          taskId: task.id,
          actorId: alex.id,
          action: 'TASK_ASSIGNED',
          entityType: 'TASK',
          entityId: task.id,
          metadata: {
            assigneeName: t.assignee.name,
            newAssigneeId: t.assignee.id,
            taskKey: `FS-${task.taskNumber}`,
          },
        },
      });
    }

    // Add Comments
    for (const c of t.comments) {
      const comment = await prisma.comment.create({
        data: {
          taskId: task.id,
          userId: c.author.id,
          content: c.content,
        },
      });

      await prisma.activity.create({
        data: {
          organizationId: org.id,
          projectId: projFS.id,
          taskId: task.id,
          actorId: c.author.id,
          action: 'COMMENT_ADDED',
          entityType: 'COMMENT',
          entityId: comment.id,
          metadata: {
            commentId: comment.id,
            preview: c.content.slice(0, 100),
            taskKey: `FS-${task.taskNumber}`,
          },
        },
      });
    }
  }

  // =========================================================================
  // 8. Notifications for Alex
  // =========================================================================
  console.log('🔔 Seeding Sample In-App Notifications...');
  const sampleNotifs = [
    {
      userId: alex.id,
      type: 'TASK_ASSIGNED',
      title: 'You were assigned to a task',
      message: 'You were assigned to FS-3: Real-Time In-App Notification Center with Badge & Popover Drawer',
      resourceType: 'TASK',
      resourceId: null,
      isRead: false,
    },
    {
      userId: alex.id,
      type: 'COMMENT_ADDED',
      title: 'New comment on task',
      message: 'Sarah Chen commented on FS-1: Benchmark results look great! Argon2id verification takes ~35ms on test machines.',
      resourceType: 'TASK',
      resourceId: null,
      isRead: false,
    },
    {
      userId: alex.id,
      type: 'COMMENT_ADDED',
      title: 'New comment on task',
      message: 'David Miller commented on FS-3: Reviewed the UI popover: looks very clean and responsive!',
      resourceType: 'TASK',
      resourceId: null,
      isRead: true,
      readAt: new Date(Date.now() - 3600000),
    },
  ];

  for (const n of sampleNotifs) {
    await prisma.notification.create({
      data: n,
    });
  }

  console.log('\n✅ FlowSpace Comprehensive Seed Finished Successfully!');
  console.log('================================================================');
  console.log('🔑 Login Credentials:');
  console.log('   - Alex Morgan (Owner):    alex@flowspace.dev    | Password123!');
  console.log('   - Sarah Chen (Admin):     sarah@flowspace.dev   | Password123!');
  console.log('   - David Miller (Member):  david@flowspace.dev   | Password123!');
  console.log('   - Elena Rostova (Member): elena@flowspace.dev   | Password123!');
  console.log('================================================================');
  console.log('🌐 Web URL: http://localhost:3000');
  console.log('   Target Project: http://localhost:3000/acme-technologies/engineering-hub/FS');
  console.log('================================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
