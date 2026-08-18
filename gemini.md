# 🧠 TU-North CPMS Project Brain (`gemini.md`)

> **ระบบจัดการโครงงานคอมพิวเตอร์ (Computer Project Management System - CPMS)**  
> พัฒนาขึ้นสำหรับนักเรียนชั้นมัธยมศึกษาปีที่ 6 และคณะครูผู้สอน โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ (TU-North)  
> ครอบคลุมกระบวนการตั้งแต่ รวมกลุ่มโครงงาน, เลือกที่ปรึกษา, ส่งงานตาม Milestone, ตรวจงานและให้ข้อเสนอแนะ, จองรอบนำเสนอ (Presentation Defense Booking), ประเมินคะแนนเกณฑ์ Rubric หลายกรรมการ (Multi-Evaluator Scoring) และส่งออกใบคะแนน (Grade Sheet Export)

---

## 📌 1. กฎเหล็กประจำโปรเจกต์ (Critical Project Rules)

1. **ห้ามใส่ Semicolon (`;`) ในไฟล์ TypeScript และ JavaScript ทุกไฟล์เด็ดขาด** (Enforced via ESLint & Prettier `semi: false` / `semi: never`).
2. **ใช้งาน Bun เป็น Package Manager หลักสำหรับ Frontend** (`bun install`, `bun add`, `bun run dev`, `bun run build`) ห้ามใช้ npm, yarn หรือ pnpm.
3. **การพัฒนาต้องทำเป็น Phase ตาม Checklist ใน [`docs/spec.md`](docs/spec.md) เสมอ**:
   - เมื่อทำแต่ละข้อย่อยเสร็จ ให้ทำเครื่องหมาย Checkmark `[x]` ใน `docs/spec.md` ทันที
   - เมื่อจบแต่ละ Phase ให้หยุดสรุปและแสดง Test Cases ให้ตรวจสอบก่อนเริ่ม Phase ถัดไป
4. **Backend Architecture**: พัฒนาด้วย Go 1.26 + Fiber v2 + GORM แยกโครงสร้าง Clean/Modular Layer ชัดเจน (`cmd/`, `internal/config`, `internal/database`, `internal/models`, `internal/handlers`, `internal/middleware`, `internal/services`, `internal/routes`).
5. **Dual Login Identifier**: รองรับการเข้าสู่ระบบแบบยืดหยุ่น นักเรียนเข้าได้ทั้ง **รหัสนักเรียน (Student ID)** และ **Email** ส่วนครูและแอดมินเข้าด้วย **Email**.
6. **Local Volume Storage**: ไฟล์เอกสารโครงงาน (PDF/Word/PPTX <= 20MB) จัดเก็บบน Host ผ่าน Docker Volume Path `../../data/uploads/cpms` และให้บริการดาวน์โหลดตรงผ่าน Nginx / API.
7. **Deployment Architecture**: เชื่อมโยงเข้ากับระบบรวมของโรงเรียนผ่าน Docker Network `tunorth-net`, Cloudflare Tunnel (`cpms.tn.ac.th`), Local Nginx Proxy (Port 8009 & LAN Portal Port 80), และ PostgreSQL 17 (`cpms-db`) รวมศูนย์ใน `D:\TUNorth\infra\`.

---

## 🛠️ 2. สถาปัตยกรรมทางเทคโนโลยี (Tech Stack)

| หมวดหมู่ (Category) | เทคโนโลยีที่เลือกใช้ (Technology Stack) | รายละเอียด (Details) |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 16 (App Router)** | React 19, TypeScript, Server & Client Components |
| **Frontend Tooling** | **Bun 1.3+** | Ultra-fast Package Manager & Script Runner |
| **Styling & UI** | **Tailwind CSS (v4) + Shadcn/ui** | Modern Design System, Dark/Light Mode, Lucide React, Sonner Toast |
| **State Management** | **Zustand** | Client-side Global Store (Auth, UI, Filters) |
| **Typography** | **Google Fonts Prompt & Inter** | Prompt (ภาษาไทย) และ Inter (ภาษาอังกฤษ/ตัวเลข) |
| **Backend API** | **Go 1.26 + Fiber v2** | High-performance Go Web Framework |
| **ORM & Database** | **PostgreSQL 17 + GORM** | Container `cpms-db` ใน `infra/`, JSONB, UUID Keys |
| **Reverse Proxy (LAN)** | **Nginx (Alpine)** | Container `local-nginx`, Port 8009 & LAN Portal (Port 80) |
| **Internet Ingress (WAN)** | **Cloudflare Tunnel** | Container `cloudflare-tunnel` ➔ `https://cpms.tn.ac.th` |
| **Media & File Storage** | **Local Volume Mount** | `../../data/uploads/cpms` ➔ `/var/tunorth_data/uploads` (จำกัดขนาด <= 20MB) |
| **Notifications** | **Telegram Bot API** | Goroutine Asynchronous Telegram Alert Service |
| **Containerization** | **Docker & Docker Compose** | Multi-stage Dockerfiles บน Bridge Network `tunorth-net` |

---

## 🗂️ 3. โครงสร้างโฟลเดอร์โปรเจกต์ (Project Directory Map)

```text
D:\TUNorth
├── data/                             # Persistence Storage บน Host Machine
│   ├── postgres/cpms/                # PostgreSQL 17 Data Directory (cpms-db)
│   └── uploads/cpms/                 # File Deliverables Storage (PDF, Docx, PPTX)
│
├── infra/                            # Centralized Infrastructure & Databases
│   ├── docker-compose.yml            # Isolated DBs (cpms-db, etc.), Cloudflare, Nginx
│   ├── .env / .env.example           # Central Environment Configs
│   └── nginx/nginx.conf              # Local Nginx Reverse Proxy (Port 80, 8001-8009)
│
├── scripts/                          # Automation Shell Scripts
│   ├── deploy.sh                     # Build และ Deploy ทุกระบบรวมถึง CPMS
│   └── backup.sh                     # สำรองข้อมูล PostgreSQL และ Uploads อัตโนมัติทุกคืน
│
└── apps/cpms/                        # 🌟 TU-North CPMS Application
    ├── .env                          # Local / Container Environment Variables
    ├── .env.example                  # Example Environment Config
    ├── .gitignore                    # Git Ignore Patterns
    ├── docker-compose.yml            # Docker Compose เชื่อมโยง tunorth-net (backend, frontend)
    ├── gemini.md                     # 🧠 Project Brain & Memory (This file)
    │
    ├── docs/                         # Specification & Architecture
    │   ├── spec.md                   # System Requirements Specification & Phase Checklists
    │   └── cpms_standalone_deploy_plan.md # 🚀 Standalone Deploy Guide for Ubuntu Server
    │
    ├── frontend/                     # Next.js 16 (App Router) Frontend
    │   ├── .prettierrc               # Prettier config with semi: false
    │   ├── eslint.config.mjs         # ESLint config with semi: never
    │   ├── package.json              # Bun dependencies
    │   ├── Dockerfile                # Multi-stage Bun / Next.js Runner
    │   └── src/                      # App Router Pages, Components & Stores
    │
    ├── backend/                      # Go Fiber API Backend
    │   ├── go.mod / go.sum           # Go Modules
    │   ├── Dockerfile                # Multi-stage Go Binary Build
    │   ├── cmd/server/main.go        # Backend Entrypoint
    │   ├── internal/                 # Clean Architecture (handlers, routes, models, config)
    │   └── scripts/                  # Migration & Seeder Scripts (convert_cpms_db.py, postgres_cpms_init.sql)
    │
    └── old_system/                   # 📦 ข้อมูลระบบเดิม (Legacy PHP & MySQL Backup)
        └── tunorth-cpms/backup_cpms_db.sql
```

---

## 📊 4. โครงสร้างฐานข้อมูล (Database Entities & Relationships)

1. **`users`**: `id` (UUID PK), `student_id` (Unique, Nullable), `room`, `academic_year` (Nullable, Indexed), `email` (Unique), `password_hash`, `full_name`, `role` (`ADMIN`, `TEACHER`, `STUDENT`), `is_active`
2. **`teacher_assignments`**: `id` (UUID PK), `teacher_id` (FK -> `users`), `room` (เช่น `6.1`, `6.2`)
3. **`project_groups`**: `id` (UUID PK), `project_name_th`, `project_name_en`, `advisor_id` (FK -> `users`, Nullable), `advisor_name`, `academic_year`, `room`
4. **`group_members`**: `id` (UUID PK), `group_id` (FK -> `project_groups`), `user_id` (FK -> `users`), `is_leader`, `joined_at`
5. **`project_steps`**: `id` (UUID PK), `step_name`, `description`, `step_order`, `file_form_path`, `file_example_path`, `deadline`, `is_active`, `max_score`
6. **`submissions`**: `id` (UUID PK), `group_id` (FK -> `project_groups`), `step_id` (FK -> `project_steps`), `submitted_by` (FK -> `users`), `submission_type` (`file` / `link`), `file_path`, `status` (`PENDING`, `APPROVED`, `REJECTED`), `comment`, `score`, `revision_number`, `submitted_at`, `reviewed_at`
7. **`presentation_slots`**: `id` (UUID PK), `academic_year`, `start_time`, `end_time`, `location`, `max_groups`
8. **`presentation_bookings`**: `id` (UUID PK), `slot_id` (FK -> `presentation_slots`), `group_id` (FK -> `project_groups`), `booked_at`
9. **`presentation_criteria`**: `id` (UUID PK), `label`, `description`, `max_score`, `criteria_order`, `is_active`
10. **`presentation_scores`**: `id` (UUID PK), `booking_id` (FK -> `presentation_bookings`), `scorer_id` (FK -> `users`), `criteria_data` (JSONB), `total_score`, `comments`, `scored_at`
11. **`system_settings`**: `key` (VARCHAR PK), `value` (TEXT), `updated_at` (รวม 6 หมวดหมู่: General, Images & Branding, Submission Mode, Score Visibility, Telegram Bot, System Version & Network Deployment)
12. **`announcements`**: `id` (UUID PK), `title`, `content`, `is_pinned`, `created_by` (FK -> `users`), `created_at`
13. **`activity_logs`**: `id` (UUID PK), `user_id` (FK -> `users`), `user_role`, `action`, `description`, `ip_address`, `created_at`
14. **`academic_years`**: `id` (UUID PK), `year`, `term`, `is_current`, `is_active`

---

## 🎨 5. สถาปัตยกรรมอัตลักษณ์และการเชื่อมต่อ (Branding & Dynamic Ingress)

1. **Dynamic Branding Architecture**:
   - **Logo & Favicon Storage**: จัดเก็บบน Volume Disk (`UploadDir/branding/`) ผ่าน Endpoint `POST /api/v1/admin/settings/upload-image`
   - **Cross-Port URL Resolution**: Helper `api.getFileUrl(pathOrUrl)` แปลง Relative Path เป็น URL ของ Backend Base (`http://localhost:8009` ใน Local หรือ Domain จริงใน Production)
   - **Dynamic Favicon & Title Component**: `<DynamicBranding />` ใน `RootLayout` คอยดึง `/settings/public` และอัปเดต `<link rel="icon">`, `<link rel="shortcut icon">` และ `document.title` แบบ Real-time ผ่าน Event `branding-updated`
   - **Unified Branding Display**: โลโก้, ชื่อระบบ และลิขสิทธิ์จะแสดงผลตรงกันทั้งบน **Navbar**, **หน้าต่างผู้ดูแลระบบ**, และ **หน้าเข้าสู่ระบบ (Login Page)**
2. **Network & Deployment Ready**:
   - **LAN Intranet**: ให้บริการผ่าน Nginx Port 8009 และ Virtual Host `http://cpms.local`
   - **Cloudflare Tunnel**: ให้บริการผ่าน Ingress WAN `https://cpms.tn.ac.th`

---

## 🚀 6. สถานะความคืบหน้าของโครงการ (Roadmap & Status)

- [x] **Phase 1: การเตรียมโครงสร้างพื้นฐานและฐานข้อมูล (Infrastructure, Docker & Database Setup)** *(Completed & Verified)*
  - [x] สร้างโครงสร้างโฟลเดอร์โปรเจกต์ `apps/cpms/backend`, `apps/cpms/frontend` และ `apps/cpms/docs`
  - [x] เพิ่ม Service `cpms-db` (PostgreSQL 17-alpine) ใน `infra/docker-compose.yml`
  - [x] แก้ไข `infra/nginx/nginx.conf` เพิ่มพอร์ต `8009`, Virtual Hosts (`cpms.local`, `cpms.tn.ac.th`) และเมนู LAN Portal (Port 80)
  - [x] อัปเดต Shell Scripts ใน `scripts/deploy.sh` และ `scripts/backup.sh`
  - [x] สร้างสคริปต์ Data Migration (`convert_cpms_db.py`) และ Seeder แปลงข้อมูลจาก `backup_cpms_db.sql` เข้า PostgreSQL 17
  - [x] ตรวจสอบการเชื่อมต่อ Database และ Volume Persistence บนเครื่อง Server
- [x] **Phase 2: การพัฒนา Backend ด้วย Go, Fiber และ GORM (`apps/cpms/backend`)** *(Completed & Verified)*
  - [x] Initialized Go module (`go.mod`) พร้อมติดตั้ง Fiber v2, GORM, pgx, jwt-go, crypto, godotenv
  - [x] กำหนดค่า Configuration, Database Connection Pool, Logger, CORS, Recovery Middleware
  - [x] สร้าง GORM Models ทั้งหมดตาม Schema (Users, Groups, Steps, Submissions, Presentation, Scores, Settings, Logs, AcademicYears)
  - [x] สร้างระบบ Authentication, JWT Generation, Password Hashing, และ RBAC Middleware (`AdminGuard`, `TeacherGuard`, `StudentGuard`)
  - [x] พัฒนา Controller & Routes (Auth, Groups, Steps/Submissions, Presentation, Teacher Matrix, Admin Management, Academic Years CRUD & 1-Click Set Current)
  - [x] พัฒนาระบบ Admin Settings 6 หมวดหมู่ และ Image Upload API สำหรับ Site Logo / Favicon
  - [x] พัฒนา Telegram Notification Service แบบ Asynchronous (Goroutine)
  - [x] ติดตั้งและตั้งค่า Air สำหรับ Live Reload (`.air.toml`)
  - [x] สร้าง Dockerfile สำหรับ Backend (`golang:1.26-alpine` Multi-stage build)
- [x] **Phase 3: การพัฒนา Frontend ด้วย Next.js 16 และ Bun (`apps/cpms/frontend`)** *(Completed & Verified)*
  - [x] ติดตั้ง Next.js 16 App Router ด้วย Bun + Shadcn/ui + Tailwind CSS + Lucide Icons + Sonner Toast
  - [x] ตั้งค่า Fonts Google Prompt & Inter และธีมสีระบบ (Primary `#5f06c4`)
  - [x] สร้าง API Client และ Helper `api.getFileUrl()` สำหรับจัดการ URL รูปภาพ
  - [x] สร้าง State Management ด้วย Zustand (Auth Store, Theme)
  - [x] พัฒนา Layout, Shared Components, Dynamic Branding (`dynamic-branding.tsx`), และ Reusable Modal Component (`modal.tsx`)
  - [x] พัฒนาหน้าจอ Dashboard ครบทั้ง 3 บทบาท (Admin, Teacher, Student):
    - [x] **Admin Portal**: User Management (Search, Filter, Pagination, CSV Template, CSV Import, Password Reset), Group Management (Leader transfer 👑, Member management), Academic Year Management (CRUD, 1-Click Set Current, Group counts), Teacher-Room Assignment, Steps & Rubric Criteria, Presentation Slots, System Settings 6 หมวดหมู่พร้อม Banner & Quick Links, Activity Logs
    - [x] **Teacher Portal**: Review Queue, Classroom Progress Matrix, Review Submission Modal, Multi-Evaluator Rubric Modal, Export Grade Sheet & Score CSV
    - [x] **Student Portal**: Group Overview, Student Edit Group (TH/EN, Advisor), Member Management, Sequential/Open Milestone Submission, Presentation Defense Booking, Rubric Score Review พร้อมการซ่อนคะแนน
  - [x] สร้าง Dockerfile สำหรับ Frontend (`oven/bun:1-alpine` Multi-stage build)
- [x] **Phase 4: การทดสอบความถูกต้อง การเชื่อมโยงระบบ และการส่งมอบ (Testing & Deployment)** *(Completed & Verified)*
  - [x] ทดสอบ Build Backend (`go build -o server.exe ./cmd/server`) ผ่านสมบูรณ์ (0 Errors)
  - [x] ทดสอบ Build Frontend (`bun run build`) ผ่านสมบูรณ์ (0 Errors)
  - [x] ทดสอบ End-to-End User Flow ครบทั้ง 3 บทบาท
  - [x] จัดเตรียมไฟล์ Containerization & Production Configuration (`docker-compose.yml`, `.env.example`, `.env`)
  - [x] บูรณาการเข้ากับ Infrastructure กลางของโรงเรียน (`scripts/setup.sh`, `scripts/restore_db.sh`, `DEPLOYMENT_GUIDE.md`)
  - [x] จัดทำคู่มือขั้นตอนการ Deploy เฉพาะระบบ CPMS ใน [`docs/cpms_standalone_deploy_plan.md`](docs/cpms_standalone_deploy_plan.md)
  - [x] ตั้งค่า `.gitignore` เพื่อยกเว้น `old_system/`, build outputs, binaries, และ `.env`
  - [x] Push ซอร์สโค้ดและเอกสารทั้งหมดขึ้น GitHub Repository (`https://github.com/NOGiTTiS/CPMS.git`)
  - [x] จัดทำเอกสารสรุปผลและคู่มือการใช้งาน (`docs/spec.md`, `gemini.md`, `HANDOVER_SUMMARY.md`, `walkthrough.md`)

---

## ⚡ 6. คำสั่งสำคัญสำหรับการพัฒนาและการ Deploy (Key Commands)

```powershell
# =============================================================
# โหมดพัฒนาภายในเครื่อง (Local Development Mode - Windows)
# =============================================================
# 1. รัน Backend Local Dev (Go with Fiber)
cd D:\TUNorth\apps\cpms\backend
.\server.exe              # หรือ go run ./cmd/server
# Backend API: http://localhost:8009

# 2. รัน Frontend Local Dev (Next.js with Bun)
cd D:\TUNorth\apps\cpms\frontend
bun run dev               # รัน Dev Server (http://localhost:3000)
bun run build             # ตรวจสอบการ Build สำหรับ Production

# =============================================================
# โหมดการ Deploy บน Ubuntu Server 24.04 LTS (Production)
# =============================================================
# 1. Deploy เฉพาะระบบ CPMS ครั้งแรก
mkdir -p ~/TUNorth/data/postgres/cpms ~/TUNorth/data/uploads/cpms/branding
chmod -R 777 ~/TUNorth/data/uploads/cpms
cd ~/TUNorth/infra && docker compose up -d cpms-db
docker exec -i cpms-db psql -U postgres -d tunorth_cpms_db < ~/TUNorth/tunorth-cpms_db_backup_20260727.sql
cd ~/TUNorth/infra && docker compose restart nginx
cd ~/TUNorth/apps/cpms && docker compose up -d --build

# 2. Re-deploy เฉพาะ Frontend หรือ Backend ของ CPMS
cd ~/TUNorth/apps/cpms
docker compose up -d --build frontend
docker compose up -d --build backend

# =============================================================
# Git & GitHub Repository
# =============================================================
# Remote Repository: https://github.com/NOGiTTiS/CPMS.git (Branch: main)
git status
git add .
git commit -m "Your commit message"
git push origin main
```

---

## 🔑 7. ข้อมูลบัญชีผู้ใช้เริ่มต้นสำหรับทดสอบ (Default Seed Accounts)

| Identifier / Email | Role | รหัสผ่านเริ่มต้น | รายละเอียด |
| :--- | :--- | :--- | :--- |
| `admin@tunorth.ac.th` | **ADMIN** | `admin1234` | ผู้ดูแลระบบ CPMS (Admin Control Panel) |
| `somchai@tunorth.ac.th` | **TEACHER** | `password` | คุณครูสมชาย (ครูผู้สอนประจำห้อง 6.1) |
| `student1@tunorth.ac.th` หรือ `28926` | **STUDENT** | `password` | นายสมศักดิ์ ตัวอย่าง (นักเรียนห้อง 6.1) |
| `student2@tunorth.ac.th` หรือ `28927` | **STUDENT** | `password` | นางสาวสมศรี ตัวอย่าง (นักเรียนห้อง 6.1) |
