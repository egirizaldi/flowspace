# FLOWSPACE
## PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Document Version:** 1.0  
**Product Version:** 1.0  
**Product Type:** SaaS Project Management Platform  
**Status:** Product Specification  
**Architecture:** Modular Monolith  
**Frontend:** Next.js  
**Backend:** NestJS  
**Database:** PostgreSQL  

---

# 1. PRODUCT INTRODUCTION

## 1.1 Product Description

FlowSpace merupakan platform manajemen project berbasis SaaS yang membantu individu dan tim dalam mengelola project, task, deadline, workflow, dan kolaborasi dalam satu lingkungan kerja terintegrasi.

FlowSpace menggabungkan fleksibilitas Kanban, kemampuan Agile project management, serta pengalaman antarmuka modern.

Platform menggunakan struktur hierarki:

Organization → Workspace → Project → Task.

Setiap pengguna dapat bergabung dengan beberapa organisasi, mengakses workspace yang diizinkan, serta berkolaborasi dengan anggota tim lainnya.

## 1.2 Product Objectives

Tujuan pengembangan:

1. Menyediakan platform terpusat untuk pengelolaan project.
2. Mempermudah pembagian dan pemantauan pekerjaan.
3. Mendukung kolaborasi antaranggota secara real-time.
4. Menyediakan fleksibilitas workflow.
5. Membantu Project Manager memantau perkembangan project.
6. Menyediakan analitik untuk mengevaluasi kondisi project.

## 1.3 Target Audience

Primary:
- Software Developer.
- Project Manager.
- Product Manager.
- UI/UX Designer.
- Quality Assurance.
- Tech Lead.

Secondary:
- Freelancer.
- Startup.
- Marketing Team.
- Design Team.
- Business Operations.

---

# 2. PRODUCT SCOPE

## 2.1 MVP Scope

MVP merupakan versi pertama yang harus benar-benar dapat digunakan.

Fitur MVP:

1. Authentication.
2. User Profile.
3. Organization Management.
4. Workspace Management.
5. Member Management.
6. Invitation System.
7. Project Management.
8. Kanban Board.
9. Task Management.
10. Task Assignment.
11. Task Priority.
12. Deadline Management.
13. Comments.
14. Basic Activity History.
15. Role-Based Access Control.
16. Responsive Dashboard.

## 2.2 Phase 2 Scope

Collaboration Enhancement:

- Real-time task updates.
- Real-time notifications.
- Notification Center.
- User Mentions.
- File Attachments.
- Task Watchers.
- Task Dependencies.
- List View.
- Calendar View.
- Global Search.

## 2.3 Phase 3 Scope

Advanced Project Management:

- Sprint Management.
- Backlog Management.
- Sprint Planning.
- Timeline View.
- Gantt Chart.
- Workload Management.
- Time Tracking.
- Custom Fields.
- Project Analytics.
- Sprint Reports.

## 2.4 Phase 4 Scope

Advanced Platform:

- AI Project Assistant.
- Project Health Monitoring.
- Advanced Automation.
- Advanced Analytics.
- Two-Factor Authentication.
- External Integrations.
- Subscription Management.

---

# 3. USER ROLES

## 3.1 User

Pengguna terdaftar yang dapat membuat atau bergabung dengan organisasi dan workspace.

## 3.2 Organization Owner

Memiliki kontrol tertinggi terhadap organisasi.

Responsibilities:
- Mengelola organisasi.
- Mengelola anggota.
- Mengelola administrator.
- Mengatur organisasi.
- Mengelola workspace.
- Menghapus organisasi.
- Memindahkan kepemilikan.

## 3.3 Organization Admin

Memiliki kewenangan administratif.

Responsibilities:
- Mengelola anggota organisasi.
- Mengundang anggota.
- Mengelola workspace sesuai kewenangan.
- Mengelola pengaturan tertentu.

## 3.4 Workspace Owner

Memiliki kontrol penuh terhadap workspace.

Responsibilities:
- Mengelola workspace.
- Mengelola anggota workspace.
- Mengelola project.
- Mengatur permission workspace.

## 3.5 Workspace Admin

Bertanggung jawab membantu pengelolaan workspace.

## 3.6 Project Manager

Mengelola project dan aktivitas pekerjaan.

Responsibilities:
- Membuat dan mengelola project.
- Mengelola task.
- Mengatur assignee.
- Mengatur deadline.
- Mengelola workflow.
- Mengelola sprint.
- Memantau progress.

## 3.7 Member

Anggota yang mengerjakan dan berkolaborasi dalam project.

Responsibilities:
- Melihat project yang diizinkan.
- Membuat task sesuai permission.
- Memperbarui task.
- Mengomentari task.
- Memperbarui status pekerjaan.

## 3.8 Viewer

Pengguna dengan akses read-only.

Responsibilities:
- Melihat project.
- Melihat task.
- Melihat komentar dan aktivitas yang diizinkan.

---

# 4. FUNCTIONAL REQUIREMENTS

# MODULE 01 — AUTHENTICATION

## FR-AUTH-001: User Registration

Description:

Sistem harus memungkinkan pengguna membuat akun FlowSpace.

Input:
- Full Name.
- Email.
- Password.
- Password Confirmation.

Business Rules:

1. Email harus valid.
2. Email harus unik.
3. Password harus memenuhi kebijakan keamanan.
4. Password harus di-hash menggunakan Argon2id.
5. Pengguna harus melakukan verifikasi email.
6. Akun yang belum diverifikasi tidak boleh mengakses fitur utama.

Acceptance Criteria:

- Pengguna dapat mendaftar menggunakan data valid.
- Sistem menolak email yang sudah terdaftar.
- Sistem menolak password yang tidak memenuhi ketentuan.
- Sistem mengirim email verifikasi.
- Password tidak disimpan dalam bentuk plaintext.

## FR-AUTH-002: Login

Pengguna dapat login menggunakan email dan password.

Acceptance Criteria:

- Sistem memvalidasi kredensial.
- Sistem menolak kredensial salah.
- Sistem membuat session yang aman.
- Pengguna diarahkan ke dashboard setelah berhasil login.

## FR-AUTH-003: Logout

Sistem mengakhiri session pengguna.

## FR-AUTH-004: Forgot Password

Pengguna dapat meminta tautan reset password melalui email.

## FR-AUTH-005: Reset Password

Pengguna dapat mengganti password menggunakan token reset yang valid dan belum kedaluwarsa.

## FR-AUTH-006: Email Verification

Pengguna dapat melakukan verifikasi email menggunakan token yang dikirimkan sistem.

---

# MODULE 02 — USER PROFILE

## FR-USER-001: View Profile

Pengguna dapat melihat informasi profil.

## FR-USER-002: Update Profile

Pengguna dapat mengubah:
- Full Name.
- Profile Picture.
- Bio.
- Timezone.
- Language.

## FR-USER-003: Account Settings

Pengguna dapat mengelola:
- Password.
- Email.
- Active Sessions.
- Account Preferences.

---

# MODULE 03 — ORGANIZATION MANAGEMENT

## FR-ORG-001: Create Organization

Pengguna dapat membuat organisasi.

Input:
- Organization Name.
- Organization Slug.
- Organization Description.
- Organization Logo.

Business Rules:

1. Organization harus memiliki owner.
2. Organization slug harus unik secara global.
3. Pembuat organisasi otomatis menjadi Organization Owner.
4. Organisasi memiliki workspace default atau dapat membuat workspace pertama setelah organisasi dibuat.

## FR-ORG-002: Update Organization

Owner dan admin yang memiliki permission dapat memperbarui informasi organisasi.

## FR-ORG-003: Organization Members

Owner dan admin dapat melihat anggota organisasi.

## FR-ORG-004: Invite Organization Members

Pengguna yang memiliki permission dapat mengundang anggota melalui email.

## FR-ORG-005: Remove Organization Member

Pengguna dengan permission dapat menghapus anggota.

Business Rules:

- Owner tidak dapat menghapus dirinya sendiri tanpa memindahkan kepemilikan.
- Penghapusan anggota harus mempertimbangkan kepemilikan workspace dan project.
- Riwayat aktivitas tetap tersimpan.

## FR-ORG-006: Organization Settings

Organisasi dapat mengatur informasi dan preferensi organisasi.

---

# MODULE 04 — WORKSPACE MANAGEMENT

## FR-WORKSPACE-001: Create Workspace

Pengguna dengan permission dapat membuat workspace dalam organisasi.

Input:
- Workspace Name.
- Workspace Description.
- Workspace Icon.

## FR-WORKSPACE-002: Update Workspace

Pengguna dengan permission dapat memperbarui informasi workspace.

## FR-WORKSPACE-003: Delete Workspace

Workspace dapat dihapus oleh pengguna dengan permission khusus.

Sistem harus meminta konfirmasi sebelum penghapusan.

## FR-WORKSPACE-004: Workspace Switching

Pengguna dapat berpindah workspace tanpa harus login kembali.

## FR-WORKSPACE-005: Workspace Members

Pengguna dapat melihat dan mengelola anggota workspace sesuai permission.

## FR-WORKSPACE-006: Workspace Settings

Workspace menyediakan pengaturan:

- General.
- Members.
- Roles.
- Permissions.
- Projects.

---

# MODULE 05 — PROJECT MANAGEMENT

## FR-PROJECT-001: Create Project

Pengguna dapat membuat project di dalam workspace.

Input:
- Project Name.
- Project Key.
- Description.
- Start Date.
- Target End Date.
- Project Status.
- Project Visibility.

Business Rules:

1. Project harus memiliki workspace.
2. Project key harus unik dalam workspace.
3. Pembuat project menjadi project owner.
4. Project harus memiliki workflow status.
5. Project memiliki daftar anggota.

## FR-PROJECT-002: Update Project

Pengguna dengan permission dapat memperbarui informasi project.

## FR-PROJECT-003: Archive Project

Project dapat diarsipkan tanpa langsung menghapus datanya.

## FR-PROJECT-004: Delete Project

Pengguna dengan permission dapat menghapus project.

Sistem harus menerapkan kebijakan penghapusan yang konsisten terhadap seluruh data terkait.

## FR-PROJECT-005: Project Members

Project Manager dapat mengelola anggota project sesuai permission.

## FR-PROJECT-006: Project Overview

Project menyediakan informasi:

- Total Tasks.
- Completed Tasks.
- In Progress Tasks.
- Overdue Tasks.
- Project Progress.
- Recent Activities.
- Upcoming Deadlines.

## FR-PROJECT-007: Project Workflow

Setiap project dapat memiliki konfigurasi status task.

Default status:

- Backlog.
- Todo.
- In Progress.
- In Review.
- Done.

Status dapat dikonfigurasi oleh pengguna dengan permission.

---

# MODULE 06 — TASK MANAGEMENT

## FR-TASK-001: Create Task

Pengguna dengan permission dapat membuat task.

Input:
- Task Title.
- Description.
- Task Type.
- Priority.
- Status.
- Assignees.
- Start Date.
- Due Date.
- Labels.

## FR-TASK-002: Update Task

Pengguna dengan permission dapat mengubah atribut task.

## FR-TASK-003: Delete Task

Pengguna dengan permission dapat menghapus task.

## FR-TASK-004: Task Assignment

Task dapat diberikan kepada satu penanggung jawab utama (Assignee) dari anggota project pada MVP. Anggota tim tambahan yang berkolaborasi dapat mengikuti task melalui Watchers (Fase 2).

## FR-TASK-005: Task Priority

Default priority:

- Low.
- Medium.
- High.
- Critical.

## FR-TASK-006: Task Status

Task dapat dipindahkan antarstatus berdasarkan workflow project.

## FR-TASK-007: Task Deadline

Task dapat memiliki start date dan due date.

Sistem dapat mengidentifikasi task yang melewati deadline.

## FR-TASK-008: Task Labels

Pengguna dapat membuat dan memberikan label pada task.

## FR-TASK-009: Subtasks

Task dapat memiliki beberapa subtask.

Subtask dapat memiliki assignee, status, dan deadline sendiri.

## FR-TASK-010: Task Detail

Task detail menyediakan informasi lengkap mengenai pekerjaan.

## FR-TASK-011: Task Search

Pengguna dapat mencari task berdasarkan:
- Title.
- Assignee.
- Priority.
- Status.
- Label.

## FR-TASK-012: Task Activity

Sistem mencatat perubahan penting pada task.

---

# MODULE 07 — KANBAN BOARD

## FR-BOARD-001: Kanban Board

Sistem menampilkan task berdasarkan status.

## FR-BOARD-002: Drag and Drop

Pengguna dapat memindahkan task antarstatus.

## FR-BOARD-003: Reorder Tasks

Pengguna dapat mengubah urutan task dalam kolom.

## FR-BOARD-004: Board Filters

Pengguna dapat melakukan filter berdasarkan:

- Assignee.
- Priority.
- Labels.
- Due Date.

## FR-BOARD-005: Board Search

Pengguna dapat mencari task dari board.

Business Rules:

1. Perubahan posisi task harus tersimpan di database.
2. Urutan task harus konsisten.
3. Sistem harus memvalidasi permission sebelum perubahan.
4. Sistem harus menangani konflik perubahan secara aman.
5. Perubahan status harus menghasilkan activity log.

---

# MODULE 08 — COMMENTS & COLLABORATION

## FR-COMMENT-001: Create Comment

Anggota yang memiliki permission dapat memberikan komentar pada task.

## FR-COMMENT-002: Edit Comment

Pengguna dapat mengedit komentar miliknya sesuai kebijakan sistem.

## FR-COMMENT-003: Delete Comment

Pengguna dapat menghapus komentar miliknya atau menggunakan permission administratif.

## FR-COMMENT-004: User Mentions

Pengguna dapat menyebut anggota lain menggunakan mention.

## FR-COMMENT-005: Activity History

Sistem menyimpan aktivitas:

- Task Created.
- Task Updated.
- Status Changed.
- Assignee Changed.
- Deadline Changed.
- Comment Added.
- Task Completed.

---

# MODULE 09 — NOTIFICATION

## FR-NOTIFICATION-001: Notification Center

Sistem menyediakan pusat notifikasi.

## FR-NOTIFICATION-002: Task Assignment Notification

Pengguna mendapatkan notifikasi ketika ditugaskan pada task.

## FR-NOTIFICATION-003: Mention Notification

Pengguna mendapatkan notifikasi ketika disebut dalam komentar.

## FR-NOTIFICATION-004: Deadline Reminder

Sistem mengirimkan pengingat deadline.

## FR-NOTIFICATION-005: Real-time Notification

Notifikasi dapat diterima secara real-time menggunakan Socket.IO.

## FR-NOTIFICATION-006: Notification Management

Pengguna dapat:

- Melihat notifikasi.
- Menandai sebagai dibaca.
- Menandai seluruh notifikasi sebagai dibaca.
- Mengatur preferensi notifikasi.

Notifikasi harus tetap tersimpan meskipun penerima sedang offline.

---

# MODULE 10 — FILE ATTACHMENTS

## FR-FILE-001: Upload Attachment

Pengguna dapat melampirkan file pada task.

## FR-FILE-002: Download Attachment

Pengguna dapat mengunduh file sesuai permission.

## FR-FILE-003: Delete Attachment

Pengguna dengan permission dapat menghapus attachment.

Business Rules:

- File harus divalidasi berdasarkan tipe dan ukuran.
- File disimpan pada object storage.
- Database hanya menyimpan metadata dan storage key.
- File tidak boleh dapat diakses tanpa authorization.

---

# MODULE 11 — SPRINT MANAGEMENT

## FR-SPRINT-001: Create Sprint

Project Manager dapat membuat sprint.

Input:
- Sprint Name.
- Sprint Goal.
- Start Date.
- End Date.

## FR-SPRINT-002: Sprint Planning

Project Manager dapat menambahkan task ke sprint.

## FR-SPRINT-003: Start Sprint

Sprint dapat dimulai jika memenuhi aturan sprint.

## FR-SPRINT-004: Complete Sprint

Sprint dapat diselesaikan.

## FR-SPRINT-005: Sprint Report

Sistem menghasilkan informasi:

- Completed Tasks.
- Incomplete Tasks.
- Sprint Progress.
- Estimated Work.
- Actual Work.

---

# MODULE 12 — ANALYTICS & REPORTING

## FR-REPORT-001: Project Dashboard

Menampilkan statistik project.

## FR-REPORT-002: Task Statistics

Menampilkan jumlah task berdasarkan status dan prioritas.

## FR-REPORT-003: Workload Analytics

Menampilkan distribusi pekerjaan anggota.

## FR-REPORT-004: Sprint Analytics

Menampilkan perkembangan sprint.

## FR-REPORT-005: Project Health Monitoring

Sistem menganalisis kondisi project berdasarkan:

- Overdue Tasks.
- Task Completion Rate.
- Project Deadline.
- Sprint Progress.
- Team Workload.

Status:

- Healthy.
- At Risk.
- Critical.

---

# 4. USER EXPERIENCE REQUIREMENTS

## 4.1 Dashboard

Dashboard utama harus menyediakan:

- Workspace selector.
- Recent Projects.
- My Tasks.
- Upcoming Deadlines.
- Recent Activities.
- Notifications.

## 4.2 Navigation

Sidebar utama menyediakan navigasi:

- Home.
- My Tasks.
- Projects.
- Inbox.
- Search.
- Settings.

## 4.3 Project Navigation

Navigasi project:

- Overview.
- Board.
- List.
- Calendar.
- Timeline.
- Backlog.
- Reports.
- Settings.

## 4.4 Responsive Design

Platform harus mendukung:

- Desktop.
- Tablet.
- Mobile.

Interaksi drag-and-drop harus memiliki alternatif yang dapat digunakan pada perangkat touch dan keyboard.

---

# 5. NON-FUNCTIONAL REQUIREMENTS

## 5.1 Performance

- API harus memiliki target response time yang terukur.
- Database query harus dioptimalkan.
- Pagination digunakan untuk data berukuran besar.
- Penggunaan cache diterapkan berdasarkan kebutuhan.

## 5.2 Security

- Password hashing menggunakan Argon2id.
- Validasi input pada backend.
- Authentication dan authorization.
- Rate limiting.
- Secure session management.
- Protection terhadap XSS dan CSRF sesuai mekanisme autentikasi.
- Secure file upload.
- Tenant isolation.
- Audit logging.

## 5.3 Reliability

- Error handling terpusat.
- Database transaction untuk operasi penting.
- Background job retry.
- Logging.
- Backup database.

## 5.4 Scalability

- Modular backend architecture.
- Redis caching.
- Background processing.
- Efficient database indexing.
- Real-time communication.

## 5.5 Accessibility

- Keyboard navigation.
- Accessible forms.
- Screen reader support.
- Proper contrast.
- Clear focus states.

---

# 6. BUSINESS RULES

1. Setiap user harus memiliki akun sebelum mengakses workspace privat.
2. Setiap organization harus memiliki minimal satu owner.
3. Workspace harus berada di dalam organization atau mengikuti model personal workspace yang ditentukan.
4. Setiap project harus berada dalam workspace.
5. Task harus berada dalam project.
6. User hanya dapat mengakses resource yang diizinkan.
7. Role tidak boleh menjadi satu-satunya dasar authorization; permission resource juga harus diperiksa.
8. Perubahan penting harus dicatat dalam activity history.
9. Task yang diarsipkan tidak boleh muncul dalam tampilan aktif secara default.
10. Penghapusan data harus mempertimbangkan relasi dan kebijakan retensi.
11. Real-time event hanya boleh dikirim kepada pengguna yang memiliki akses.
12. Seluruh perubahan penting harus divalidasi di backend.

---

# 7. ACCEPTANCE CRITERIA

MVP dianggap berhasil apabila:

1. User dapat melakukan registrasi dan login.
2. User dapat membuat organization.
3. User dapat membuat workspace.
4. User dapat mengundang anggota.
5. User dapat membuat project.
6. User dapat membuat task.
7. User dapat melakukan drag-and-drop task.
8. User dapat memberikan task kepada anggota.
9. User dapat mengatur deadline.
10. User dapat memberikan komentar.
11. Sistem mencatat activity history.
12. Permission berjalan sesuai role.
13. Data antar-organization terisolasi.
14. Aplikasi dapat digunakan melalui desktop dan mobile.
15. Seluruh alur utama lulus integration dan end-to-end testing.

---

# 8. OUT OF SCOPE

Fitur berikut tidak termasuk MVP:

- AI Project Assistant.
- Subscription Billing.
- Advanced Automation.
- Third-party Integrations.
- Advanced Gantt Dependencies.
- Enterprise SSO.
- Advanced Custom Reporting.

---

# 9. DEVELOPMENT PRIORITIES

Prioritas pengembangan:

**P0 — Critical**
- Authentication.
- Database Foundation.
- Organization.
- Workspace.
- Authorization.
- Project.
- Task.

**P1 — High**
- Kanban.
- Task Assignment.
- Comments.
- Activity History.
- Invitation.

**P2 — Medium**
- Notifications.
- File Attachments.
- Multiple Views.
- Global Search.

**P3 — Advanced**
- Sprint Management.
- Analytics.
- Workload.
- AI Assistant.

---

# 10. PRODUCT SUCCESS CRITERIA

FlowSpace harus mampu mendukung alur berikut secara utuh:

1. User membuat akun.
2. User membuat organization.
3. User membuat workspace.
4. User mengundang anggota.
5. Anggota bergabung.
6. Project Manager membuat project.
7. Project Manager membuat task.
8. Task diberikan kepada developer.
9. Developer mengerjakan task.
10. Developer memperbarui status.
11. Anggota memberikan komentar.
12. Project Manager memantau perkembangan project.

Alur tersebut menjadi skenario utama validasi produk.

---

**END OF DOCUMENT**