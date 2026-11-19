# FlowSpace — Task Breakdown

**Version:** 1.0  
**Development Method:** Vertical Slice Development  
**AI Agent:** Google Antigravity

## 1. Task Execution Standard

Setiap task yang diberikan kepada Antigravity wajib memiliki:

1. Task ID.
2. Objective.
3. Scope.
4. Technical requirements.
5. Files or modules involved.
6. Acceptance criteria.
7. Testing requirements.
8. Expected deliverables.

Antigravity tidak boleh mengubah modul di luar scope tanpa alasan teknis yang dijelaskan terlebih dahulu.

---

# 2. Phase 0 — Project Foundation

### FS-001 — Initialize Repository

Objective:
Membuat repository utama FlowSpace.

Tasks:
- Initialize Git.
- Create README.md.
- Create documentation folders.
- Create AGENTS.md placeholder.
- Configure .gitignore.

Acceptance Criteria:
- Repository memiliki struktur awal.
- File sensitif tidak masuk Git.
- README menjelaskan tujuan project.

### FS-002 — Setup Monorepo

Objective:
Menyiapkan struktur monorepo.

Target structure:

```text
flowspace/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   └── shared/
├── docs/
├── docker/
├── AGENTS.md
├── package.json
└── README.md
```

Acceptance Criteria:
- Frontend dan backend berada dalam satu repository.
- Package management konsisten.
- Shared package tersedia untuk kebutuhan bersama.

### FS-003 — Setup Next.js

Objective:
Menyiapkan frontend FlowSpace.

Tasks:
- Install Next.js.
- Configure TypeScript.
- Configure Tailwind CSS.
- Install shadcn/ui.
- Configure ESLint.
- Configure Prettier.

Acceptance Criteria:
- Next.js berjalan.
- TypeScript berjalan.
- Tailwind CSS berfungsi.
- Komponen dasar dapat digunakan.

### FS-004 — Setup NestJS

Objective:
Menyiapkan backend FlowSpace.

Tasks:
- Initialize NestJS.
- Configure TypeScript.
- Configure environment variables.
- Configure validation.
- Configure global exception handling.
- Configure API prefix `/api/v1`.

Acceptance Criteria:
- NestJS berjalan.
- Health endpoint tersedia.
- Validation dan exception handling aktif.

### FS-005 — Setup PostgreSQL & Prisma

Objective:
Menyiapkan database.

Tasks:
- Configure PostgreSQL.
- Install Prisma.
- Configure database connection.
- Create initial migration.
- Create database health check.

Acceptance Criteria:
- Backend dapat terhubung dengan database.
- Prisma migration berhasil.
- Database connection dapat diverifikasi.

### FS-006 — Frontend and Backend Integration

Objective:
Menghubungkan frontend dan backend.

Tasks:
- Configure API base URL.
- Configure API client.
- Configure CORS.
- Configure error response handling.

Acceptance Criteria:
- Frontend dapat memanggil health endpoint.
- Error response dapat ditangani dengan konsisten.

### FS-007 — Testing Foundation

Objective:
Menyiapkan testing.

Tasks:
- Configure Jest.
- Configure frontend testing.
- Configure Playwright.
- Create sample unit test.
- Create sample API test.

Acceptance Criteria:
- Unit test berjalan.
- API test berjalan.
- Playwright dapat menjalankan browser test.

---

# 3. Phase 1 — Authentication

### FS-008 — Database User Model

Objective:
Membuat model user.

Data:
- id
- name
- email
- passwordHash
- avatarUrl
- emailVerifiedAt
- createdAt
- updatedAt

Acceptance Criteria:
- Prisma schema valid.
- Migration berhasil.
- Email memiliki unique constraint.

### FS-009 — Registration API

Objective:
Membuat endpoint registrasi.

Endpoint:
`POST /api/v1/auth/register`

Requirements:
- Validate name.
- Validate email.
- Validate password.
- Hash password.
- Prevent duplicate email.

Acceptance Criteria:
- User berhasil dibuat.
- Password tidak disimpan dalam bentuk plaintext.
- Email duplikat ditolak.

### FS-010 — Login API

Objective:
Membuat login.

Endpoint:
`POST /api/v1/auth/login`

Requirements:
- Validate credentials.
- Verify password hash.
- Create secure session.
- Return appropriate response.

Acceptance Criteria:
- Login berhasil dengan kredensial valid.
- Kredensial salah ditolak.
- Session memiliki expiration policy.

### FS-011 — Logout API

Endpoint:
`POST /api/v1/auth/logout`

Acceptance Criteria:
- Session aktif dicabut.
- Session yang sudah dicabut tidak dapat digunakan kembali.

### FS-012 — Authentication Middleware

Objective:
Melindungi endpoint privat.

Requirements:
- Authentication guard.
- Session validation.
- User context injection.

Acceptance Criteria:
- Endpoint privat menolak request tanpa session valid.
- User context tersedia pada request terautentikasi.

### FS-013 — Authentication UI

Pages:
- Login.
- Register.
- Forgot password.
- Reset password.

Acceptance Criteria:
- Form memiliki validation.
- Loading state tersedia.
- Error message jelas.
- Responsive design diterapkan.

### FS-014 — User Profile

Features:
- View profile.
- Update name.
- Update avatar.

Acceptance Criteria:
- Perubahan tersimpan di database.
- User tidak dapat mengubah profile user lain.

---

# 4. Phase 2 — Organization & Workspace

### FS-015 — Organization Database Models

Models:
- Organization.
- OrganizationMember.

Acceptance Criteria:
- Relationship valid.
- Owner memiliki membership.
- Constraint mencegah membership duplikat.

### FS-016 — Create Organization API

Endpoint:
`POST /api/v1/organizations`

Acceptance Criteria:
- Organization berhasil dibuat.
- Creator menjadi owner.
- Organization membership otomatis dibuat.

### FS-017 — Organization Management API

Endpoints:
- GET organizations.
- GET organization detail.
- PATCH organization.
- DELETE organization.

Acceptance Criteria:
- Authorization diterapkan.
- Pengguna tidak dapat mengakses organization lain.
- Penghapusan mengikuti aturan ownership.

### FS-018 — Workspace Database Models

Models:
- Workspace.
- WorkspaceMember.

Acceptance Criteria:
- Workspace memiliki relasi dengan organization.
- Membership memiliki role.
- Constraint mencegah membership duplikat.

### FS-019 — Workspace Management API

Endpoints:
- POST /api/v1/organizations/:organizationId/workspaces
- GET /api/v1/organizations/:organizationId/workspaces
- GET /api/v1/workspaces/:workspaceId
- PATCH /api/v1/workspaces/:workspaceId
- DELETE /api/v1/workspaces/:workspaceId

Acceptance Criteria:
- Workspace dapat dibuat.
- Workspace hanya dapat dikelola oleh pengguna berwenang.
- Workspace tidak dapat diakses lintas organization.

### FS-020 — Organization & Workspace UI

Pages:
- Organization selector.
- Organization overview.
- Workspace overview.
- Workspace selector.
- Workspace settings.

Acceptance Criteria:
- Pengguna dapat berpindah organization.
- Pengguna dapat berpindah workspace.
- Data mengikuti organization dan workspace yang dipilih.

---

# 5. Phase 3 — Membership & Invitation

### FS-021 — Invitation Database Model

Fields:
- id
- email
- tokenHash
- organizationId
- workspaceId
- projectId
- role
- status
- expiresAt
- acceptedAt
- createdBy

Acceptance Criteria:
- Invitation memiliki scope yang jelas.
- Token disimpan dalam bentuk hash.
- Invitation memiliki expiration.

### FS-022 — Create Invitation API

Endpoints:
- `POST /api/v1/organizations/:organizationId/invitations`
- `POST /api/v1/workspaces/:workspaceId/invitations`
- `POST /api/v1/projects/:projectId/invitations`

Acceptance Criteria:
- Hanya role yang berwenang dapat mengundang.
- Email tervalidasi.
- Invitation memiliki masa berlaku.
- Invitation token tidak dikirim kembali dalam bentuk plaintext setelah proses awal.

### FS-023 — Accept Invitation API

Endpoint:
`POST /api/v1/invitations/accept`

Acceptance Criteria:
- Token valid dapat diterima.
- Token kedaluwarsa ditolak.
- Token yang telah digunakan tidak dapat digunakan kembali.
- Membership dibuat sesuai scope undangan.

### FS-024 — Invitation Management UI

Pages:
- Invite member dialog.
- Pending invitations.
- Accept invitation page.
- Member management.

Acceptance Criteria:
- Admin dapat mengundang anggota.
- Pengguna dapat menerima undangan.
- Status invitation ditampilkan dengan benar.

---

# 6. Phase 4 — Project Management

### FS-025 — Project Database Model

Fields:
- id
- workspaceId
- name
- key
- description
- status
- startDate
- dueDate
- createdBy
- createdAt
- updatedAt
- archivedAt

Acceptance Criteria:
- Project memiliki workspace.
- Project key unik dalam scope yang ditentukan.
- Project memiliki status dan lifecycle date.

### FS-026 — Create Project API

Endpoint:
`POST /api/v1/workspaces/:workspaceId/projects`

Acceptance Criteria:
- Project dapat dibuat.
- Creator memiliki akses sesuai aturan membership.
- Project key dibuat secara konsisten.

### FS-027 — Project CRUD API

Endpoints:
- GET projects.
- GET project detail.
- PATCH project.
- DELETE project.
- POST archive project.
- POST restore project.

Acceptance Criteria:
- CRUD berfungsi.
- Authorization diperiksa.
- Archived project mengikuti kebijakan akses yang ditentukan.

### FS-028 — Project Membership

Features:
- Add project member.
- Remove project member.
- Update project role.
- List project members.

Acceptance Criteria:
- Project membership konsisten.
- Perubahan role dibatasi oleh permission.
- Pengguna yang dihapus kehilangan akses project.

### FS-029 — Project UI

Pages:
- Project list.
- Create project dialog.
- Project overview.
- Project settings.
- Project members.

Acceptance Criteria:
- Project dapat dibuat melalui UI.
- Project dapat diperbarui.
- Project dapat diarsipkan.

---

# 7. Phase 5 — Task Management

### FS-030 — Task Database Model

Fields:
- id
- projectId
- parentTaskId
- taskNumber
- title
- description
- statusId
- priority
- assigneeId
- startDate
- dueDate
- position
- version
- createdBy
- createdAt
- updatedAt
- completedAt
- deletedAt

Acceptance Criteria:
- Task terhubung dengan project.
- Subtask dapat terhubung dengan parent task.
- taskNumber unik dalam project.
- Status dan priority tervalidasi.
- Single Assignee per task dengan versioning (optimistic concurrency).

### FS-031 — Task Status Configuration

Features:
- Seed 5 default statuses (Backlog, Todo, In Progress, In Review, Done).
- Create status.
- Update status.
- Delete status.
- Reorder status.

Acceptance Criteria:
- Setiap project memiliki workflow status.
- Status yang digunakan task tidak dapat dihapus tanpa migrasi status task tersebut.

### FS-032 — Create Task API

Endpoint:
`POST /api/v1/projects/:projectId/tasks`

Acceptance Criteria:
- Task dapat dibuat.
- Task memiliki project valid.
- User memiliki permission untuk membuat task.
- taskNumber dibuat secara otomatis dan konsisten.

### FS-033 — Task CRUD API

Endpoints:
- GET /api/v1/projects/:projectId/tasks
- GET /api/v1/tasks/:taskId
- PATCH /api/v1/tasks/:taskId
- PATCH /api/v1/tasks/:taskId/status
- PATCH /api/v1/tasks/:taskId/assignee
- PATCH /api/v1/tasks/:taskId/move
- DELETE /api/v1/tasks/:taskId

Acceptance Criteria:
- CRUD berfungsi.
- Validasi data diterapkan.
- Authorization diterapkan pada setiap resource.

### FS-034 — Task Assignment

Features:
- Assign user.
- Change assignee.
- Remove assignee.

Acceptance Criteria:
- Assignee harus memiliki akses ke project.
- Perubahan assignment tercatat.

### FS-035 — Task Labels & Subtasks

Features:
- Create labels.
- Assign labels.
- Remove labels.
- Create subtasks.
- Update subtasks.

Acceptance Criteria:
- Label terhubung dengan scope yang benar.
- Subtask tidak dapat membentuk circular parent relationship.

### FS-036 — Task Detail UI

Components:
- Task title.
- Description.
- Status.
- Priority.
- Assignee.
- Due date.
- Labels.
- Subtasks.

Acceptance Criteria:
- Task dapat diperbarui melalui interface.
- Perubahan tersimpan.
- Loading dan error states tersedia.

---

# 8. Phase 6 — Kanban Board

### FS-037 — Kanban Board API

Endpoint:
`GET /api/v1/projects/:projectId/board`

Acceptance Criteria:
- Board menampilkan kolom status.
- Task dikelompokkan sesuai status.
- Task memiliki posisi yang konsisten.

### FS-038 — Kanban UI

Components:
- Kanban board.
- Kanban column.
- Task card.
- Add task button.

Acceptance Criteria:
- Task ditampilkan berdasarkan status.
- Board dapat menampilkan banyak task.
- Empty column memiliki empty state.

### FS-039 — Drag and Drop

Requirements:
- Implement dnd-kit.
- Drag task antarstatus.
- Reorder task.
- Persist position.
- Optimistic update.
- Rollback on failure.

Acceptance Criteria:
- Perubahan tersimpan ke backend.
- Urutan tetap benar setelah refresh.
- API failure tidak meninggalkan UI dalam keadaan tidak konsisten.

### FS-040 — Board Filtering

Features:
- Search task.
- Filter priority.
- Filter assignee.
- Filter label.
- Filter due date.

Acceptance Criteria:
- Filter dapat dikombinasikan.
- Reset filter tersedia.
- Hasil filter konsisten dengan data backend.

---

# 9. Phase 7 — Collaboration

### FS-041 — Comment Database Model

Fields:
- id
- taskId
- userId
- content
- createdAt
- updatedAt
- deletedAt

### FS-042 — Comment API

Endpoints:
- GET comments.
- POST comment.
- PATCH comment.
- DELETE comment.

Acceptance Criteria:
- User dapat menambahkan komentar.
- User hanya dapat mengedit komentar miliknya, kecuali role tertentu memiliki permission tambahan.
- Komentar terhubung dengan task.

### FS-043 — Activity Tracking

Track events:
- Task created.
- Task updated.
- Status changed.
- Assignee changed.
- Priority changed.
- Comment added.

Acceptance Criteria:
- Aktivitas tercatat.
- Activity history dapat diakses sesuai permission.

### FS-044 — Notification Foundation

Features:
- Notification database model.
- List notifications.
- Mark as read.
- Mark all as read.

Acceptance Criteria:
- Notifikasi terkait dengan user.
- User hanya dapat mengakses notifikasinya sendiri.

---

# 10. Phase 8 — MVP Stabilization

### FS-045 — Integration Testing

Test:
- Registration to login.
- Organization creation.
- Workspace creation.
- Invitation acceptance.
- Project creation.
- Task creation.
- Task assignment.
- Task status update.
- Comment creation.

### FS-046 — Security Testing

Test:
- Unauthorized access.
- Cross-organization access.
- Cross-workspace access.
- Cross-project access.
- IDOR attempts.
- Session revocation.
- Invalid invitation token.
- Role escalation.

### FS-047 — UI/UX Review

Review:
- Responsive layout.
- Loading states.
- Empty states.
- Error states.
- Form validation.
- Navigation consistency.
- Accessibility.

### FS-048 — Performance Review

Review:
- Database query performance.
- Pagination.
- N+1 query problems.
- API response size.
- Frontend rendering.
- Kanban board performance.

### FS-049 — MVP Deployment

Tasks:
- Configure production environment.
- Configure database.
- Configure frontend deployment.
- Configure backend deployment.
- Configure domain and HTTPS.
- Configure backups.
- Configure monitoring.

Acceptance Criteria:
- Production deployment berhasil.
- Environment secrets aman.
- Database backup tersedia.
- Main user workflow dapat dijalankan di production.

---

# 11. Phase 9–12 — Future Backlog

Fitur berikut tidak masuk MVP:

| Task ID | Feature |
|---|---|
| FS-050 | List View |
| FS-051 | Backlog Management |
| FS-052 | Sprint Management |
| FS-053 | Task Dependencies |
| FS-054 | Calendar View |
| FS-055 | Timeline View |
| FS-056 | Real-time Collaboration |
| FS-057 | Email Notifications |
| FS-058 | Background Job Processing |
| FS-059 | Automation Rules |
| FS-060 | Project Analytics |
| FS-061 | Team Workload |
| FS-062 | Project Health Monitoring |
| FS-063 | AI Project Assistant |

---

# 12. Definition of Done

Sebuah task dinyatakan selesai jika:

- Implementasi sesuai requirements.
- Database migration tersedia jika diperlukan.
- Backend validation tersedia.
- Authorization sudah diperiksa.
- Frontend terintegrasi dengan backend.
- Loading, empty, dan error states tersedia jika relevan.
- Automated tests berhasil.
- Tidak ada critical lint/type errors.
- Dokumentasi diperbarui.
- Perubahan telah diperiksa sebelum di-merge.

---

# 13. AI Agent Execution Protocol

Ketika menerima task, Antigravity harus:

1. Membaca AGENTS.md.
2. Membaca dokumen requirements terkait.
3. Memeriksa struktur project saat ini.
4. Mengidentifikasi file yang perlu diubah.
5. Menjelaskan rencana implementasi.
6. Mengimplementasikan task sesuai scope.
7. Menjalankan test.
8. Memeriksa hasil perubahan.
9. Melaporkan file yang diubah.
10. Melaporkan hasil test dan pekerjaan yang belum selesai.

Antigravity tidak boleh menganggap task selesai hanya karena kode berhasil dibuat.

---

# 14. Development Rule

**One Task → One Implementation → One Verification → One Commit**

Jangan memberikan seluruh Task Breakdown kepada AI untuk dikerjakan sekaligus.

Mulai dari FS-001, selesaikan, verifikasi, lalu lanjutkan.