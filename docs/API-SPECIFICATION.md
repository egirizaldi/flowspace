# FLOWSPACE
## API Specification Document

**Version:** 1.0  
**Status:** Draft  
**Backend:** NestJS  
**Frontend:** Next.js  
**API Style:** REST API  
**API Version:** v1  
**Database:** PostgreSQL  
**ORM:** Prisma

---

# 1. Introduction

## 1.1 Purpose

Dokumen ini mendefinisikan kontrak komunikasi antara frontend dan backend FlowSpace.

Dokumen ini mencakup:

- API endpoint.
- HTTP methods.
- Request parameters.
- Request body.
- Response format.
- Authentication.
- Authorization.
- Pagination.
- Filtering.
- Sorting.
- Error handling.
- Validation rules.

## 1.2 API Base URL

Development:

```text
http://localhost:3001/api/v1
```

Production:

```text
https://api.flowspace.com/api/v1
```

Production URL merupakan contoh dan dapat disesuaikan ketika deployment.

## 1.3 API Principles

1. Menggunakan REST API.
2. Menggunakan JSON sebagai format pertukaran data.
3. Menggunakan HTTP status code secara konsisten.
4. Menggunakan UUID untuk resource identifiers.
5. Menggunakan pagination pada endpoint list.
6. Menggunakan validation pada setiap input.
7. Menggunakan authentication untuk endpoint privat.
8. Menggunakan authorization berbasis resource.
9. Menggunakan API versioning.
10. Menggunakan consistent response format.

---

# 2. HTTP Methods

| Method | Purpose | Example |
|---|---|---|
| GET | Mengambil data | Get projects |
| POST | Membuat data | Create task |
| PATCH | Memperbarui sebagian data | Update task status |
| PUT | Mengganti seluruh representasi resource | Replace resource |
| DELETE | Menghapus data | Delete task |

Gunakan PATCH untuk sebagian besar operasi update agar perubahan field tidak sengaja menimpa data lain.

---

# 3. Standard Response Format

## 3.1 Successful Response

Format:

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {}
}
```

Contoh:

```json
{
  "success": true,
  "message": "Task retrieved successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Implement authentication",
    "status": "IN_PROGRESS",
    "priority": "HIGH"
  }
}
```

## 3.2 List Response

```json
{
  "success": true,
  "message": "Projects retrieved successfully",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## 3.3 Error Response

```json
{
  "success": false,
  "message": "You do not have permission to perform this action",
  "error": {
    "code": "FORBIDDEN",
    "details": null
  }
}
```

## 3.4 Validation Error

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "email",
        "message": "Invalid email address"
      },
      {
        "field": "password",
        "message": "Password does not meet requirements"
      }
    ]
  }
}
```

---

# 4. HTTP Status Codes

| Status | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

Gunakan 404 untuk resource yang tidak ditemukan atau sengaja disembunyikan dari pengguna yang tidak memiliki akses, sesuai kebijakan keamanan.

---

# 5. Authentication API

Base path:

```text
/auth
```

## 5.1 Register

**POST** `/auth/register`

Membuat akun baru.

Request:

```json
{
  "name": "Egi Rizaldi",
  "email": "egi@example.com",
  "password": "StrongPassword123!"
}
```

Success: `201 Created`

Response:

```json
{
  "success": true,
  "message": "Account created. Please verify your email.",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Egi Rizaldi",
      "email": "egi@example.com",
      "emailVerifiedAt": null
    }
  }
}
```

Rules:

- Email harus valid.
- Email harus unik.
- Password harus memenuhi kebijakan keamanan.
- Password di-hash sebelum disimpan.
- Sistem mengirim email verification.
- Jangan mengembalikan password atau password hash.

## 5.2 Login

**POST** `/auth/login`

Request:

```json
{
  "email": "egi@example.com",
  "password": "StrongPassword123!"
}
```

Success: `200 OK`

Response:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Egi Rizaldi",
      "email": "egi@example.com"
    }
  }
}
```

Session credentials dikirim melalui cookie yang aman, bukan di dalam JSON response.

Rules:

- Kredensial harus valid.
- Akun yang belum diverifikasi harus diarahkan ke proses verifikasi.
- Login memiliki rate limiting.
- Pesan error tidak boleh mengungkap apakah email terdaftar.

## 5.3 Logout

**POST** `/auth/logout`

Mencabut session aktif dan membersihkan cookie.

Success: `204 No Content`

## 5.4 Logout All Sessions

**POST** `/auth/logout-all`

Mencabut seluruh session aktif milik pengguna.

Success: `204 No Content`

## 5.5 Get Current User

**GET** `/auth/me`

Mengambil informasi pengguna yang sedang login.

Response:

```json
{
  "success": true,
  "message": "Current user retrieved",
  "data": {
    "id": "uuid",
    "name": "Egi Rizaldi",
    "email": "egi@example.com",
    "emailVerifiedAt": "2026-11-19T06:00:00.000Z"
  }
}
```

## 5.6 Refresh Session

**POST** `/auth/refresh`

Memperbarui session menggunakan refresh token melalui HttpOnly cookie.

Rules:

- Refresh token harus valid.
- Token harus belum kedaluwarsa.
- Token harus belum dicabut.
- Gunakan refresh token rotation.
- Token lama tidak boleh terus digunakan setelah rotasi berhasil.

## 5.7 Forgot Password

**POST** `/auth/forgot-password`

Request:

```json
{
  "email": "egi@example.com"
}
```

Response harus menggunakan pesan generik untuk mencegah account enumeration.

## 5.8 Reset Password

**POST** `/auth/reset-password`

Request:

```json
{
  "token": "raw-reset-token",
  "newPassword": "NewStrongPassword123!"
}
```

Token diverifikasi menggunakan hash yang tersimpan di database.

Setelah berhasil, session lama dapat dicabut untuk melindungi akun.

## 5.9 Verify Email

**POST** `/auth/verify-email`

Request:

```json
{
  "token": "raw-verification-token"
}
```

## 5.10 Resend Verification Email

**POST** `/auth/resend-verification`

Mengirim ulang email verifikasi dengan rate limiting.

---

# 6. User API

Base path:

```text
/users
```

## 6.1 Get Profile

**GET** `/users/me`

## 6.2 Update Profile

**PATCH** `/users/me`

Request:

```json
{
  "name": "Egi Rizaldi",
  "avatarUrl": "https://example.com/avatar.png"
}
```

## 6.3 Change Password

**PATCH** `/users/me/password`

Request:

```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

Rules:

- Harus memverifikasi password saat ini.
- Password baru harus memenuhi kebijakan keamanan.
- Jangan mengembalikan password dalam response.

---

# 7. Organization API

Base path:

```text
/organizations
```

## 7.1 Create Organization

**POST** `/organizations`

Request:

```json
{
  "name": "FlowSpace Development",
  "slug": "flowspace-development",
  "description": "Development organization"
}
```

Success: `201 Created`

Business rules:

- Pengguna harus login.
- Creator otomatis menjadi Organization Owner.
- Pembuatan organization dan membership dilakukan dalam satu transaction.
- Slug harus unik.

## 7.2 Get My Organizations

**GET** `/organizations`

Mengambil seluruh organisasi yang memiliki membership aktif dengan pengguna.

## 7.3 Get Organization Detail

**GET** `/organizations/:organizationId`

## 7.4 Update Organization

**PATCH** `/organizations/:organizationId`

Request:

```json
{
  "name": "FlowSpace Team",
  "description": "Updated organization description"
}
```

Permission:

- Owner.
- Admin sesuai permission.

## 7.5 Delete Organization

**DELETE** `/organizations/:organizationId`

Operasi ini menggunakan soft deletion atau proses penghapusan terkontrol.

Permission:

- Organization Owner.

Jangan melakukan hard delete secara langsung.

---

# 8. Organization Members API

Base path:

```text
/organizations/:organizationId/members
```

## 8.1 Get Members

**GET** `/organizations/:organizationId/members`

Query:

```text
?page=1&limit=20
```

## 8.2 Get Member Detail

**GET** `/organizations/:organizationId/members/:memberId`

## 8.3 Update Member Role

**PATCH** `/organizations/:organizationId/members/:memberId`

Request:

```json
{
  "role": "ADMIN"
}
```

Rules:

- Hanya pengguna yang memiliki permission dapat mengubah role.
- Owner tidak boleh dihapus melalui perubahan role biasa.
- Pemindahan kepemilikan harus menggunakan operasi khusus.

## 8.4 Remove Member

**DELETE** `/organizations/:organizationId/members/:memberId`

Rules:

- Membership dicabut.
- Session tetap menjadi milik user, tetapi akses organisasi tersebut hilang.
- Workspace dan project yang membutuhkan membership tersebut harus mengikuti aturan akses yang ditetapkan.
- Tidak boleh menghapus data user secara otomatis.

---

# 9. Workspace API

Base path:

```text
/workspaces
```

## 9.1 Create Workspace

**POST** `/organizations/:organizationId/workspaces`

Request:

```json
{
  "name": "Engineering",
  "description": "Engineering workspace"
}
```

Rules:

- Pengguna harus memiliki permission.
- Creator menjadi Workspace Owner.
- Creator harus memiliki membership organisasi.
- Workspace dan membership dibuat dalam satu transaction.

## 9.2 Get Workspaces

**GET** `/organizations/:organizationId/workspaces`

Mengambil workspace yang dapat diakses pengguna.

## 9.3 Get Workspace Detail

**GET** `/workspaces/:workspaceId`

## 9.4 Update Workspace

**PATCH** `/workspaces/:workspaceId`

Request:

```json
{
  "name": "Engineering Team",
  "description": "Updated description"
}
```

## 9.5 Delete Workspace

**DELETE** `/workspaces/:workspaceId`

Gunakan soft deletion atau proses penghapusan terkontrol.

---

# 10. Workspace Members API

Base path:

```text
/workspaces/:workspaceId/members
```

## 10.1 Get Members

**GET** `/workspaces/:workspaceId/members`

## 10.2 Add Member

**POST** `/workspaces/:workspaceId/members`

Request:

```json
{
  "userId": "uuid",
  "role": "MEMBER"
}
```

Rules:

- Pengguna yang ditambahkan harus menjadi anggota organization terkait.
- Actor harus memiliki permission untuk menambahkan anggota.
- Membership tidak boleh duplikat.

## 10.3 Update Member Role

**PATCH** `/workspaces/:workspaceId/members/:memberId`

Request:

```json
{
  "role": "ADMIN"
}
```

## 10.4 Remove Member

**DELETE** `/workspaces/:workspaceId/members/:memberId`

---

# 11. Invitation API

Base path:

```text
/invitations
```

Invitation dapat dibuat pada tingkat organization, workspace, atau project.

## 11.1 Create Organization Invitation

**POST** `/organizations/:organizationId/invitations`

Request:

```json
{
  "email": "developer@example.com",
  "role": "MEMBER"
}
```

## 11.2 Create Workspace Invitation

**POST** `/workspaces/:workspaceId/invitations`

Request:

```json
{
  "email": "developer@example.com",
  "role": "MEMBER"
}
```

## 11.3 Create Project Invitation

**POST** `/projects/:projectId/invitations`

Request:

```json
{
  "email": "developer@example.com",
  "role": "MEMBER"
}
```

## 11.4 Get Invitations

**GET** `/organizations/:organizationId/invitations`

Query:

```text
?status=PENDING&page=1&limit=20
```

## 11.5 Accept Invitation

**POST** `/invitations/accept`

Request:

```json
{
  "token": "raw-invitation-token"
}
```

Rules:

- Token harus valid.
- Invitation harus masih aktif.
- Invitation belum kedaluwarsa.
- Email akun harus cocok dengan email penerima.
- Membership dibuat sesuai scope invitation.
- Acceptance dilakukan dalam database transaction.

## 11.6 Revoke Invitation

**DELETE** `/invitations/:invitationId`

Hanya pengguna yang memiliki permission dapat membatalkan undangan.

---

# 12. Project API

Base path:

```text
/projects
```

## 12.1 Create Project

**POST** `/workspaces/:workspaceId/projects`

Request:

```json
{
  "name": "FlowSpace Web Application",
  "key": "FLOW",
  "description": "Main application development",
  "status": "PLANNING",
  "startDate": "2026-11-19",
  "dueDate": "2027-01-30"
}
```

Rules:

- User harus memiliki permission pada workspace.
- Project key harus unik dalam workspace.
- Creator menjadi Project Manager atau mendapatkan membership yang sesuai.
- Project dan membership dibuat dalam satu transaction.

## 12.2 Get Projects

**GET** `/workspaces/:workspaceId/projects`

Query:

```text
?page=1&limit=20&status=ACTIVE&search=FlowSpace
```

## 12.3 Get Project Detail

**GET** `/projects/:projectId`

## 12.4 Update Project

**PATCH** `/projects/:projectId`

Request:

```json
{
  "name": "FlowSpace Platform",
  "description": "Updated project description",
  "status": "ACTIVE"
}
```

## 12.5 Archive Project

**POST** `/projects/:projectId/archive`

## 12.6 Restore Project

**POST** `/projects/:projectId/restore`

## 12.7 Delete Project

**DELETE** `/projects/:projectId`

Hard deletion harus mengikuti prosedur penghapusan data yang terkontrol.

---

# 13. Project Members API

Base path:

```text
/projects/:projectId/members
```

## 13.1 Get Project Members

**GET** `/projects/:projectId/members`

## 13.2 Add Project Member

**POST** `/projects/:projectId/members`

Request:

```json
{
  "userId": "uuid",
  "role": "MEMBER"
}
```

Rules:

- User harus memiliki akses workspace.
- Actor harus memiliki permission.
- Membership tidak boleh duplikat.

## 13.3 Update Project Member

**PATCH** `/projects/:projectId/members/:memberId`

Request:

```json
{
  "role": "VIEWER"
}
```

## 13.4 Remove Project Member

**DELETE** `/projects/:projectId/members/:memberId`

---

# 14. Task API

Base path:

```text
/tasks
```

## 14.1 Create Task

**POST** `/projects/:projectId/tasks`

Request:

```json
{
  "title": "Implement authentication",
  "description": "Create login and registration functionality",
  "statusId": "uuid",
  "priority": "HIGH",
  "assigneeId": "uuid",
  "startDate": "2026-11-20",
  "dueDate": "2026-11-25"
}
```

Catatan: `statusId` opsional. Jika tidak diisi, backend otomatis menggunakan status default (`Todo`) project tersebut. Single Assignee digunakan untuk MVP; kolaborator tambahan mengikuti task via Watchers.

Success: `201 Created`

Response:

```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "statusId": "uuid",
    "status": {
      "id": "uuid",
      "name": "Todo",
      "category": "TODO",
      "color": "#94A3B8"
    },
    "taskNumber": 1,
    "title": "Implement authentication",
    "priority": "HIGH",
    "position": "1000",
    "version": 1
  }
}
```

Business rules:

- Task harus berada dalam project.
- Assignee harus memiliki akses project.
- Task number dibuat secara aman dan unik dalam project.
- Position ditentukan backend.
- Version dimulai dari 1.

## 14.2 Get Project Tasks

**GET** `/projects/:projectId/tasks`

Query:

```text
?status=TODO
&priority=HIGH
&assigneeId=uuid
&page=1
&limit=50
```

## 14.3 Get Task Detail

**GET** `/tasks/:taskId`

Response dapat mencakup:

- Task information.
- Assignee.
- Creator.
- Labels.
- Comments summary.
- Activity summary.

Detail lengkap dapat menggunakan endpoint terpisah jika ukurannya terlalu besar.

## 14.4 Update Task

**PATCH** `/tasks/:taskId`

Request:

```json
{
  "title": "Implement authentication system",
  "description": "Updated description",
  "priority": "URGENT",
  "dueDate": "2026-11-27",
  "version": 1
}
```

Rules:

- User harus memiliki permission.
- Version harus sesuai dengan versi terbaru.
- Backend memperbarui version setelah berhasil.
- Perubahan penting dicatat dalam activity history.

## 14.5 Update Task Status

**PATCH** `/tasks/:taskId/status`

Request:

```json
{
  "statusId": "uuid",
  "version": 1
}
```

## 14.6 Assign Task

**PATCH** `/tasks/:taskId/assignee`

Request:

```json
{
  "assigneeId": "uuid",
  "version": 2
}
```

Untuk menghapus assignee:

```json
{
  "assigneeId": null,
  "version": 3
}
```

## 14.7 Move Task

**PATCH** `/tasks/:taskId/move`

Request:

```json
{
  "statusId": "uuid",
  "position": "1500.0000000000",
  "version": 2
}
```

Backend harus:

1. Memvalidasi permission.
2. Memvalidasi status tujuan (harus berasal dari project yang sama).
3. Memvalidasi version.
4. Menghitung atau memvalidasi posisi.
5. Memperbarui task dalam transaction.
6. Mengembalikan task terbaru.

Jika terjadi konflik version, gunakan `409 Conflict`.

## 14.8 Delete Task

**DELETE** `/tasks/:taskId`

Task menggunakan soft deletion pada operasi normal.

## 14.9 Get My Tasks

**GET** `/users/me/tasks`

Query:

```text
?statusId=uuid
&priority=HIGH
&page=1
&limit=20
```

Endpoint ini hanya mengembalikan task yang ditugaskan kepada pengguna saat ini dan masih dapat diaksesnya.

---

# 15. Kanban API

Base path:

```text
/projects/:projectId/board
```

## 15.1 Get Board

**GET** `/projects/:projectId/board`

Response:

```json
{
  "success": true,
  "message": "Board retrieved successfully",
  "data": {
    "projectId": "uuid",
    "columns": [
      {
        "id": "uuid-status-1",
        "name": "Backlog",
        "category": "TODO",
        "color": "#64748B",
        "position": 0,
        "tasks": []
      },
      {
        "id": "uuid-status-2",
        "name": "Todo",
        "category": "TODO",
        "color": "#94A3B8",
        "position": 1,
        "tasks": []
      },
      {
        "id": "uuid-status-3",
        "name": "In Progress",
        "category": "IN_PROGRESS",
        "color": "#3B82F6",
        "position": 2,
        "tasks": []
      },
      {
        "id": "uuid-status-4",
        "name": "In Review",
        "category": "IN_PROGRESS",
        "color": "#F59E0B",
        "position": 3,
        "tasks": []
      },
      {
        "id": "uuid-status-5",
        "name": "Done",
        "category": "DONE",
        "color": "#22C55E",
        "position": 4,
        "tasks": []
      }
    ]
  }
}
```

## 15.2 Board Rules

- Task dikelompokkan berdasarkan status.
- Task diurutkan berdasarkan position.
- Data hanya mencakup task yang aktif.
- Backend harus menerapkan authorization.
- Board harus mendukung pagination atau strategi pembatasan data ketika jumlah task besar.

Jangan mengambil seluruh data task tanpa batas.

---

# 16. Subtask API

## 16.1 Create Subtask

**POST** `/tasks/:taskId/subtasks`

Request:

```json
{
  "title": "Create login endpoint",
  "priority": "HIGH"
}
```

Rules:

- Parent task harus valid.
- Subtask harus berada dalam project yang sama.
- Subtask mengikuti authorization project.
- Batasi kedalaman nesting untuk MVP.

## 16.2 Get Subtasks

**GET** `/tasks/:taskId/subtasks`

## 16.3 Update Subtask

**PATCH** `/tasks/:taskId/subtasks/:subtaskId`

## 16.4 Delete Subtask

**DELETE** `/tasks/:taskId/subtasks/:subtaskId`

---

# 17. Label API

Base path:

```text
/projects/:projectId/labels
```

## 17.1 Create Label

**POST** `/projects/:projectId/labels`

Request:

```json
{
  "name": "Bug",
  "color": "#EF4444"
}
```

## 17.2 Get Labels

**GET** `/projects/:projectId/labels`

## 17.3 Update Label

**PATCH** `/projects/:projectId/labels/:labelId`

## 17.4 Delete Label

**DELETE** `/projects/:projectId/labels/:labelId`

## 17.5 Assign Label to Task

**POST** `/tasks/:taskId/labels`

Request:

```json
{
  "labelId": "uuid"
}
```

## 17.6 Remove Label from Task

**DELETE** `/tasks/:taskId/labels/:labelId`

Rules:

- Label harus berasal dari project yang sama dengan task.
- Task dan label harus dapat diakses pengguna.
- Relasi tidak boleh duplikat.

---

# 18. Comment API

Base path:

```text
/tasks/:taskId/comments
```

## 18.1 Create Comment

**POST** `/tasks/:taskId/comments`

Request:

```json
{
  "content": "Authentication endpoint is ready for testing."
}
```

## 18.2 Get Comments

**GET** `/tasks/:taskId/comments`

Query:

```text
?page=1&limit=20&sort=asc
```

## 18.3 Update Comment

**PATCH** `/tasks/:taskId/comments/:commentId`

Request:

```json
{
  "content": "Updated comment"
}
```

## 18.4 Delete Comment

**DELETE** `/tasks/:taskId/comments/:commentId`

Rules:

- Pengguna hanya dapat mengubah komentar miliknya atau komentar yang dapat dikelola melalui permission khusus.
- Comment harus terhubung dengan task yang valid.
- Setiap operasi harus memeriksa akses task.

---

# 19. Activity API

Base path:

```text
/tasks/:taskId/activities
```

## 19.1 Get Task Activities

**GET** `/tasks/:taskId/activities`

Query:

```text
?page=1&limit=20
```

Response:

```json
{
  "success": true,
  "message": "Activities retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "action": "STATUS_CHANGED",
      "fieldName": "status",
      "oldValue": "TODO",
      "newValue": "IN_PROGRESS",
      "createdAt": "2026-11-19T06:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

Activity dibuat oleh backend ketika terjadi perubahan penting. Jangan menyediakan endpoint publik untuk memanipulasi activity history secara langsung.

---

# 20. Notification API

Fitur ini dapat dikembangkan pada Phase 2.

Base path:

```text
/notifications
```

## 20.1 Get Notifications

**GET** `/notifications`

Query:

```text
?page=1&limit=20&unreadOnly=true
```

## 20.2 Get Unread Count

**GET** `/notifications/unread-count`

## 20.3 Mark as Read

**PATCH** `/notifications/:notificationId/read`

## 20.4 Mark All as Read

**PATCH** `/notifications/read-all`

Setiap notification hanya dapat diakses oleh pemiliknya.

---

# 21. Pagination, Filtering, and Sorting

## 21.1 Pagination

Format standar:

```text
?page=1&limit=20
```

Aturan:

- Default page: 1.
- Default limit: 20.
- Maximum limit: 100.
- Page dan limit harus berupa integer positif.

## 21.2 Filtering

Contoh:

```text
?status=IN_PROGRESS
&priority=HIGH
&assigneeId=uuid
```

Backend hanya menerima filter yang telah ditentukan.

Jangan langsung meneruskan query parameter pengguna ke Prisma tanpa validasi.

## 21.3 Sorting

Contoh:

```text
?sortBy=createdAt&sortOrder=desc
```

Allowed fields harus ditentukan per endpoint.

## 21.4 Search

Contoh:

```text
?search=authentication
```

Search harus menggunakan field yang telah ditentukan dan memperhatikan authorization.

---

# 22. Authentication and Authorization Rules

## 22.1 Authentication

Semua endpoint privat harus membutuhkan session yang valid.

Session menggunakan HttpOnly, Secure cookie dengan konfigurasi SameSite yang sesuai.

## 22.2 Authorization

Setiap endpoint harus melakukan:

1. Authenticate user.
2. Identify requested resource.
3. Verify membership.
4. Verify role or permission.
5. Verify resource relationship.
6. Execute operation.

## 22.3 Tenant Isolation

Contoh:

User A merupakan anggota Organization A.

User A tidak boleh membaca:

- Workspace Organization B.
- Project Organization B.
- Task Organization B.
- Comments Organization B.

Meskipun User A mengetahui UUID resource, backend tetap harus menolak akses tersebut.

## 22.4 CSRF Protection

Karena authentication menggunakan cookie, request yang mengubah data harus dilindungi dari CSRF.

Gunakan strategi CSRF yang sesuai dengan arsitektur deployment, termasuk validasi origin dan mekanisme token bila diperlukan.

CORS bukan pengganti CSRF protection.

---

# 23. API Error Codes

| Error Code | Description |
|---|---|
| VALIDATION_ERROR | Input tidak valid |
| INVALID_CREDENTIALS | Login gagal |
| EMAIL_ALREADY_EXISTS | Email sudah digunakan |
| EMAIL_NOT_VERIFIED | Email belum diverifikasi |
| SESSION_EXPIRED | Session kedaluwarsa |
| UNAUTHORIZED | Tidak terautentikasi |
| FORBIDDEN | Tidak memiliki permission |
| RESOURCE_NOT_FOUND | Resource tidak ditemukan |
| ORGANIZATION_NOT_FOUND | Organization tidak ditemukan |
| WORKSPACE_NOT_FOUND | Workspace tidak ditemukan |
| PROJECT_NOT_FOUND | Project tidak ditemukan |
| TASK_NOT_FOUND | Task tidak ditemukan |
| DUPLICATE_RESOURCE | Resource duplikat |
| INVITATION_EXPIRED | Invitation kedaluwarsa |
| INVITATION_REVOKED | Invitation dibatalkan |
| VERSION_CONFLICT | Data mengalami konflik perubahan |
| RATE_LIMIT_EXCEEDED | Request terlalu banyak |
| INTERNAL_SERVER_ERROR | Kesalahan internal |

---

# 24. API Security Requirements

Semua endpoint wajib mengikuti ketentuan:

1. Input validation menggunakan DTO dan validation pipe.
2. Gunakan whitelist validation.
3. Jangan menerima field yang tidak diizinkan.
4. Hindari mass assignment.
5. Gunakan Prisma parameterized queries.
6. Terapkan rate limiting.
7. Gunakan HTTPS pada production.
8. Jangan mengembalikan stack trace kepada client.
9. Jangan mengirim secret melalui response.
10. Terapkan authorization pada setiap resource.
11. Lindungi endpoint berbasis cookie dari CSRF.
12. Catat security-relevant events.
13. Validasi file upload ketika fitur attachment dikembangkan.
14. Batasi ukuran request dan jumlah data yang dikembalikan.

---

# 25. MVP API Priority

Tidak semua endpoint harus dibuat sekaligus.

## Phase 1 — Authentication

- POST /auth/register
- POST /auth/login
- POST /auth/logout
- GET /auth/me
- POST /auth/refresh
- POST /auth/verify-email
- POST /auth/forgot-password
- POST /auth/reset-password

## Phase 2 — Organization & Workspace

- POST /organizations
- GET /organizations
- GET /organizations/:id
- PATCH /organizations/:id
- POST /organizations/:id/workspaces
- GET /organizations/:id/workspaces
- GET /workspaces/:id
- PATCH /workspaces/:id
- GET /workspaces/:id/members

## Phase 3 — Membership & Invitation

- GET /organizations/:id/members
- PATCH /organizations/:id/members/:memberId
- DELETE /organizations/:id/members/:memberId
- POST /organizations/:id/invitations
- POST /invitations/accept
- DELETE /invitations/:id

## Phase 4 — Project

- POST /workspaces/:id/projects
- GET /workspaces/:id/projects
- GET /projects/:id
- PATCH /projects/:id
- POST /projects/:id/archive

## Phase 5 — Task & Kanban

- POST /projects/:id/tasks
- GET /projects/:id/tasks
- GET /tasks/:id
- PATCH /tasks/:id
- PATCH /tasks/:id/status
- PATCH /tasks/:id/assignee
- PATCH /tasks/:id/move
- DELETE /tasks/:id
- GET /projects/:id/board
- GET /users/me/tasks

## Phase 6 — Collaboration

- POST /tasks/:id/comments
- GET /tasks/:id/comments
- PATCH /tasks/:id/comments/:commentId
- DELETE /tasks/:id/comments/:commentId
- GET /tasks/:id/activities

---

# 26. API Testing Requirements

Gunakan integration testing untuk memastikan setiap endpoint berfungsi.

## Authentication Tests

- Register dengan data valid.
- Register dengan email duplikat.
- Login dengan password salah.
- Login dengan email belum diverifikasi.
- Logout.
- Refresh session.
- Reset password dengan token invalid.

## Organization Tests

- Create organization.
- Get organization.
- Update organization.
- User tanpa membership tidak dapat mengakses organization.

## Workspace Tests

- Create workspace.
- Get workspace.
- Update workspace.
- User di luar organization tidak dapat mengakses workspace.

## Project Tests

- Create project.
- Duplicate project key harus ditolak.
- User tanpa permission tidak dapat membuat project.

## Task Tests

- Create task.
- Update task.
- Assign task.
- Update status.
- Move task.
- Duplicate task number harus ditolak.
- Assignee yang tidak memiliki akses project harus ditolak.
- Version conflict harus ditangani.

## Security Tests

- Cross-tenant access.
- IDOR.
- Unauthorized modification.
- Invalid session.
- Role escalation.
- CSRF protection.
- Mass assignment.

---

# 27. API Documentation

FlowSpace menggunakan OpenAPI/Swagger untuk dokumentasi API.

NestJS harus menghasilkan dokumentasi berdasarkan controller, DTO, response schema, dan metadata endpoint.

Development documentation:

```text
http://localhost:3001/api/docs
```

Swagger harus menampilkan:

- Endpoint.
- HTTP method.
- Request schema.
- Response schema.
- Authentication requirements.
- Error responses.
- Parameter descriptions.

Dokumentasi API harus diperbarui ketika kontrak endpoint berubah.

---

# 28. Final API Architecture Decisions

| Area | Decision |
|---|---|
| API Style | REST |
| Versioning | /api/v1 |
| Payload | JSON |
| Authentication | Secure cookie session |
| Authorization | RBAC + resource checks |
| Validation | NestJS DTO |
| Pagination | Page and limit |
| Filtering | Query parameters |
| Sorting | Allowlisted fields |
| Error Format | Standard JSON |
| Documentation | OpenAPI / Swagger |
| ORM | Prisma |
| Database | PostgreSQL |

---

# 29. Final Recommendation

API FlowSpace harus memiliki kontrak yang stabil antara frontend dan backend.

Prinsip yang wajib dipertahankan:

1. Endpoint harus memiliki tanggung jawab jelas.
2. Response harus konsisten.
3. Input harus divalidasi.
4. Authentication dan authorization harus terpisah.
5. Setiap resource harus memeriksa ownership dan membership.
6. Perubahan task harus memperhatikan concurrency.
7. Dokumentasi harus mengikuti implementasi sebenarnya.

**Jangan membangun semua endpoint sekaligus. Implementasikan berdasarkan vertical slice dan pastikan setiap endpoint diuji sebelum berpindah ke modul berikutnya.**

Status dokumen: Draft v1.0. Perlu diselaraskan dengan Database Design, User Roles & Permissions Matrix, dan implementasi aktual sebelum dijadikan kontrak final.