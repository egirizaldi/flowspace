# FLOWSPACE
## User Journey & User Flow
**Version:** 1.0  
**Status:** Draft  
**Product:** Collaborative Project Management SaaS

---

# 1. Document Overview

## 1.1 Purpose

Dokumen ini menjelaskan perjalanan pengguna (User Journey) dan alur interaksi (User Flow) ketika menggunakan FlowSpace.

Dokumen ini menjadi acuan untuk:
- Menentukan pengalaman pengguna dari awal hingga menyelesaikan pekerjaan.
- Mengidentifikasi halaman dan navigasi yang dibutuhkan.
- Menentukan interaksi utama pada setiap fitur.
- Mengidentifikasi kondisi berhasil, gagal, dan kondisi khusus.
- Menjadi dasar pembuatan UI/UX Design dan Frontend Development.

## 1.2 Product Context

FlowSpace merupakan platform project management yang membantu individu dan tim mengelola pekerjaan dalam satu sistem.

Struktur utama:

Organization → Workspace → Project → Task

Pengguna dapat membuat organisasi, mengelola workspace, membuat project, membagikan pekerjaan kepada anggota tim, dan memantau progres melalui berbagai tampilan.

---

# 2. User Personas

## 2.1 Organization Owner

**Deskripsi:** Pengguna yang membuat dan memiliki organisasi.

Kebutuhan:
- Membuat organisasi.
- Mengelola anggota organisasi.
- Membuat workspace.
- Mengatur akses dan keanggotaan.
- Memantau aktivitas organisasi.

## 2.2 Project Manager

**Deskripsi:** Pengguna yang bertanggung jawab mengelola project.

Kebutuhan:
- Membuat project.
- Membuat dan membagikan task.
- Menentukan prioritas dan deadline.
- Memantau progres anggota.
- Mengidentifikasi pekerjaan yang terlambat.

## 2.3 Developer / Team Member

**Deskripsi:** Anggota tim yang mengerjakan task.

Kebutuhan:
- Melihat task yang ditugaskan.
- Memahami detail pekerjaan.
- Memperbarui status task.
- Memberikan komentar.
- Melihat deadline dan prioritas.

## 2.4 Viewer

**Deskripsi:** Pengguna yang hanya membutuhkan akses untuk melihat informasi project.

Kebutuhan:
- Melihat project.
- Melihat daftar task.
- Memantau progres.
- Tidak dapat mengubah data.

---

# 3. Information Architecture

## 3.1 Application Structure

Struktur navigasi utama FlowSpace:

```text
FlowSpace
│
├── Authentication
│   ├── Login
│   ├── Register
│   ├── Forgot Password
│   └── Reset Password
│
├── Onboarding
│   ├── Create Organization
│   ├── Create Workspace
│   └── Invite Members
│
└── Main Application
    │
    ├── Dashboard
    │
    ├── Workspace
    │   ├── Overview
    │   ├── Projects
    │   └── Members
    │
    ├── Projects
    │   ├── Project Overview
    │   ├── Board
    │   ├── List
    │   └── Project Settings
    │
    ├── Tasks
    │   ├── Task Detail
    │   ├── Create Task
    │   └── Edit Task
    │
    ├── My Tasks
    │
    ├── Inbox / Notifications
    │
    └── Settings
        ├── Profile
        ├── Organization Settings
        └── Workspace Settings
```

Catatan: Beberapa halaman seperti List, Inbox, dan pengaturan lanjutan dapat dikembangkan setelah alur MVP utama berjalan.

---

# 4. Global Navigation

## 4.1 Sidebar

Sidebar merupakan navigasi utama aplikasi.

Elemen yang direkomendasikan:

1. Logo FlowSpace.
2. Organization Switcher.
3. Workspace Switcher.
4. Dashboard.
5. My Tasks.
6. Projects.
7. Inbox.
8. Workspace Members.
9. Settings.
10. User Profile.

## 4.2 Topbar

Topbar menampilkan:

- Breadcrumb navigation.
- Search.
- Quick Create Button.
- Notification indicator.
- User Avatar.

## 4.3 Navigation Behavior

Ketentuan navigasi:

- Sidebar dapat diperluas dan diperkecil.
- Workspace Switcher digunakan untuk berpindah workspace.
- Breadcrumb menunjukkan posisi halaman.
- Quick Create dapat digunakan untuk membuat task atau project sesuai izin pengguna.
- Navigasi harus menyesuaikan akses pengguna.

---

# 5. Primary User Journey

## 5.1 Journey Overview

Alur utama FlowSpace:

```text
Open FlowSpace
      |
      v
Register / Login
      |
      v
Authentication Success
      |
      v
Onboarding
      |
      v
Create Organization
      |
      v
Create Workspace
      |
      v
Invite Members (Optional)
      |
      v
Dashboard
      |
      v
Create Project
      |
      v
Create Tasks
      |
      v
Assign Tasks
      |
      v
Team Collaboration
      |
      v
Update Task Progress
      |
      v
Project Monitoring
```

## 5.2 Journey Stages

| Stage | User Action | System Response |
|---|---|---|
| Discovery | Membuka FlowSpace | Menampilkan halaman awal |
| Registration | Membuat akun | Memvalidasi dan menyimpan akun |
| Authentication | Login | Memvalidasi kredensial |
| Onboarding | Membuat organisasi | Membuat organization |
| Workspace Setup | Membuat workspace | Menyimpan workspace |
| Collaboration | Mengundang anggota | Mengirim undangan |
| Project Setup | Membuat project | Membuat project |
| Task Management | Membuat task | Menyimpan task |
| Assignment | Menentukan assignee | Memperbarui penugasan |
| Execution | Mengubah status task | Memperbarui progres |
| Monitoring | Melihat project board | Menampilkan kondisi project |

---

# 6. Detailed User Flows

## 6.1 Registration Flow

### Objective
Memungkinkan pengguna membuat akun FlowSpace.

### Flow

```text
Open Register Page
       |
       v
Enter Name
       |
       v
Enter Email
       |
       v
Enter Password
       |
       v
Confirm Password
       |
       v
Click Register
       |
       v
Validate Input
       |
   +---+---+
   |       |
 Invalid  Valid
   |       |
   v       v
Show     Create Account
 Error       |
             v
       Email Verification
             |
             v
       Account Verified
             |
             v
       Continue Onboarding
```

### Input Fields

- Full Name.
- Email Address.
- Password.
- Confirm Password.

### Validation

- Nama wajib diisi.
- Email harus valid.
- Email tidak boleh sudah digunakan.
- Password harus memenuhi persyaratan keamanan.
- Password confirmation harus sama.
- Pengguna harus menyelesaikan verifikasi email sebelum menggunakan fitur yang memerlukannya.

### Error States

- Email sudah digunakan.
- Format email tidak valid.
- Password terlalu lemah.
- Password tidak cocok.
- Koneksi bermasalah.
- Verifikasi email gagal atau kedaluwarsa.

---

## 6.2 Login Flow

### Objective
Memungkinkan pengguna masuk ke akun.

### Flow

```text
Open Login Page
       |
       v
Enter Email
       |
       v
Enter Password
       |
       v
Click Login
       |
       v
Validate Credentials
       |
   +---+---+
   |       |
 Invalid  Valid
   |       |
   v       v
Show     Create Session
 Error       |
             v
       Check User Setup
             |
       +-----+------+
       |            |
  No Organization  Existing Setup
       |            |
       v            v
   Onboarding    Dashboard
```

### Input Fields

- Email.
- Password.
- Remember Me (optional).

### Additional Actions

- Forgot Password.
- Show/Hide Password.
- Register Account.

### Important Rules

- Pesan error tidak boleh membocorkan apakah email terdaftar atau tidak.
- Session harus dikelola secara aman.
- Akun yang belum diverifikasi diarahkan ke proses verifikasi.
- Pengguna yang sudah memiliki setup organisasi tidak perlu mengulang onboarding.

---

## 6.3 Organization Creation Flow

### Objective
Memungkinkan pengguna membuat organisasi baru.

### Flow

```text
Onboarding Page
      |
      v
Click Create Organization
      |
      v
Enter Organization Name
      |
      v
Enter Organization Slug
      |
      v
Submit
      |
      v
Validate Data
      |
      v
Create Organization
      |
      v
Assign Creator as Owner
      |
      v
Continue to Workspace Setup
```

### Input Fields

- Organization Name.
- Organization Slug.

### Business Rules

- Organization Name wajib diisi.
- Slug harus unik.
- Creator otomatis menjadi Organization Owner.
- Pengguna tidak boleh mendapatkan akses ke organisasi lain tanpa membership yang valid.

---

## 6.4 Workspace Creation Flow

### Objective
Memungkinkan Organization Owner membuat workspace.

### Flow

```text
Organization Created
       |
       v
Create Workspace
       |
       v
Enter Workspace Name
       |
       v
Submit
       |
       v
Validate Workspace
       |
       v
Create Workspace
       |
       v
Assign Creator as Workspace Owner
       |
       v
Continue Onboarding
```

### Input Fields

- Workspace Name.
- Workspace Description (optional).

### Business Rules

- Workspace harus terhubung dengan satu organization.
- Workspace memiliki anggota dan pengaturan akses.
- Creator menjadi Workspace Owner.
- Pengguna hanya dapat mengakses workspace sesuai membership dan permission.

---

## 6.5 Invite Members Flow

### Objective
Memungkinkan pengguna mengundang anggota untuk berkolaborasi.

### Flow

```text
Open Members Page
       |
       v
Click Invite Member
       |
       v
Enter Email Address
       |
       v
Select Role
       |
       v
Click Send Invitation
       |
       v
Validate Invitation
       |
   +---+---+
   |       |
 Invalid  Valid
   |       |
   v       v
Show     Create Invitation
 Error       |
             v
       Send Invitation Email
             |
             v
       Recipient Opens Link
             |
             v
       Login / Register
             |
             v
       Accept Invitation
             |
             v
       Add Membership
```

### Invitation Rules

- Hanya pengguna dengan permission yang sesuai dapat mengundang anggota.
- Undangan memiliki masa berlaku.
- Email penerima harus sesuai dengan email akun yang menerima undangan.
- Undangan yang sudah diterima tidak dapat digunakan kembali.
- Undangan dapat dibatalkan oleh pengguna yang memiliki izin.
- Sistem harus mencegah undangan duplikat yang masih aktif.

---

## 6.6 Project Creation Flow

### Objective
Memungkinkan Project Manager membuat project.

### Flow

```text
Open Workspace
       |
       v
Open Projects
       |
       v
Click Create Project
       |
       v
Enter Project Information
       |
       v
Select Project Manager
       |
       v
Submit
       |
       v
Validate Permission
       |
       v
Create Project
       |
       v
Open Project Overview
```

### Input Fields

- Project Name.
- Project Description.
- Project Key.
- Start Date (optional).
- Due Date (optional).
- Project Manager.

### Business Rules

- Project harus berada di dalam workspace.
- Project Key harus unik dalam workspace terkait.
- Project Manager harus memiliki akses yang sesuai.
- Pengguna tidak boleh membuat project di workspace yang tidak dapat diaksesnya.

---

## 6.7 Task Creation Flow

### Objective
Memungkinkan pengguna membuat pekerjaan baru di dalam project.

### Flow

```text
Open Project Board
       |
       v
Click Add Task
       |
       v
Enter Task Information
       |
       v
Set Priority
       |
       v
Set Assignee
       |
       v
Set Due Date
       |
       v
Click Create
       |
       v
Validate Data
       |
       v
Save Task
       |
       v
Display Task on Board
```

### Task Fields

- Task Title.
- Description.
- Status.
- Priority.
- Assignee.
- Due Date.
- Labels.
- Start Date (optional).

### Business Rules

- Task harus terhubung dengan project.
- Task memiliki status.
- Assignee harus memiliki akses ke project.
- Task dapat dibuat tanpa assignee.
- Task dapat dibuat tanpa deadline.
- Task ID harus unik.
- Task hanya dapat diakses oleh pengguna yang memiliki izin.

---

## 6.8 Task Detail Flow

### Objective
Memungkinkan pengguna melihat dan mengelola detail pekerjaan.

### Flow

```text
Open Project Board
       |
       v
Click Task Card
       |
       v
Open Task Detail
       |
       v
Display Task Information
       |
       +-----------------------+
       |           |           |
       v           v           v
    Edit Task   Add Comment  Update Status
       |           |           |
       v           v           v
    Save        Publish      Update
       |           |           |
       +-----------+-----------+
                   |
                   v
             Refresh Task Data
```

### Task Detail Information

- Task ID.
- Task Title.
- Description.
- Status.
- Priority.
- Assignee.
- Creator.
- Due Date.
- Labels.
- Comments.
- Activity History.

### Interaction

Pengguna dengan permission yang sesuai dapat:

- Mengubah judul task.
- Mengubah deskripsi.
- Mengubah status.
- Mengubah prioritas.
- Mengubah assignee.
- Menambahkan komentar.
- Melihat riwayat aktivitas.

---

## 6.9 Kanban Board Flow

### Objective
Memberikan visualisasi pekerjaan berdasarkan status.

### Example Board

```text
+-------------+-------------+-------------+
|  TODO       | IN PROGRESS | DONE        |
+-------------+-------------+-------------+
|             |             |             |
| Task A      | Task C      | Task E      |
| Task B      | Task D      |             |
|             |             |             |
| + Add Task  | + Add Task  | + Add Task  |
+-------------+-------------+-------------+
```

### User Interactions

- Melihat task berdasarkan status.
- Membuat task baru.
- Membuka detail task.
- Memindahkan task antar kolom.
- Mengubah prioritas.
- Melihat assignee dan deadline.

### Drag and Drop Flow

```text
User Drags Task Card
        |
        v
Select Destination Column
        |
        v
Drop Task
        |
        v
Validate Permission
        |
        v
Send Update Request
        |
        v
Validate Current Task State
        |
    +---+---+
    |       |
 Success  Failed
    |       |
    v       v
Update   Restore Previous
Board    Position / Show Error
```

### Important Rules

- Perubahan status harus disimpan ke backend.
- Sistem harus memvalidasi permission.
- Jika update gagal, posisi task dikembalikan.
- Urutan task harus konsisten.
- Perubahan bersamaan dari beberapa pengguna harus ditangani.
- Drag and drop tidak boleh hanya mengubah tampilan frontend.

---

## 6.10 My Tasks Flow

### Objective
Memungkinkan pengguna melihat seluruh task yang ditugaskan kepadanya.

### Flow

```text
Open My Tasks
      |
      v
Fetch Assigned Tasks
      |
      v
Display Task List
      |
      v
Apply Filters
      |
      v
Select Task
      |
      v
Open Task Detail
```

### Filters

- Status.
- Priority.
- Due Date.
- Project.
- Workspace.

### Task Categories

- Upcoming.
- In Progress.
- Overdue.
- Completed.

---

# 7. Important Alternative Flows

## 7.1 User Has No Organization

Jika pengguna berhasil login tetapi belum memiliki organisasi:

- Sistem menampilkan onboarding.
- Pengguna dapat membuat organisasi.
- Pengguna dapat menerima undangan organisasi jika memiliki invitation aktif.

## 7.2 User Receives an Invitation

Jika pengguna membuka invitation link:

- Sistem memeriksa validitas invitation.
- Jika belum login, pengguna diarahkan ke login atau registration.
- Setelah autentikasi, sistem memeriksa email penerima.
- Jika valid, pengguna dapat menerima undangan.
- Jika kedaluwarsa atau dibatalkan, sistem menampilkan pesan yang sesuai.

## 7.3 User Has No Permission

Jika pengguna mencoba mengakses resource tanpa izin:

- Backend menolak request.
- Sistem menampilkan halaman atau pesan akses ditolak.
- Data resource tidak boleh dikirim ke pengguna.
- Frontend tidak boleh menjadi satu-satunya lapisan keamanan.

## 7.4 Empty Workspace

Jika workspace belum memiliki project:

- Tampilkan empty state.
- Berikan tombol Create Project jika pengguna memiliki permission.
- Jika tidak memiliki permission, tampilkan informasi bahwa belum ada project.

## 7.5 Empty Project Board

Jika project belum memiliki task:

- Tampilkan empty state.
- Berikan tombol Add Task jika pengguna memiliki permission.
- Tampilkan informasi singkat tentang cara memulai.

## 7.6 Network Failure

Jika koneksi gagal ketika pengguna melakukan perubahan:

- Tampilkan pesan error.
- Jangan menampilkan perubahan sebagai data yang sudah tersimpan.
- Pertahankan input pengguna jika memungkinkan.
- Sediakan opsi untuk mencoba kembali.

---

# 8. Page Inventory

Daftar halaman yang dibutuhkan untuk MVP.

| Page | Purpose | Priority |
|---|---|---|
| Login | Autentikasi pengguna | Must Have |
| Register | Pendaftaran pengguna | Must Have |
| Forgot Password | Pemulihan akun | Must Have |
| Email Verification | Verifikasi email | Must Have |
| Onboarding | Setup awal | Must Have |
| Create Organization | Membuat organisasi | Must Have |
| Create Workspace | Membuat workspace | Must Have |
| Dashboard | Ringkasan aktivitas | Must Have |
| Project List | Daftar project | Must Have |
| Project Overview | Informasi project | Must Have |
| Kanban Board | Manajemen task | Must Have |
| Task Detail | Detail pekerjaan | Must Have |
| My Tasks | Daftar pekerjaan pengguna | Should Have |
| Members | Pengelolaan anggota | Must Have |
| Profile Settings | Pengaturan profil | Should Have |
| Organization Settings | Pengaturan organisasi | Should Have |
| Workspace Settings | Pengaturan workspace | Should Have |
| Inbox | Notifikasi | Later |

---

# 9. Main User Experience Requirements

## 9.1 Usability

- Navigasi harus mudah dipahami.
- Pengguna dapat membuat task dengan proses sederhana.
- Informasi penting harus mudah ditemukan.
- Interaksi utama tidak boleh membutuhkan terlalu banyak langkah.
- Tampilan harus konsisten pada seluruh halaman.

## 9.2 Feedback

Setiap aksi penting harus memberikan feedback.

Contoh:

| Action | Feedback |
|---|---|
| Create Project | Project created successfully |
| Create Task | Task created successfully |
| Update Task | Changes saved |
| Delete Task | Confirmation dialog |
| Invite Member | Invitation sent |
| Failed Request | Error notification |

## 9.3 Loading States

Setiap proses pengambilan atau penyimpanan data harus memiliki loading state yang sesuai.

Contoh:
- Skeleton loading.
- Button loading.
- Page loading.
- Inline loading.

## 9.4 Empty States

Halaman yang belum memiliki data harus menampilkan empty state yang jelas dan memiliki tindakan berikutnya jika tersedia.

## 9.5 Responsive Design

FlowSpace harus dapat digunakan melalui:

- Desktop.
- Tablet.
- Mobile.

Prioritas desain MVP adalah desktop karena aplikasi berfokus pada pengelolaan project dan pekerjaan tim.

---

# 10. MVP Acceptance Criteria

MVP dianggap berhasil jika skenario berikut dapat berjalan:

1. Pengguna dapat membuat akun.
2. Pengguna dapat login dan logout.
3. Pengguna dapat memverifikasi email.
4. Pengguna dapat membuat organization.
5. Pengguna dapat membuat workspace.
6. Owner dapat mengundang anggota.
7. Anggota dapat menerima undangan.
8. Pengguna yang memiliki izin dapat membuat project.
9. Pengguna dapat membuat task.
10. Pengguna dapat menetapkan assignee.
11. Pengguna dapat mengubah status task.
12. Task dapat dipindahkan melalui Kanban Board.
13. Pengguna dapat membuka detail task.
14. Pengguna dapat memberikan komentar.
15. Sistem dapat membatasi akses berdasarkan membership dan permission.
16. Pengguna tidak dapat mengakses data organisasi lain tanpa izin.

---

# 11. Recommended MVP User Flow

Untuk menghindari scope creep, implementasikan satu alur utama terlebih dahulu:

```text
REGISTER
   |
   v
VERIFY EMAIL
   |
   v
CREATE ORGANIZATION
   |
   v
CREATE WORKSPACE
   |
   v
INVITE MEMBER
   |
   v
CREATE PROJECT
   |
   v
CREATE TASK
   |
   v
ASSIGN TASK
   |
   v
OPEN KANBAN BOARD
   |
   v
UPDATE TASK STATUS
   |
   v
ADD COMMENT
   |
   v
VIEW PROJECT PROGRESS
```

Alur ini menjadi jalur pengujian utama untuk memastikan FlowSpace benar-benar berfungsi sebagai aplikasi kolaborasi project management.

---

# 12. Out of Scope for MVP

Fitur berikut tidak perlu menjadi fokus pada tahap pertama:

- AI Project Assistant.
- Advanced Automation.
- Custom Workflow Builder.
- Advanced Analytics.
- Workload Prediction.
- Advanced Sprint Planning.
- Gantt Chart.
- Calendar View.
- Custom Role Builder.
- Advanced Reporting.

Fitur tersebut dapat dikembangkan setelah alur utama aplikasi stabil.

---

# 13. Final Recommendation

Prioritas utama FlowSpace bukan jumlah fitur, melainkan konsistensi pengalaman pengguna dan keandalan sistem.

Fokus pengembangan:

1. Authentication dan onboarding.
2. Organization dan workspace.
3. Membership dan invitation.
4. Project management.
5. Task management.
6. Kanban Board.
7. Comments dan activity history.
8. Authorization dan tenant isolation.

Setiap fitur harus selesai secara end-to-end sebelum berpindah ke fitur berikutnya.

**Dokumen ini menjadi dasar untuk menyusun System Architecture, Database Design, dan UI/UX Design FlowSpace.**