# FlowSpace

> **Organize Work. Move Forward.**  
> Modern, collaborative project management SaaS combining Trello's intuitive Kanban, Linear's sleek UX, and Jira's structured Agile workflows.

---

## 1. Project Overview

FlowSpace is a collaborative work management platform built for modern software engineering teams, designers, product managers, and startups. It provides a structured workspace hierarchy:

$$\text{Organization} \longrightarrow \text{Workspace} \longrightarrow \text{Project} \longrightarrow \text{Task}$$

### Core Capabilities
- **Multi-Tenant Organization & Workspace Isolation**
- **Agile Project Management & Customizable Kanban Boards**
- **Interactive Drag-and-Drop Task Management (dnd-kit)**
- **Session-based Secure HttpOnly Cookie Authentication**
- **Role-Based Access Control (RBAC)**
- **Task Discussions, Comments & Activity Audit Trail**

---

## 2. Technology Stack

### Frontend
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS & shadcn/ui
- **State Management:** TanStack Query (Server State) & Zustand (UI State)
- **Forms & Validation:** React Hook Form & Zod
- **Drag-and-Drop:** dnd-kit

### Backend
- **Framework:** NestJS (Modular Monolith)
- **Language:** TypeScript
- **Database & ORM:** PostgreSQL & Prisma ORM
- **Authentication:** Server-side Sessions (Opaque Hashed Token in HttpOnly Cookies)
- **API Style:** REST API (`/api/v1`) with Swagger/OpenAPI Documentation

### Architecture & Infrastructure
- **Monorepo:** pnpm workspaces & Turborepo
- **Containerization:** Docker & Docker Compose
- **Object Storage (Phase 2):** Cloudflare R2

---

## 3. Repository Structure

```text
flowspace/
├── apps/
│   ├── web/                  # Next.js web application
│   └── api/                  # NestJS backend REST API
├── packages/
│   └── shared/               # Shared types, constants, and Zod schemas
├── docs/                     # Comprehensive product & technical documentation
├── docker/                   # Docker deployment configurations
├── AGENTS.md                 # Master instructions for AI coding agents
├── .env.example              # Environment variables template
├── .gitignore
├── package.json              # Monorepo root configuration
└── README.md
```

---

## 4. Documentation Index

Detailed specifications and architectural guides are maintained in the [`docs/`](./docs) directory:

| Document | Description |
|---|---|
| [docs/PRODUCT-VISION.md](./docs/PRODUCT-VISION.md) | Product vision, target users, and long-term roadmap |
| [docs/PRD.md](./docs/PRD.md) | Product Requirements Document (PRD) & feature specs |
| [docs/SYSTEM-ARCHITECTURE.md](./docs/SYSTEM-ARCHITECTURE.md) | System architecture, security model, and component layout |
| [docs/DATABASE-DESIGN.md](./docs/DATABASE-DESIGN.md) | Relational database schema, ERD, and Prisma specifications |
| [docs/API-SPECIFICATION.md](./docs/API-SPECIFICATION.md) | REST API endpoints, DTO contracts, and error responses |
| [docs/TASK-BREAKDOWN.md](./docs/TASK-BREAKDOWN.md) | Vertical slice development tasks from Phase 0 to Phase 8 |
| [docs/DESIGN-SYSTEM.md](./docs/DESIGN-SYSTEM.md) | UI Design tokens, dark/light theme palettes, and typography |
| [docs/USER-JOURNEY.md](./docs/USER-JOURNEY.md) | User personas, information architecture, and core user flows |
| [docs/USER-ROLES-PERMISSIONS.md](./docs/USER-ROLES-PERMISSIONS.md) | Multi-tenant RBAC permissions matrix |
| [AGENTS.md](./AGENTS.md) | Mandatory protocol and guidelines for AI coding agents |

---

## 5. Development Principles

All development on FlowSpace adheres to the following protocol defined in [AGENTS.md](./AGENTS.md):
- **Vertical Slice Development:** One task from [docs/TASK-BREAKDOWN.md](./docs/TASK-BREAKDOWN.md) at a time.
- **Strict Verification:** Type check, lint, and execute unit/integration tests before committing.
- **Rule of Work:** *One Task → One Implementation → One Verification → One Commit.*
