# FLOWSPACE
## USER ROLES & PERMISSIONS MATRIX

**Version:** 1.0  
**Module:** Authorization & Access Control  
**Architecture:** Multi-Tenant RBAC  
**Status:** Initial Specification

---

# 1. AUTHORIZATION OVERVIEW

FlowSpace menggunakan sistem Role-Based Access Control (RBAC) untuk mengatur hak akses pengguna.

Setiap pengguna memiliki akses berdasarkan keanggotaannya pada beberapa tingkat:

1. Organization Level.
2. Workspace Level.
3. Project Level.

Sistem authorization harus memvalidasi identitas pengguna, keanggotaan, role, permission, dan konteks resource sebelum mengizinkan operasi.

## 1.1 Authorization Hierarchy

```text
USER
  |
  v
ORGANIZATION
  |
  |-- Owner
  |-- Admin
  |-- Member
  |
  v
WORKSPACE
  |
  |-- Owner
  |-- Admin
  |-- Member
  |-- Viewer
  |
  v
PROJECT
  |
  |-- Manager
  |-- Member
  |-- Viewer
  |
  v
TASK
  |
  |-- Assignee
  |-- Collaborator
  |-- Watcher
```

Catatan:

Assignee, Collaborator, dan Watcher merupakan relasi partisipasi task, bukan role administratif.

---

# 2. USER ROLE DEFINITIONS

## 2.1 Organization Roles

### Organization Owner

Pemilik utama organisasi.

Responsibilities:
- Mengelola seluruh informasi organisasi.
- Mengelola anggota.
- Mengangkat dan menurunkan administrator.
- Mengelola workspace.
- Mengatur kebijakan organisasi.
- Memindahkan kepemilikan organisasi.
- Menghapus organisasi.

Rules:
- Setiap organisasi harus memiliki minimal satu owner.
- Owner tidak dapat menghapus dirinya sendiri sebelum memindahkan kepemilikan.
- Owner memiliki seluruh permission organisasi.

### Organization Admin

Administrator organisasi.

Responsibilities:
- Mengundang anggota.
- Mengelola anggota.
- Mengelola workspace sesuai kebijakan.
- Mengelola pengaturan organisasi yang diizinkan.

Restrictions:
- Tidak dapat menghapus organisasi.
- Tidak dapat memindahkan kepemilikan.
- Tidak dapat menghapus atau menurunkan owner.

### Organization Member

Anggota organisasi.

Responsibilities:
- Bergabung dengan workspace yang diizinkan.
- Berpartisipasi dalam project.
- Mengelola pekerjaan sesuai permission.

Restrictions:
- Tidak dapat mengelola organisasi.
- Tidak dapat mengundang anggota kecuali diberikan permission.
- Tidak otomatis memiliki akses ke seluruh workspace.

---

# 3. WORKSPACE ROLES

## 3.1 Workspace Owner

Memiliki kontrol penuh terhadap workspace.

Permissions:
- View Workspace.
- Update Workspace.
- Delete Workspace.
- Manage Members.
- Invite Members.
- Remove Members.
- Manage Workspace Roles.
- Manage Projects.
- Archive Projects.

## 3.2 Workspace Admin

Bertanggung jawab mengelola aktivitas workspace.

Permissions:
- View Workspace.
- Update Workspace sesuai permission.
- Manage Members.
- Invite Members.
- Remove Members.
- Create Projects.
- Manage Projects.

Restrictions:
- Tidak dapat menghapus workspace.
- Tidak dapat memindahkan ownership.

## 3.3 Workspace Member

Anggota workspace.

Permissions:
- View Workspace.
- View Projects yang dapat diakses.
- Create Projects jika diberikan permission.
- Berpartisipasi dalam project.

## 3.4 Workspace Viewer

Pengguna dengan akses baca.

Permissions:
- View Workspace.
- View Projects yang dapat diakses.
- View Tasks.

Restrictions:
- Tidak dapat membuat atau mengubah data.
- Tidak dapat menghapus resource.

---

# 4. PROJECT ROLES

## 4.1 Project Manager

Bertanggung jawab terhadap pengelolaan project.

Permissions:
- View Project.
- Update Project.
- Archive Project jika diizinkan.
- Manage Project Members.
- Create Tasks.
- Update Tasks.
- Delete Tasks.
- Assign Tasks.
- Manage Workflow.
- Manage Labels.
- Manage Sprints.
- View Reports.

## 4.2 Project Member

Anggota yang berpartisipasi dalam project.

Permissions:
- View Project.
- Create Tasks jika diizinkan.
- Update Tasks sesuai permission.
- Update Task Status.
- Create Comments.
- Upload Attachments.
- View Activities.

## 4.3 Project Viewer

Pengguna dengan akses read-only.

Permissions:
- View Project.
- View Tasks.
- View Comments.
- View Project Reports jika diizinkan.

---

# 5. PERMISSION CATALOG

Sistem menggunakan permission identifier yang konsisten.

## 5.1 Organization Permissions

| Permission | Description |
|---|---|
| organization.view | Melihat organisasi |
| organization.update | Mengubah organisasi |
| organization.delete | Menghapus organisasi |
| organization.manage_members | Mengelola anggota |
| organization.invite_members | Mengundang anggota |
| organization.remove_members | Menghapus anggota |
| organization.manage_roles | Mengelola role |
| organization.transfer_ownership | Memindahkan ownership |

## 5.2 Workspace Permissions

| Permission | Description |
|---|---|
| workspace.view | Melihat workspace |
| workspace.create | Membuat workspace |
| workspace.update | Mengubah workspace |
| workspace.delete | Menghapus workspace |
| workspace.manage_members | Mengelola anggota |
| workspace.invite_members | Mengundang anggota |
| workspace.remove_members | Menghapus anggota |
| workspace.manage_roles | Mengelola role |
| workspace.create_project | Membuat project |
| workspace.archive_project | Mengarsipkan project |

## 5.3 Project Permissions

| Permission | Description |
|---|---|
| project.view | Melihat project |
| project.update | Mengubah project |
| project.delete | Menghapus project |
| project.archive | Mengarsipkan project |
| project.manage_members | Mengelola anggota |
| project.manage_workflow | Mengelola workflow |
| project.manage_labels | Mengelola label |
| project.view_reports | Melihat laporan |

## 5.4 Task Permissions

| Permission | Description |
|---|---|
| task.view | Melihat task |
| task.create | Membuat task |
| task.update | Mengubah task |
| task.delete | Menghapus task |
| task.assign | Mengatur assignee |
| task.change_status | Mengubah status |
| task.change_priority | Mengubah prioritas |
| task.manage_deadline | Mengatur deadline |
| task.manage_labels | Mengelola label |
| task.manage_subtasks | Mengelola subtask |
| task.manage_dependencies | Mengelola dependencies |
| task.manage_watchers | Mengelola watchers |

## 5.5 Collaboration Permissions

| Permission | Description |
|---|---|
| comment.view | Melihat komentar |
| comment.create | Membuat komentar |
| comment.update_own | Mengubah komentar sendiri |
| comment.delete_own | Menghapus komentar sendiri |
| comment.delete_any | Menghapus komentar pengguna lain |
| attachment.upload | Mengunggah attachment |
| attachment.download | Mengunduh attachment |
| attachment.delete_own | Menghapus attachment sendiri |
| activity.view | Melihat activity history |
| notification.view | Melihat notifikasi |
| notification.manage | Mengelola notifikasi |

## 5.6 Sprint Permissions

| Permission | Description |
|---|---|
| sprint.view | Melihat sprint |
| sprint.create | Membuat sprint |
| sprint.update | Mengubah sprint |
| sprint.delete | Menghapus sprint |
| sprint.start | Memulai sprint |
| sprint.complete | Menyelesaikan sprint |
| sprint.manage_tasks | Mengelola task sprint |

---

# 6. DEFAULT ROLE-PERMISSION MATRIX

Keterangan:

- ✓ = Diizinkan.
- — = Tidak diizinkan.
- Custom = Bergantung pada konfigurasi permission.

| Permission Category | Org Owner | Org Admin | Workspace Admin | Project Manager | Member | Viewer |
|---|---|---|---|---|---|---|
| Manage Organization | ✓ | Custom | — | — | — | — |
| Manage Workspace | ✓ | Custom | ✓ | — | — | — |
| Manage Workspace Members | ✓ | Custom | ✓ | — | — | — |
| Create Project | ✓ | Custom | ✓ | Custom | Custom | — |
| Manage Project | ✓ | Custom | Custom | ✓ | Custom | — |
| Create Task | ✓ | ✓ | ✓ | ✓ | Custom | — |
| Update Task | ✓ | ✓ | ✓ | ✓ | Custom | — |
| Delete Task | ✓ | Custom | Custom | ✓ | Custom | — |
| Assign Task | ✓ | ✓ | ✓ | ✓ | Custom | — |
| Comment | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| View Project | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manage Sprint | ✓ | Custom | Custom | ✓ | Custom | — |
| View Reports | ✓ | ✓ | ✓ | ✓ | Custom | Custom |

Catatan:

Matriks ini merupakan konfigurasi default awal. Implementasi final harus menggunakan permission yang lebih granular dari Permission Catalog.

---

# 7. CUSTOM ROLE MANAGEMENT (POST-MVP / PHASE 4)

Catatan: Untuk MVP, FlowSpace menggunakan fixed RBAC enums (Owner, Admin, Member, Viewer, Manager) untuk memastikan stabilitas dan kesederhanaan arsitektur awal. Dukungan custom roles dinamis direncanakan pada Phase 4.

FlowSpace ke depannya akan mendukung custom roles.

Pengguna yang memiliki permission dapat membuat role tambahan.

Contoh:

- Senior Developer.
- QA Engineer.
- Designer.
- Product Owner.
- External Collaborator.

Setiap custom role dapat memiliki kombinasi permission tertentu.

Business Rules:

1. Role harus memiliki nama unik dalam scope-nya.
2. Custom role harus memiliki daftar permission.
3. Hanya pengguna berwenang yang dapat membuat atau mengubah role.
4. Role sistem tidak dapat dihapus sembarangan.
5. Perubahan permission harus tercatat dalam audit log.
6. Penghapusan role harus memeriksa anggota yang masih menggunakan role tersebut.

---

# 8. ACCESS CONTROL RULES

## 8.1 Tenant Isolation

Pengguna hanya boleh mengakses resource yang berada dalam tenant atau organisasi yang memiliki hubungan akses sah dengannya.

## 8.2 Resource Ownership

Pengguna tidak otomatis mendapatkan akses terhadap seluruh resource hanya karena mengetahui ID resource.

## 8.3 Inherited Permissions

Akses dapat diwariskan berdasarkan kebijakan organisasi dan workspace.

Namun, akses tidak boleh otomatis meluas ke seluruh project tanpa aturan yang jelas.

## 8.4 Explicit Deny

Permission yang secara eksplisit ditolak harus mengalahkan permission yang diwariskan.

## 8.5 Role Changes

Perubahan role harus berlaku secara konsisten dan tidak meninggalkan hak akses lama.

## 8.6 Revoked Membership

Ketika anggota dihapus dari workspace atau organisasi, akses terhadap resource yang bergantung pada keanggotaan tersebut harus dicabut.

Session dan koneksi real-time juga harus memperhatikan pencabutan akses.

---

# 9. AUTHORIZATION IMPLEMENTATION

Backend menggunakan NestJS Guards dan custom decorators.

Contoh konsep:

@RequirePermissions('task.update')

@UseGuards(SessionAuthGuard, PermissionsGuard)

Setiap endpoint yang memerlukan permission harus melakukan pemeriksaan di backend.

Authorization harus mempertimbangkan:

- Authenticated User.
- Organization Membership.
- Workspace Membership.
- Project Membership.
- Assigned Role.
- Required Permission.
- Resource Context.

Frontend hanya menyesuaikan tampilan berdasarkan permission yang diberikan backend.

Frontend bukan sumber kebenaran authorization.

---

# 10. SECURITY REQUIREMENTS

1. Semua endpoint privat harus memvalidasi authentication.
2. Setiap operasi terhadap resource harus memvalidasi authorization.
3. Semua query harus dibatasi berdasarkan konteks akses pengguna.
4. Sistem harus mencegah IDOR.
5. Perubahan role harus diaudit.
6. Perubahan membership harus diaudit.
7. Permission harus divalidasi untuk REST API maupun Socket.IO.
8. File attachment harus dilindungi dengan authorization.
9. Cache tidak boleh membocorkan data antar-tenant.
10. Perubahan permission harus segera memengaruhi akses berikutnya.

---

# 11. ACCEPTANCE CRITERIA

Authorization dianggap berhasil apabila:

1. User tidak dapat membuka organisasi tanpa akses.
2. User tidak dapat membuka workspace privat tanpa keanggotaan atau permission.
3. Viewer tidak dapat mengubah task.
4. Member tidak dapat menghapus project tanpa permission.
5. Project Manager dapat mengelola project sesuai kewenangannya.
6. Organization Admin tidak dapat mengambil alih kepemilikan organisasi.
7. Anggota yang dihapus kehilangan akses.
8. User tidak dapat mengakses attachment milik tenant lain.
9. Socket.IO tidak mengirim event kepada user tanpa akses.
10. Custom roles dapat digunakan tanpa melanggar batas tenant.

---

**END OF DOCUMENT**