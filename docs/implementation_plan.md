# 🚀 TU-North CPMS: System Requirements & Architecture Implementation Plan
**Project Name**: TU-North CPMS (Computer Project Management System - ระบบจัดการโครงงานคอมพิวเตอร์)  
**Organization**: โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ (TU-North)  
**Full Specification Document**: [spec.md](file:///D:/TUNorth/apps/cpms/docs/spec.md)  
**Roles & Perspectives**: Product Manager, Software Architect, DevOps Engineer  

---

## 1. Executive Summary & Goal Description
**TU-North CPMS** is a modernized, enterprise-grade web application tailored for managing senior high school (Grade 12 / ม.6) Computer Science projects. It facilitates end-to-end workflows: student group formation, sequential/open step-by-step milestone submissions, teacher grading and review matrices, presentation defense booking, multi-evaluator rubric-based grading, and comprehensive analytics/exports.

### ⚡ Strict Tech Stack Specifications
- **Package Manager**: **Bun 1.3+ (Strict Requirement: All JS/TS package management, script running, and frontend build commands MUST use `bun`. Never use `npm`, `yarn`, or `pnpm`)**.
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Shadcn/ui, Sonner Toast, Zustand, Lucide Icons, Prompt & Inter Typography.
- **Backend**: Go 1.26, Fiber v2, GORM ORM, Air (live reload), PostgreSQL 17 driver.
- **Database**: PostgreSQL 17 (`cpms-db` in `tunorth-net` Docker network).
- **DevOps**: Docker Compose, Local Nginx Reverse Proxy (Port 8009 & LAN Portal), Cloudflare Tunnel (`cpms.tn.ac.th`), automated daily backups on Ubuntu Server 24.04 LTS (HP ProLiant ML350 G6).
- **Migration**: Full legacy data migration from `backup_cpms_db.sql` (MySQL) to PostgreSQL 17.

---

## 2. System Architecture & Topology

```mermaid
graph TD
    subgraph "External Ingress"
        CF[Cloudflare Edge / Tunnel<br>cpms.tn.ac.th]
    end

    subgraph "Local Network (LAN Access)"
        LAN[Local Users / School LAN<br>http://192.168.165.11:8009]
        NGINX[Local Nginx Proxy<br>local-nginx (Port 8009 / 80)]
    end

    subgraph "Docker Network: tunorth-net"
        FE[cpms-frontend<br>Next.js 16 via Bun :3000]
        BE[cpms-backend<br>Go 1.26 + Fiber v2 :8080]
        DB[(cpms-db<br>PostgreSQL 17-alpine :5432)]
        TG[Telegram Bot API<br>Alerts & Notifications]
    end

    subgraph "Persistence Volumes (Host File System)"
        VOL_DB[TUNorth/data/postgres/cpms]
        VOL_UP[TUNorth/data/uploads/cpms]
    end

    CF -->|Route / | FE
    CF -->|Route /api/* | BE
    LAN --> NGINX
    NGINX -->|Reverse Proxy / | FE
    NGINX -->|Reverse Proxy /api/ | BE
    FE -->|API Requests & Hydration| BE
    BE -->|GORM Connection Pool| DB
    BE -->|Async Alerts| TG
    DB --- VOL_DB
    BE --- VOL_UP
```

---

## 3. RBAC Policy & Permission Matrix (Role-Based Access Control)

| Feature / Action | Admin | Teacher | Student | Guest / Public |
| :--- | :---: | :---: | :---: | :---: |
| **Authentication & Profile** |
| Login (Student ID or Email + Password) | ✅ | ✅ | ✅ | ❌ |
| View / Edit Own Profile & Change Password | ✅ | ✅ | ✅ | ❌ |
| Reset User Passwords / Manage Users | ✅ | ❌ | ❌ | ❌ |
| Batch Import Users (CSV) | ✅ | ❌ | ❌ | ❌ |
| **Project Group Management** |
| Create Project Group (Thai/EN title, Advisor, Room) | ✅ | ❌ | ✅ (Leader) | ❌ |
| Add / Remove Group Members (Cross-room allowed) | ✅ | ❌ | ✅ (Leader) | ❌ |
| Dissolve / Delete Group (with file cleanup) | ✅ | ❌ | ✅ (Leader) | ❌ |
| View All Project Groups & Details | ✅ | ✅ | ✅ (Own Group) | ❌ |
| **Project Steps & Deliverables** |
| Manage Steps (CRUD, Files/Links, Order, Deadlines) | ✅ | ❌ | ❌ | ❌ |
| Toggle Submission Mode (Sequential / Open) | ✅ | ❌ | ❌ | ❌ |
| Submit Deliverable (Upload file <= 20MB or URL Link) | ❌ | ❌ | ✅ (Group Member) | ❌ |
| View Submission Revisions & Feedback History | ✅ | ✅ | ✅ (Own Group) | ❌ |
| Grade Submissions (Approve / Reject / Score / Feedback) | ✅ | ✅ (Assigned Rooms) | ❌ | ❌ |
| **Presentation Defense & Rubrics** |
| Manage Defense Slots (Schedule, Location, Capacity) | ✅ | ✅ | ❌ | ❌ |
| Manage Rubric Criteria (Max scores, Weights, Descriptions) | ✅ | ❌ | ❌ | ❌ |
| Book / Cancel Presentation Slot | ✅ | ❌ | ✅ (1 per Group) | ❌ |
| Multi-Committee Rubric Scoring & Evaluation | ✅ | ✅ (Any Committee) | ❌ | ❌ |
| Real-time Score Aggregation & Grade Calculation | ✅ | ✅ | ✅ (If enabled in settings) | ❌ |
| **Analytics, Exports & Settings** |
| Progress Tracking Matrix (All Rooms / Assigned Rooms) | ✅ | ✅ (Assigned Rooms) | ❌ | ❌ |
| Export Grade Sheets & Defense Scores (CSV/Excel) | ✅ | ✅ (Assigned Rooms) | ❌ | ❌ |
| System Settings & Telegram Bot Webhook Config | ✅ | ❌ | ❌ | ❌ |
| Manage Announcements & Academic Years | ✅ | ❌ | ❌ | ❌ |
| Audit Activity Logs | ✅ | ❌ | ❌ | ❌ |

---

## 4. Phased Implementation Plan & Checklist

### 📌 Phase 1: Infrastructure, Docker & Database Setup
- [ ] Create directory structure `apps/cpms/backend`, `apps/cpms/frontend`, `apps/cpms/docs`
- [ ] Configure `cpms-db` (PostgreSQL 17-alpine) in `D:\TUNorth\infra\docker-compose.yml`
- [ ] Configure `D:\TUNorth\infra\nginx\nginx.conf` for Port `8009`, Virtual Hosts (`cpms.local`, `cpms.tn.ac.th`), and LAN Portal (Port 80)
- [ ] Update `D:\TUNorth\scripts\deploy.sh` and `D:\TUNorth\scripts\backup.sh`
- [ ] Build Data Migration / Seeder script to migrate MySQL `backup_cpms_db.sql` into PostgreSQL 17

### 📌 Phase 2: Go Backend Development (`apps/cpms/backend`)
- [ ] Initialize Go 1.26 project with Fiber v2, GORM, PostgreSQL driver, and JWT
- [ ] Implement database models, schema auto-migration, and seeders
- [ ] Implement JWT authentication and RBAC middlewares
- [ ] Implement REST API controllers:
  - [ ] Auth & User Profile Controller
  - [ ] Project Group & Membership Controller
  - [ ] Steps & Deliverables Submissions Controller (with <=20MB uploads and revision history)
  - [ ] Presentation Slots, Booking & Multi-Committee Scoring Controller
  - [ ] Teacher Queue & Grade Sheet Export Controller
  - [ ] Admin Console, System Settings, Academic Years & Activity Logs Controller
  - [ ] Telegram Bot Async Notification Service
- [ ] Write backend Dockerfile (`golang:1.26-alpine`)

### 📌 Phase 3: Frontend Development with Next.js 16 & Bun (`apps/cpms/frontend`)
- [ ] Scaffold Next.js 16 App Router using **Bun** (`bun create next-app . --typescript --tailwind --app`)
- [ ] Install Shadcn/ui, Lucide Icons, Sonner Toast, Zustand via **Bun**
- [ ] Configure Google Fonts Prompt & Inter, brand palette (`#5f06c4`), and dark/light mode
- [ ] Implement API client, error handling, and Zustand stores
- [ ] Build responsive pages:
  - [ ] `/(auth)/login`: Dual Login (Student ID / Email)
  - [ ] `/(dashboard)/student`: Group manager, submission timeline, slot booking, grade viewer
  - [ ] `/(dashboard)/teacher`: Review queue, progress matrix, grading modal, defense scoring, grade export
  - [ ] `/(dashboard)/admin`: Admin dashboard, user CRUD & CSV import, step configuration, slot manager, settings, logs
- [ ] Write frontend Dockerfile using `oven/bun:1-alpine`

### 📌 Phase 4: Verification, Testing & Deployment
- [ ] Build and test Go backend (`go test -v ./...`, `go build`)
- [ ] Build and test Next.js frontend with **Bun** (`bun run lint`, `bun run build`)
- [ ] Validate Docker Compose local containers
- [ ] Verify legacy data migration accuracy
- [ ] Test end-to-end user journeys (Student -> Teacher -> Committee -> Admin)
- [ ] Test LAN access (`http://192.168.165.11:8009`) and Cloudflare Tunnel (`https://cpms.tn.ac.th`)
- [ ] Create walkthrough documentation
