# FlowSpace — Design System & UI Reference

**Version:** 1.0  
**Status:** Draft  
**Product:** FlowSpace — Collaborative Project Management SaaS

---

# 1. Design Philosophy

## 1.1 Design Direction

FlowSpace menggunakan pendekatan desain yang menggabungkan:

- Linear: minimalis, modern, profesional, dan fokus pada produktivitas.
- Trello: interaksi Kanban yang intuitif dan mudah digunakan.
- Jira: informasi project management yang terstruktur.

Tujuan desain adalah membuat pengguna dapat mengelola project tanpa merasa kewalahan oleh terlalu banyak informasi.

## 1.2 Design Principles

1. Clarity First — informasi harus mudah dipahami.
2. Minimalism — hindari elemen visual yang tidak memiliki fungsi.
3. Consistency — komponen harus memiliki pola visual yang konsisten.
4. Efficiency — pengguna dapat menyelesaikan pekerjaan dengan sedikit interaksi.
5. Feedback — setiap aksi harus memberikan respons visual.
6. Accessibility — warna, ukuran teks, dan interaksi harus mudah diakses.

---

# 2. Visual Identity

## 2.1 Brand Identity

**Product Name:** FlowSpace

**Tagline:** Organize Work. Move Forward.

**Brand Personality:**
- Professional
- Modern
- Collaborative
- Productive
- Reliable

## 2.2 Color Palette

### Dark Theme

| Token | Color | Usage |
|---|---|---|
| Background | #0B0D10 | Main background |
| Surface | #11151B | Sidebar and cards |
| Surface Elevated | #181E27 | Modals and dropdowns |
| Border | #252C36 | Borders and separators |
| Primary | #7C6CF2 | Primary actions |
| Primary Hover | #6B5CE7 | Hover state |
| Text Primary | #F1F3F5 | Main text |
| Text Secondary | #9AA4B2 | Secondary text |
| Text Muted | #667085 | Muted text |
| Success | #22C55E | Completed status |
| Warning | #F59E0B | Warning status |
| Danger | #EF4444 | Error and urgent |
| Info | #3B82F6 | Information |

### Light Theme

| Token | Color | Usage |
|---|---|---|
| Background | #F8FAFC | Main background |
| Surface | #FFFFFF | Cards and sidebar |
| Surface Elevated | #FFFFFF | Modals and dropdowns |
| Border | #E2E8F0 | Borders |
| Primary | #6D5CE7 | Primary actions |
| Text Primary | #172033 | Main text |
| Text Secondary | #64748B | Secondary text |
| Text Muted | #94A3B8 | Muted text |

**Implementation Rule:**

Gunakan CSS variables atau semantic design tokens. Jangan menuliskan kode warna secara langsung di setiap komponen.

---

# 3. Typography

## 3.1 Font Family

Gunakan **Inter** sebagai font utama.

Alternatif fallback:
- system-ui
- sans-serif

## 3.2 Typography Scale

| Element | Size | Weight |
|---|---:|---:|
| Page Heading | 28px | 700 |
| Section Heading | 20px | 600 |
| Card Heading | 16px | 600 |
| Body | 14px | 400 |
| Small Text | 12px | 400 |
| Button | 14px | 500 |
| Label | 12px | 500 |

Gunakan line-height yang nyaman dibaca dan jangan menggunakan terlalu banyak variasi ukuran font.

---

# 4. Layout System

## 4.1 Application Layout

Struktur utama aplikasi:

```text
┌─────────────────────────────────────────────────────────────┐
│                       APPLICATION                           │
├───────────────┬─────────────────────────────────────────────┤
│               │                                             │
│   SIDEBAR     │                 TOPBAR                      │
│               ├─────────────────────────────────────────────┤
│               │                                             │
│               │                                             │
│               │              MAIN CONTENT                   │
│               │                                             │
│               │                                             │
│               │                                             │
└───────────────┴─────────────────────────────────────────────┘
```

## 4.2 Sidebar

Lebar sidebar desktop: sekitar 250px.

Komponen:

1. FlowSpace Logo
2. Organization Switcher
3. Workspace Navigation
4. Main Navigation
5. Projects List
6. Settings
7. User Profile

Contoh navigasi:

```text
FlowSpace

[ Organization ▼ ]

WORKSPACE
  Overview
  My Tasks
  Inbox

PROJECTS
  Website Redesign
  Mobile Application
  Internal Dashboard

TOOLS
  Reports
  Members

SETTINGS
  Workspace Settings

[ User Profile ]
```

Sidebar harus mendukung:
- Expand dan collapse.
- Active navigation state.
- Organization switching.
- Workspace switching.
- Project navigation.
- Tooltip saat sidebar dalam kondisi collapsed.

## 4.3 Topbar

Komponen:

- Breadcrumb navigation.
- Page title atau context.
- Search button.
- Quick create button.
- Notification button.
- User avatar.

Topbar harus sederhana dan tidak terlalu penuh.

## 4.4 Main Content

Area konten harus:
- Menggunakan ruang secara efisien.
- Memiliki padding konsisten.
- Mendukung scrolling secara independen jika diperlukan.
- Menghindari horizontal overflow.
- Memiliki loading, empty, dan error state.

---

# 5. Navigation Structure

Struktur navigasi utama:

```text
Organization
│
├── Overview
│
├── Workspaces
│   ├── Workspace Overview
│   ├── My Tasks
│   ├── Inbox
│   │
│   └── Projects
│       ├── Project Overview
│       ├── Board
│       ├── List
│       ├── Backlog
│       └── Settings
│
├── Members
│
├── Reports
│
└── Organization Settings
```

Catatan: Tidak semua halaman harus tersedia pada MVP. Navigasi hanya menampilkan fitur yang sudah diimplementasikan atau memang menjadi bagian dari rilis tersebut.

---

# 6. Core UI Components

## 6.1 Buttons

Jenis tombol:

- Primary
- Secondary
- Outline
- Ghost
- Destructive
- Icon Button

Ukuran:

- Small
- Medium
- Large

Setiap tombol harus memiliki:
- Default state
- Hover state
- Active state
- Disabled state
- Loading state

## 6.2 Input Fields

Jenis:
- Text Input
- Email Input
- Password Input
- Textarea
- Search Input
- Select
- Multi-select
- Date Picker

Setiap input harus mendukung:
- Label
- Placeholder
- Helper text
- Validation error
- Disabled state

## 6.3 Dialogs and Modals

Digunakan untuk:
- Create project
- Edit project
- Create task
- Edit task
- Invite member
- Delete confirmation

Modal harus fokus pada satu tindakan utama dan tidak terlalu besar.

## 6.4 Dropdown Menus

Digunakan untuk:
- User menu
- Organization switcher
- Workspace switcher
- Project actions
- Task actions

## 6.5 Toast Notifications

Jenis:
- Success
- Error
- Warning
- Information

Toast harus memberikan feedback tanpa mengganggu pekerjaan pengguna.

---

# 7. Dashboard Design

## 7.1 Dashboard Overview

Dashboard menampilkan ringkasan pekerjaan.

Komponen utama:

1. Welcome Header
2. Workspace Summary
3. My Tasks
4. Recent Projects
5. Upcoming Deadlines
6. Recent Activity

Contoh layout:

```text
Good morning, User!

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Total Tasks  │ │ In Progress  │ │ Completed    │
│     24       │ │      8       │ │      12      │
└──────────────┘ └──────────────┘ └──────────────┘

My Tasks

┌───────────────────────────────────────────────────┐
│ Task Name             Priority       Due Date     │
│ Build Authentication  High           Nov 20       │
│ Create Dashboard UI   Medium         Nov 22       │
│ API Integration       High           Nov 25       │
└───────────────────────────────────────────────────┘

Recent Projects

┌───────────────────┐ ┌───────────────────┐
│ Website Redesign  │ │ Mobile Application│
│ Progress: 65%     │ │ Progress: 40%      │
└───────────────────┘ └───────────────────┘
```

---

# 8. Project Management UI

## 8.1 Project Header

Informasi:
- Project name
- Project description
- Project status
- Project members
- Project actions
- View switcher

## 8.2 Project Views

Semua view menggunakan sumber data task yang sama.

View yang direncanakan:

| View | Description | Priority |
|---|---|---|
| Kanban | Task berdasarkan status | MVP |
| List | Task dalam bentuk tabel/list | Phase 2 |
| Backlog | Pengelolaan backlog dan sprint | Phase 2 |
| Calendar | Task berdasarkan tanggal | Phase 3 |
| Timeline | Jadwal dan dependency | Phase 3 |
| Reports | Analisis project | Phase 3 |

Jangan membuat tabel database terpisah untuk setiap jenis view. Semua view harus membaca dan memanipulasi entitas task yang sama.

---

# 9. Kanban Board Design

## 9.1 Board Structure

```text
Project: Website Redesign

[ Board ] [ List ] [ Backlog ]       [+ Add Task]

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ TODO         │ │ IN PROGRESS  │ │ DONE         │
│  4 Tasks     │ │  3 Tasks     │ │  5 Tasks     │
├──────────────┤ ├──────────────┤ ├──────────────┤
│ Task Card    │ │ Task Card    │ │ Task Card    │
│ Task Card    │ │ Task Card    │ │ Task Card    │
│ Task Card    │ │ Task Card    │ │ Task Card    │
│              │ │              │ │              │
│ + Add Task   │ │ + Add Task   │ │ + Add Task   │
└──────────────┘ └──────────────┘ └──────────────┘
```

## 9.2 Task Card

Informasi yang ditampilkan:

- Task identifier.
- Task title.
- Priority indicator.
- Assignee avatar.
- Due date.
- Label.
- Comment indicator.

Contoh:

```text
┌──────────────────────────────┐
│ FS-102                       │
│ Implement Authentication     │
│                              │
│ [High] [Backend]             │
│                              │
│ 👤 User Avatar     Nov 25    │
└──────────────────────────────┘
```

## 9.3 Drag and Drop

Gunakan dnd-kit.

Ketentuan:
- Task dapat dipindahkan antarstatus.
- Task dapat diurutkan dalam satu kolom.
- Tampilkan visual feedback ketika dragging.
- Simpan perubahan ke backend.
- Tangani kegagalan penyimpanan.
- Cegah perubahan urutan yang tidak konsisten akibat concurrent updates.

Jangan hanya mengubah tampilan lokal tanpa menyimpan perubahan ke database.

---

# 10. Task Detail Interface

Task detail dapat ditampilkan melalui modal besar atau side panel.

Informasi utama:

- Task ID
- Task title
- Description
- Status
- Priority
- Assignee
- Collaborators
- Due date
- Labels
- Subtasks
- Dependencies
- Comments
- Activity history
- Attachments

Contoh struktur:

```text
┌──────────────────────────────────────────────────────┐
│ FS-102                                      [ ... ]   │
│                                                      │
│ Implement Authentication                             │
│                                                      │
│ Description                                          │
│ Build authentication module using NestJS.            │
│                                                      │
│ ──────────────────────────────────────────────────── │
│                                                      │
│ Subtasks                                             │
│ [ ] Create login endpoint                            │
│ [ ] Create register endpoint                         │
│ [ ] Implement password hashing                       │
│                                                      │
│ Comments                                             │
│ User: Authentication endpoint is ready.              │
│                                                      │
├─────────────────────────────┬────────────────────────┤
│                             │ Properties             │
│                             │ Status: In Progress    │
│                             │ Priority: High         │
│                             │ Assignee: User         │
│                             │ Due Date: Nov 25       │
└─────────────────────────────┴────────────────────────┘
```

Task detail harus mendukung edit tanpa membuat pengguna berpindah halaman.

---

# 11. Empty, Loading, and Error States

Setiap halaman dan komponen data harus memiliki tiga kondisi utama.

## 11.1 Empty State

Contoh:
- Belum ada project.
- Belum ada task.
- Belum ada anggota.
- Belum ada notifikasi.

Berikan pesan yang jelas dan CTA yang relevan.

## 11.2 Loading State

Gunakan skeleton loading untuk:
- Dashboard cards.
- Task cards.
- Project lists.
- Member lists.

Hindari menampilkan halaman kosong selama proses pengambilan data.

## 11.3 Error State

Tampilkan:
- Pesan kesalahan yang dapat dipahami.
- Tombol retry jika memungkinkan.
- Tidak menampilkan informasi teknis sensitif kepada pengguna.

---

# 12. Responsive Design

## Desktop

Prioritas utama:
- Sidebar tetap terlihat.
- Kanban menggunakan beberapa kolom horizontal.
- Task detail dapat menggunakan side panel.
- Dashboard menggunakan beberapa kolom.

## Tablet

- Sidebar dapat collapsed.
- Kanban tetap dapat digulir secara horizontal.
- Dashboard menggunakan layout lebih sederhana.

## Mobile

- Sidebar berubah menjadi drawer.
- Navigasi menggunakan menu yang ringkas.
- Task detail menggunakan full-screen modal atau halaman khusus.
- Kanban mendukung horizontal scrolling.
- Tombol utama mudah dijangkau.

---

# 13. Accessibility

FlowSpace harus memperhatikan:

- Kontras warna yang memadai.
- Navigasi menggunakan keyboard.
- Focus indicator yang jelas.
- Label pada form.
- ARIA attributes untuk komponen interaktif.
- Tidak mengandalkan warna saja untuk menunjukkan status atau prioritas.
- Dukungan reduced motion.

---

# 14. Frontend Component Architecture

Struktur komponen yang disarankan:

```text
components/
│
├── ui/
│   ├── button.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── avatar.tsx
│   └── badge.tsx
│
├── layout/
│   ├── app-sidebar.tsx
│   ├── app-header.tsx
│   ├── app-layout.tsx
│   └── workspace-switcher.tsx
│
├── dashboard/
│   ├── dashboard-header.tsx
│   ├── summary-cards.tsx
│   ├── my-tasks.tsx
│   └── recent-projects.tsx
│
├── projects/
│   ├── project-header.tsx
│   ├── project-navigation.tsx
│   └── project-card.tsx
│
├── kanban/
│   ├── kanban-board.tsx
│   ├── kanban-column.tsx
│   ├── task-card.tsx
│   └── create-task-dialog.tsx
│
└── tasks/
    ├── task-detail-panel.tsx
    ├── task-properties.tsx
    ├── task-comments.tsx
    └── task-activity.tsx
```

Struktur ini merupakan panduan awal. Jangan memaksakan semua komponen masuk ke satu folder jika kompleksitas aplikasi meningkat.

---

# 15. Frontend Design Rules

1. Gunakan reusable components.
2. Gunakan semantic color tokens.
3. Hindari inline styling yang tidak diperlukan.
4. Hindari duplikasi komponen.
5. Gunakan konsistensi spacing.
6. Semua halaman harus memiliki loading, empty, dan error state.
7. Jangan membuat data dummy sebagai pengganti integrasi backend pada fitur yang sudah masuk tahap implementasi.
8. Jangan mengubah design system secara sembarangan.
9. Gunakan komponen shadcn/ui sebagai fondasi, bukan alasan untuk membuat semua halaman terlihat seperti template default.
10. Pastikan desain konsisten pada seluruh halaman.

---

# 16. Design Implementation Priority

| Priority | Component | Release |
|---|---|---|
| P0 | Application Layout | MVP |
| P0 | Sidebar & Topbar | MVP |
| P0 | Authentication Pages | MVP |
| P0 | Dashboard | MVP |
| P0 | Project Header | MVP |
| P0 | Kanban Board | MVP |
| P0 | Task Card | MVP |
| P0 | Task Detail | MVP |
| P0 | Dialog & Form | MVP |
| P1 | List View | Phase 2 |
| P1 | Backlog View | Phase 2 |
| P1 | Notification UI | Phase 2 |
| P2 | Calendar View | Phase 3 |
| P2 | Timeline View | Phase 3 |
| P2 | Analytics Dashboard | Phase 3 |

---

# 17. Final Design Direction

FlowSpace harus terlihat seperti aplikasi SaaS profesional yang benar-benar dapat digunakan oleh tim software development.

Target visual:
- Modern.
- Minimalis.
- Konsisten.
- Responsif.
- Tidak terlalu ramai.
- Memprioritaskan produktivitas.

Referensi visual bukan untuk disalin secara langsung. FlowSpace harus memiliki identitas visual sendiri.

**Design principle utama:**

"Make complex project management feel simple."