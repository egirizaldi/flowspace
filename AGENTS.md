# FlowSpace — AI Development Instructions

> Master instructions for AI coding agents working on FlowSpace.

**Project:** FlowSpace  
**Product Type:** Collaborative Project Management SaaS  
**Development Agent:** Google Antigravity  
**Architecture:** Modular Monolith + Monorepo  
**Development Method:** Vertical Slice Development

---

# 1. Project Identity

FlowSpace is a collaborative project management SaaS platform combining:

- Trello-style task management.
- Linear-inspired modern user interface.
- Jira-inspired project and workflow management.

Its primary users are software development teams, including:

- Project Managers.
- Software Developers.
- UI/UX Designers.
- Quality Assurance Engineers.
- Technical Leads.

The product may eventually support freelancers, startups, and other teams.

## Product Vision

Make complex project management feel simple.

## Core User Hierarchy

```text
Organization
    └── Workspace
          └── Project
                └── Task
```

---

# 2. Mandatory Development Principles

Every AI coding agent MUST follow these rules.

1. Read this file before making changes.
2. Read relevant documentation before implementing a feature.
3. Inspect the existing codebase before modifying files.
4. Follow the established architecture.
5. Implement only the requested scope.
6. Do not introduce unnecessary dependencies.
7. Do not rewrite working modules without justification.
8. Do not create duplicate implementations.
9. Do not use mock data as a substitute for backend integration.
10. Run relevant tests after implementation.
11. Report all files changed.
12. Explain important technical decisions.
13. Never claim tests passed if they were not executed.
14. Never silently ignore errors.
15. Never weaken security to make a feature work.

If a requirement conflicts with the existing architecture or documentation, STOP and explain the conflict before proceeding.

---

# 3. Technology Stack

## Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand
- TanStack Query
- React Hook Form
- Zod
- dnd-kit

## Backend

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- Jest
- Swagger/OpenAPI

## Future Infrastructure

- Redis
- Socket.IO
- BullMQ
- Cloudflare R2
- Docker
- GitHub Actions

Do not install future infrastructure dependencies until the relevant feature requires them.

---

# 4. Repository Structure

Follow the established monorepo structure.

```text
flowspace/
│
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── app/
│   │       ├── components/
│   │       ├── features/
│   │       ├── hooks/
│   │       ├── lib/
│   │       ├── providers/
│   │       ├── stores/
│   │       └── styles/
│   │
│   └── api/
│       └── src/
│           ├── modules/
│           ├── common/
│           ├── config/
│           ├── database/
│           ├── integrations/
│           └── main.ts
│
├── packages/
│   └── shared/
│       └── src/
│           ├── types/
│           ├── constants/
│           └── schemas/
│
├── docs/
├── docker/
├── .github/
├── AGENTS.md
├── README.md
└── package.json
```

Do not change the repository structure without a clear technical reason.

---

# 5. Coding Standards

## 5.1 General

- Use TypeScript.
- Prefer explicit types.
- Avoid unnecessary `any`.
- Use meaningful variable names.
- Keep functions focused.
- Avoid excessively large components.
- Avoid duplicated business logic.
- Use consistent naming conventions.
- Follow ESLint and Prettier configuration.

## 5.2 Naming Conventions

| Element | Convention |
|---|---|
| React Components | PascalCase |
| Functions | camelCase |
| Variables | camelCase |
| Constants | UPPER_SNAKE_CASE |
| Database Models | PascalCase |
| Database Tables | snake_case |
| API Endpoints | kebab-case where applicable |
| Files | Follow established module conventions |

## 5.3 React Guidelines

- Use reusable components.
- Separate business logic from UI.
- Avoid unnecessarily large components.
- Use TanStack Query for server state.
- Use Zustand for client-side UI state.
- Use React Hook Form and Zod for forms.
- Include loading, error, and empty states.
- Avoid unnecessary client components.
- Prefer Server Components where appropriate.

## 5.4 NestJS Guidelines

- Keep controllers focused on HTTP handling.
- Put business logic in services.
- Validate incoming DTOs.
- Use guards for authentication and authorization.
- Use Prisma through the established database access layer.
- Handle errors consistently.
- Avoid circular dependencies between modules.

---

# 6. Database Rules

PostgreSQL is the primary source of truth.

Prisma is the ORM.

Mandatory rules:

1. Use UUID primary keys.
2. Use explicit relationships.
3. Define unique constraints.
4. Define foreign keys.
5. Add indexes for important query patterns.
6. Use transactions for multi-table operations.
7. Never modify production database records manually to bypass application rules.
8. Never edit an existing migration that has already been applied in a shared or production environment.
9. Create new migrations for schema changes.
10. Keep Prisma schema and database migrations synchronized.

## Multi-Tenant Rules

Organization is the primary tenant boundary.

Every resource access must be validated against the correct organization and membership scope.

Never trust:
- Organization ID supplied by frontend.
- Workspace ID supplied by frontend.
- Project ID supplied by frontend.
- User ID supplied by frontend.
- Role values supplied by frontend.

Verify resource relationships and authorization on the backend.

## Data Integrity

Ensure:
- Task status belongs to the same project.
- Task assignee has appropriate project access.
- Task labels belong to the same project.
- Subtasks belong to the same project as their parent.
- Workspace belongs to the correct organization.
- Project belongs to the correct workspace.

Use database constraints where possible and transaction-level validation where necessary.

---

# 7. Authentication and Security Rules

FlowSpace uses server-side sessions with opaque tokens.

Requirements:

- Password hashing with Argon2id.
- Random opaque session tokens.
- Store only token hashes in the database.
- Secure HttpOnly cookies.
- Session expiration.
- Session revocation.
- Login rate limiting.
- CSRF protection appropriate to cookie configuration.
- Secure password reset tokens.

Never:
- Store session tokens in localStorage.
- Store plaintext passwords.
- Return password hashes in API responses.
- Trust frontend authorization.
- Expose secret environment variables.
- Log passwords, session tokens, or reset tokens.

## Authorization

Every protected resource must be checked server-side.

Use:
- Authentication guards.
- Permission guards.
- Resource-level authorization checks.
- Membership validation.

Hiding a button in the frontend is not security.

---

# 8. API Development Rules

Base path:

`/api/v1`

Every endpoint must include:

- Request validation.
- Authentication when required.
- Authorization when required.
- Appropriate HTTP status codes.
- Consistent error responses.
- Swagger documentation where applicable.

Do not expose internal database structures unnecessarily.

Do not return sensitive fields such as:
- passwordHash
- tokenHash
- session secrets
- private storage credentials

---

# 9. Frontend UI/UX Rules

Follow the FlowSpace Design System & UI Reference.

## Visual Direction

- Modern.
- Minimalist.
- Professional.
- Linear-inspired.
- Trello-inspired interaction.
- Dark theme as the primary theme.
- Light theme support.

## Design Rules

1. Use semantic design tokens.
2. Maintain consistent spacing.
3. Use reusable UI components.
4. Avoid unnecessary visual decoration.
5. Maintain consistent typography.
6. Support responsive layouts.
7. Include loading states.
8. Include empty states.
9. Include error states.
10. Provide clear user feedback.

Do not invent a different design system for individual pages.

---

# 10. State Management Rules

Use TanStack Query for server state.

Examples:
- Organizations.
- Workspaces.
- Projects.
- Tasks.
- Members.
- Comments.
- Notifications.

Use Zustand for UI state.

Examples:
- Sidebar state.
- Active modal.
- Temporary filters.
- UI preferences.

Avoid storing duplicate server data in multiple state systems.

Invalidate or update query caches after mutations.

---

# 11. Testing Requirements

Every implementation must include appropriate tests.

## Unit Tests

Test:
- Business logic.
- Validation.
- Permission rules.
- Utility functions.

## Integration Tests

Test:
- API endpoints.
- Database operations.
- Authentication.
- Authorization.
- Membership.
- Task operations.

## E2E Tests

Test important user workflows using Playwright.

Critical workflow:

```text
Register
   ↓
Login
   ↓
Create Organization
   ↓
Create Workspace
   ↓
Invite Member
   ↓
Accept Invitation
   ↓
Create Project
   ↓
Create Task
   ↓
Assign Task
   ↓
Update Task Status
   ↓
Add Comment
```

Security tests must include attempts to access resources outside the user's authorized organization or project.

---

# 12. Git Workflow

Use small and meaningful commits.

Suggested format:

```text
feat(auth): implement registration endpoint

feat(projects): add project creation

fix(tasks): validate task status ownership

test(auth): add session expiration tests

refactor(workspaces): simplify membership service

docs(api): update project endpoints
```

Rules:

- Do not commit secrets.
- Do not commit broken code intentionally.
- Do not rewrite Git history unless explicitly requested.
- Review diffs before committing.
- Commit completed logical units.

The AI agent must not push changes to a remote repository without explicit user authorization.

---

# 13. Task Execution Protocol

All development tasks must reference a Task ID from TASK-BREAKDOWN.md.

For each task, follow this workflow.

## Step 1 — Read Documentation

Read:
- AGENTS.md
- Relevant PRD section
- Relevant API specification
- Database design
- Architecture document
- Task Breakdown

## Step 2 — Inspect Existing Code

Check:
- Existing modules.
- Existing components.
- Database schema.
- Dependencies.
- Tests.
- Git status.

Never assume a file or module does not exist without checking.

## Step 3 — Create Implementation Plan

Before coding, report:

1. Task objective.
2. Requirements.
3. Files to create.
4. Files to modify.
5. Database changes.
6. API changes.
7. Security considerations.
8. Testing plan.

Wait for approval if the task requires an undocumented architectural decision, changes security boundaries, or expands scope.

## Step 4 — Implement

Implement only the requested task.

Do not introduce unrelated features.

## Step 5 — Verify

Run:
- Type checking.
- Linting.
- Relevant tests.
- Build when appropriate.

Review the diff.

## Step 6 — Report

Report:

```text
TASK ID:
TASK NAME:

IMPLEMENTATION:
- Completed work.

FILES CREATED:
- List.

FILES MODIFIED:
- List.

DATABASE CHANGES:
- List.

TEST RESULTS:
- Tests executed.
- Passed.
- Failed.
- Not executed.

KNOWN ISSUES:
- List.

STATUS:
- Completed / Blocked / Partially Completed.
```

Never report completion if acceptance criteria remain unmet.

---

# 14. Scope Control

Do not implement future features unless explicitly requested.

MVP includes:

- Authentication.
- User profiles.
- Organization management.
- Workspace management.
- Membership and invitations.
- Project management.
- Task management.
- Kanban board.
- Comments.
- Activity history.
- Basic notifications.
- Basic role-based authorization.

Future features include:

- Advanced sprint management.
- Timeline.
- Calendar.
- Real-time collaboration.
- Automation.
- Advanced analytics.
- AI Project Assistant.

Do not implement these prematurely.

---

# 15. Prohibited Actions

Without explicit approval, the AI agent must not:

1. Delete important project files.
2. Rewrite the entire application.
3. Change the technology stack.
4. Replace the database.
5. Introduce microservices.
6. Remove existing tests.
7. Disable security checks.
8. Modify production infrastructure.
9. Push code to remote repositories.
10. Delete or reset databases.
11. Apply destructive migrations to important data.
12. Install unnecessary dependencies.
13. Add unrelated features.
14. Change established API contracts without documentation updates.

If an action may cause data loss or irreversible changes, stop and request approval.

---

# 16. Documentation Maintenance

Update relevant documentation when:

- API contracts change.
- Database models change.
- Permissions change.
- Architecture changes.
- New features are introduced.
- Deployment requirements change.

Do not silently allow documentation and implementation to drift apart.

---

# 17. Definition of Done

A task is complete only when:

- Requirements are implemented.
- Code follows project standards.
- Database changes are migrated if applicable.
- Authorization is implemented where needed.
- Frontend is integrated with backend where applicable.
- Relevant tests pass.
- No critical type errors remain.
- No critical lint errors remain.
- Documentation is updated.
- Changes have been reviewed.

---

# 18. Final Instruction

You are working on FlowSpace, a long-term SaaS product.

Prioritize:

1. Correctness.
2. Security.
3. Data integrity.
4. Maintainability.
5. User experience.
6. Performance.

Do not optimize for generating the largest amount of code.

Optimize for building a reliable product incrementally.

**One Task → One Implementation → One Verification → One Review.**