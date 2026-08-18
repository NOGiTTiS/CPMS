# 🎓 TU-North CPMS (Computer Project Management System)

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.3.1-black?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Bun](https://img.shields.io/badge/Bun-1.3+-fbf0df?style=for-the-badge&logo=bun&logoColor=black)
![Go](https://img.shields.io/badge/Go-1.26-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![Fiber](https://img.shields.io/badge/Fiber-v2-00ACD7?style=for-the-badge&logo=gofiber&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)

**ระบบจัดการโครงงานคอมพิวเตอร์แบบครบวงจร**  
พัฒนาขึ้นสำหรับนักเรียนชั้นมัธยมศึกษาปีที่ 6 และคณะครูผู้สอน **โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ (TU-North)**

[✨ ฟีเจอร์หลัก](#-ฟีเจอร์เด่นของระบบ-key-features) •
[🏗️ สถาปัตยกรรม](#️-สถาปัตยกรรมและเทคโนโลยี-architecture--tech-stack) •
[💻 สิ่งที่ต้องเตรียม](#-สิ่งที่ต้องเตรียมก่อนติดตั้ง-prerequisites) •
[🚀 เริ่มต้นติดตั้งทีละขั้นตอน](#-ขั้นตอนการติดตั้งและรันระบบแบบ-local-development) •
[🐳 การใช้งานผ่าน Docker](#-การรันและ-deploy-ด้วย-docker-compose) •
[🔑 บัญชีทดสอบ](#-บัญชีผู้ใช้งานเริ่มต้นสำหรับทดสอบ-default-credentials) •
[🛠️ ปัญหาที่พบบ่อย](#️-ปัญหาที่พบบ่อยและวิธีแก้ไข-troubleshooting--faq)

</div>

---

## 📖 บทนำ (Introduction)

**TU-North CPMS** คือแพลตฟอร์มบริหารจัดการกระบวนการทำโครงงานคอมพิวเตอร์ระดับโรงเรียนแบบครบวงจร (End-to-End Project Lifecycle Management) ตั้งแต่ขั้นตอนเริ่มต้นรวมกลุ่มโครงงาน, การเลือกครูที่ปรึกษา, การส่งงานตามลำดับขั้นตอนและเกณฑ์กำหนดส่ง (Milestone Submissions), การตรวจประเมินและให้ข้อเสนอแนะโดยครูประจำห้อง, การจองรอบนำเสนอโครงงาน (Presentation Defense Slot Booking), การประเมินคะแนนเกณฑ์ Rubric โดยคณะกรรมการหลายท่าน (Multi-Evaluator Scoring) ตลอดจนการสรุปผลคะแนนและการส่งออกเกรด (Grade Sheet Export)

---

## ✨ ฟีเจอร์เด่นของระบบ (Key Features)

### 🎓 1. สำหรับนักเรียน (Student Portal)
- **ระบบรวมกลุ่มโครงงาน (Project Group Management)**: สร้างกลุ่ม, ตั้งชื่อโครงงาน (ภาษาไทย/อังกฤษ), แต่งตั้งหรือโอนตำแหน่งหัวหน้ากลุ่ม (👑 Transfer Leader)
- **การเชิญและจัดการสมาชิก**: เพิ่มหรือลบสมาชิกในกลุ่ม (รองรับการดึงสมาชิกข้ามห้องเรียนตามโควตา)
- **เลือกครูที่ปรึกษา (Advisor Selection)**: เลือกครูที่ปรึกษาจากรายชื่อครูในระบบ
- **ส่งผลงานตามขั้นตอน (Milestone Submissions)**: ส่งไฟล์เอกสาร (PDF, Word, PPTX ขนาดไม่เกิน 20MB) หรือส่งเป็นลิงก์ (Google Drive / GitHub / YouTube) พร้อมระบบนับรอบการส่งงาน (Revision Tracker)
- **จองรอบนำเสนอโครงงาน (Defense Slot Booking)**: เลือกวัน เวลา และห้องสอบนำเสนอโครงงานแบบ Real-time พร้อมระบบป้องกันการจองซ้ำ
- **ตรวจสอบผลการประเมิน**: ดูคะแนนและข้อเสนอแนะจากครูผู้สอน และดูคะแนนประเมินการนำเสนอตามเกณฑ์ Rubric

### 👨‍🏫 2. สำหรับครูผู้สอนและกรรมการ (Teacher Portal)
- **ศูนย์รวมงานตรวจ (Review Queue)**: คัดกรองและตรวจผลงานตามขั้นตอน อนุมัติ (Approved) หรือสั่งแก้ไข (Rejected) พร้อมแนบข้อเสนอแนะ
- **ตารางติดตามความคืบหน้า (Classroom Progress Matrix)**: ดูภาพรวมความคืบหน้าของนักเรียนทุกกลุ่มในห้องเรียนที่ตนเองรับผิดชอบแบบ Real-time
- **ระบบประเมินคะแนน Rubric (Multi-Evaluator Defense Scoring)**: คณะกรรมการแต่ละท่านสามารถกรอกคะแนนตามเกณฑ์ Rubric แยกกันได้อย่างอิสระ โดยระบบจะคำนวณคะแนนเฉลี่ยให้อัตโนมัติ
- **ส่งออกใบคะแนน (Grade Sheet Export)**: ดาวน์โหลดสรุปคะแนนส่งงานและคะแนนนำเสนอออกมาเป็นไฟล์ CSV / Excel เพื่อนำไปตัดเกรด

### ⚙️ 3. สำหรับผู้ดูแลระบบ (Admin Control Panel)
- **จัดการผู้ใช้งาน (User Management)**: ค้นหา, กรองข้อมูลตามห้องเรียน/บทบาท, เพิ่ม/แก้ไขข้อมูล, ระบบรีเซ็ตรหัสผ่าน และระบบนำเข้ารายชื่อผ่าน CSV (พร้อมปุ่มดาวน์โหลด CSV Template)
- **จัดการปีการศึกษา (Academic Year Management)**: สร้างปีการศึกษาใหม่, สลับปีการศึกษาปัจจุบันด้วยปุ่มเดียว (1-Click Switch Current Year) พร้อมตรวจสอบจำนวนกลุ่มโครงงาน
- **มอบหมายห้องเรียน (Teacher-Room Assignment)**: กำหนดครูผู้สอนประจำห้องเรียนระดับชั้น ม.6
- **กำหนดขั้นตอนงานและเกณฑ์ Rubric (Steps & Rubric Management)**: เพิ่ม แก้ไข ปิดเปิดขั้นตอนส่งงาน พร้อมอัปโหลดไฟล์แม่แบบ/ตัวอย่าง และกำหนดเกณฑ์การให้คะแนนนำเสนอ
- **จัดการรอบนำเสนอ (Presentation Slots Management)**: กำหนดวัน เวลา สถานที่ และจำนวนกลุ่มที่รองรับในแต่ละรอบ
- **ตั้งค่าระบบและอัตลักษณ์ (Dynamic Branding & System Settings)**: เปลี่ยนชื่อระบบ, ข้อความหัวเว็บ, ลิขสิทธิ์, อัปโหลด Logo และ Favicon, เปิด/ปิดโหมดส่งงาน และตั้งค่าการแจ้งเตือนผ่าน Telegram Bot
- **บันทึกกิจกรรมระบบ (Activity Logs)**: ตรวจสอบประวัติการใช้งานและการเปลี่ยนแปลงข้อมูลสำคัญย้อนหลัง

---

## 🏗️ สถาปัตยกรรมและเทคโนโลยี (Architecture & Tech Stack)

```mermaid
graph TD
    UserWAN[🌐 นักเรียน / ครู / แอดมิน (WAN)] -->|https://cpms.tn.ac.th| CF[Cloudflare Tunnel]
    UserLAN[🏫 เครือข่ายภายในโรงเรียน (LAN)] -->|http://cpms.local:8009| Nginx[Local Nginx Proxy]
    
    CF -->|tunorth-net| Frontend[Next.js 16 Frontend :3000]
    CF -->|tunorth-net /api| Backend[Go Fiber Backend :8080 / :8009]
    
    Nginx -->|tunorth-net| Frontend
    Nginx -->|tunorth-net| Backend
    
    Backend -->|Database Query| DB[(PostgreSQL 17 :5432)]
    Backend -->|Store Files| DiskUploads["📁 Host Volume /data/uploads/cpms"]
    Backend -.->|Alerts| Telegram["🤖 Telegram Bot API"]
```

### รายละเอียด Tech Stack

| ส่วนประกอบ (Component) | เทคโนโลยีที่เลือกใช้ (Technology) | รายละเอียดเพิ่มเติม |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 16 (App Router)** | React 19, TypeScript, Server & Client Components |
| **Frontend Runtime & Tooling** | **Bun 1.3+** | ตัวจัดการ Package และ Script Runner ความเร็วสูง |
| **UI & Styling** | **Tailwind CSS v4 + Shadcn/ui** | ดีไซน์ทันสมัย, รองรับ Responsive ทุกขนาดหน้าจอ, Lucide Icons, Sonner Toast |
| **Client State Management** | **Zustand** | จัดการ State ฝั่ง Client (Auth, Session, Theme) |
| **Backend API** | **Go 1.26 + Fiber v2** | High-performance Web Framework สถาปัตยกรรม Clean Architecture |
| **ORM & Database Tool** | **GORM + pgx driver** | เชื่อมต่อ PostgreSQL, รองรับ JSONB, UUID และ Auto Migration |
| **Database** | **PostgreSQL 17** | จัดเก็บข้อมูลระบบ (UUID Primary Keys, Indexes, Cascades) |
| **Containerization** | **Docker & Docker Compose** | Multi-stage Builds เชื่อมต่อบน Bridge Network `tunorth-net` |

---

## 💻 สิ่งที่ต้องเตรียมก่อนติดตั้ง (Prerequisites)

สำหรับผู้เริ่มต้น แนะนำให้ดาวน์โหลดและติดตั้งเครื่องมือเหล่านี้ลงในเครื่องคอมพิวเตอร์ของคุณก่อน:

1. **Git**: สำหรับดาวน์โหลดโค้ด ([ดาวน์โหลด Git](https://git-scm.com/downloads))
2. **Go (เวอร์ชัน 1.22 หรือใหม่กว่า)**: สำหรับรัน Backend API ([ดาวน์โหลด Go](https://go.dev/dl/))
3. **Bun (เวอร์ชัน 1.2 หรือใหม่กว่า)**: สำหรับรัน Frontend ([คำแนะนำการติดตั้ง Bun](https://bun.sh))
   - **Windows (PowerShell)**:
     ```powershell
     powershell -c "irm bun.sh/install.ps1 | iex"
     ```
   - **macOS / Linux**:
     ```bash
     curl -fsSL https://bun.sh/install | bash
     ```
4. **PostgreSQL 17** หรือ **Docker Desktop**:
   - หากต้องการติดตั้ง PostgreSQL ในเครื่อง: [ดาวน์โหลด PostgreSQL](https://www.postgresql.org/download/)
   - หรือใช้งานผ่าน Docker Desktop: [ดาวน์โหลด Docker Desktop](https://www.docker.com/products/docker-desktop/)

> [!TIP]
> **ตรวจสอบเวอร์ชันหลังจากติดตั้งเสร็จสิ้น:**
> ```bash
> git --version
> go version
> bun --version
> docker --version    # (ถ้าใช้ Docker)
> ```

---

## 🚀 ขั้นตอนการติดตั้งและรันระบบแบบ Local Development

ทำตามขั้นตอนด้านล่างนี้ทีละสเต็ปเพื่อรันระบบบนเครื่องคอมพิวเตอร์ของคุณ:

### 1️⃣ โคลน Repository (Clone Project)

เปิด Terminal (หรือ PowerShell) แล้วรันคำสั่ง:

```bash
git clone https://github.com/NOGiTTiS/CPMS.git
cd CPMS
```

---

### 2️⃣ จัดเตรียมฐานข้อมูล (Database Setup)

#### ทางเลือก ก: รัน PostgreSQL ผ่าน Docker (แนะนำสำหรับมือใหม่ ⭐)
```bash
# รัน Container PostgreSQL ชั่วคราวสำหรับ Dev
docker run -d --name cpms-postgres -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_DB=tunorth_cpms_db postgres:17-alpine
```

#### ทางเลือก ข: รันผ่าน PostgreSQL ที่ติดตั้งในเครื่อง
1. เปิดโปรแกรม pgAdmin หรือ psql CLI
2. สร้างฐานข้อมูลชื่อ `tunorth_cpms_db`

#### 📥 นำเข้าโครงสร้างตารางและข้อมูลเริ่มต้น (Seed Initial Data):
ในโฟลเดอร์ `backend/scripts/` จะมีไฟล์ SQL สำหรับตั้งต้นระบบไว้ให้:

```bash
# ตัวอย่างการ Import ผ่าน Docker:
docker exec -i cpms-postgres psql -U postgres -d tunorth_cpms_db < backend/scripts/postgres_cpms_init.sql

# หรือใช้คำสั่ง psql บนเครื่อง:
psql -U postgres -h localhost -d tunorth_cpms_db -f backend/scripts/postgres_cpms_init.sql
```

---

### 3️⃣ ตั้งค่าและรัน Backend (Go Fiber)

1. เข้าไปยังโฟลเดอร์ `backend`:
   ```bash
   cd backend
   ```

2. สร้างไฟล์ `.env` โดยคัดลอกจาก `.env.example`:
   - **Windows (PowerShell)**:
     ```powershell
     Copy-Item .env.example .env
     ```
   - **macOS / Linux**:
     ```bash
     cp .env.example .env
     ```

3. ตรวจสอบและแก้ไขค่าการเชื่อมต่อฐานข้อมูลใน `backend/.env` ให้ตรงกับเครื่องของคุณ:
   ```env
   PORT=8009
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=password
   DB_NAME=tunorth_cpms_db
   DB_SSLMODE=disable
   JWT_SECRET=tunorth-cpms-jwt-access-secret-2568
   JWT_REFRESH_SECRET=tunorth-cpms-jwt-refresh-secret-2568
   UPLOAD_DIR=./uploads
   MAX_UPLOAD_SIZE_MB=20
   ```

4. ติดตั้ง Go Modules และสั่งรัน Backend Server:
   ```bash
   go mod download
   go run ./cmd/server
   ```
   🎉 เมื่อสำเร็จจะแสดงข้อความ: `Server running on port 8009`

---

### 4️⃣ ตั้งค่าและรัน Frontend (Next.js 16 + Bun)

1. เปิด Terminal หน้าต่างใหม่ แล้วเข้าไปยังโฟลเดอร์ `frontend`:
   ```bash
   cd frontend
   ```

2. สร้างไฟล์ `.env.local` เพื่อระบุ URL ของ Backend API:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8009
   ```

3. ติดตั้ง Dependencies ด้วย **Bun** (*ห้ามใช้ npm หรือ yarn*):
   ```bash
   bun install
   ```

4. สั่งรัน Frontend Development Server:
   ```bash
   bun run dev
   ```
   🎉 เมื่อสำเร็จจะแสดงข้อความ: `Ready in ...ms - http://localhost:3000`

---

### 5️⃣ เข้าใช้งานระบบผ่านเบราว์เซอร์

เปิดเว็บเบราว์เซอร์แล้วไปที่:  
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 บัญชีผู้ใช้งานเริ่มต้นสำหรับทดสอบ (Default Credentials)

ข้อมูลบัญชีเริ่มต้นที่ถูก Seeding ไว้ในระบบสำหรับทดสอบระบบแต่ละบทบาท:

| บทบาท (Role) | อีเมล / รหัสนักเรียน (Identifier) | รหัสผ่าน (Password) | รายละเอียดและสิทธิ์การใช้งาน |
| :--- | :--- | :--- | :--- |
| **👑 ผู้ดูแลระบบ (ADMIN)** | `admin@tunorth.ac.th` | `admin1234` | สิทธิ์ควบคุมสูงสุด, จัดการผู้ใช้, ปีการศึกษา, ตรวจสอบ Log |
| **👨‍🏫 ครูผู้สอน (TEACHER)** | `somchai@tunorth.ac.th` | `password` | ครูสมชาย (ประจำห้อง 6.1) ตรวจงานและให้คะแนน Rubric |
| **🎓 นักเรียน (STUDENT)** | `student1@tunorth.ac.th` หรือ `28926` | `password` | นายสมศักดิ์ (นักเรียนห้อง 6.1 - หัวหน้ากลุ่ม) |
| **🎓 นักเรียน (STUDENT)** | `student2@tunorth.ac.th` หรือ `28927` | `password` | นางสาวสมศรี (นักเรียนห้อง 6.1 - สมาชิกในกลุ่ม) |

> [!NOTE]
> นักเรียนสามารถเข้าสู่ระบบได้ทั้งด้วย **Email** หรือ **รหัสนักเรียน (Student ID 5 หลัก)**

---

## 🐳 การรันและ Deploy ด้วย Docker Compose

หากต้องการรันทั้งระบบแบบ Production หรือรันบนเซิร์ฟเวอร์โรงเรียน (Ubuntu Server):

```bash
# 1. สร้างโฟลเดอร์สำหรับเก็บไฟล์อัปโหลดและฐานข้อมูล
mkdir -p ../../data/uploads/cpms/branding
mkdir -p ../../data/postgres/cpms

# 2. สั่ง Build และรัน Container ทั้งหมดใน Background
docker compose up -d --build

# 3. ดู Logs เพื่อตรวจสอบสถานะการทำงาน
docker compose logs -f
```

---

## 📂 แผนผังโครงสร้างโปรเจกต์ (Project Directory Map)

```text
CPMS/
├── backend/                       # ⚙️ Go Fiber API Backend
│   ├── cmd/server/main.go         # จุดเริ่มต้นรันเซิร์ฟเวอร์ (Entrypoint)
│   ├── internal/
│   │   ├── config/                # โหลด Environment Variables
│   │   ├── database/              # จัดการเชื่อมต่อ PostgreSQL Connection Pool
│   │   ├── handlers/              # API Controllers (Auth, Groups, Steps, Defense, Admin)
│   │   ├── middleware/            # JWT Auth, Role Guard (Admin, Teacher, Student)
│   │   ├── models/                # GORM Data Models & Database Entities
│   │   ├── routes/                # กำหนด Routing URL endpoints ทั้งหมด
│   │   └── services/              # Business Logic & Telegram Notification Service
│   └── scripts/                   # ไฟล์สคริปต์ Database SQL Init & Migration
│
├── frontend/                      # 🎨 Next.js 16 App Router Frontend
│   ├── src/
│   │   ├── app/                   # App Router Pages (login, student, teacher, admin)
│   │   ├── components/            # UI Components (Modals, Navbars, Tables, Badges)
│   │   ├── lib/                   # API Client, Axios instance, Utilities
│   │   └── store/                 # Zustand Global State (AuthStore, ThemeStore)
│   ├── package.json               # รายการ Dependencies (จัดการด้วย Bun)
│   └── Dockerfile                 # Multi-stage Bun Next.js Dockerfile
│
├── docs/                          # 📘 เอกสารสเปกและคู่มือของระบบ
│   ├── spec.md                    # เอกสารข้อกำหนดระบบแบบละเอียด (System Specification)
│   └── cpms_standalone_deploy_plan.md # คู่มือการ Deploy บน Ubuntu Server 24.04 LTS
│
├── .env.example                   # ไฟล์ตัวอย่างการตั้งค่า Environment Variables
├── docker-compose.yml             # Docker Compose สำหรับ Frontend & Backend
└── README.md                      # เอกสารแนะนำและคู่มือการใช้งาน (ไฟล์นี้)
```

---

## ⚠️ กฎสำคัญและข้อควรระวังในการพัฒนา (Development Rules)

1. **ห้ามใส่ Semicolon (`;`) ในไฟล์ JavaScript และ TypeScript ทุกไฟล์เด็ดขาด**:  
   โปรเจกต์นี้ตั้งค่า ESLint และ Prettier ไว้แบบ `semi: false` เพื่อความสะอาดและเป็นมาตรฐานเดียวกัน
2. **ใช้ Bun เป็น Package Manager หลักสำหรับ Frontend เสมอ**:  
   ให้ใช้คำสั่ง `bun install`, `bun add <package>`, `bun run dev`, `bun run build` แทน npm/yarn เพื่อความรวดเร็วและป้องกัน Lockfile ขัดแย้งกัน
3. **ขนาดไฟล์อัปโหลด**:  
   ระบบกำหนดขนาดไฟล์ส่งงานสูงสุดไม่เกิน **20MB** ต่อไฟล์ (รองรับเฉพาะ `.pdf`, `.docx`, `.doc`, `.pptx`, `.ppt`, `.zip`, `.rar`)

---

## 🛠️ ปัญหาที่พบบ่อยและวิธีแก้ไข (Troubleshooting & FAQ)

### ❓ 1. รัน `bun run dev` แล้วเกิด Error เรื่อง Scripts บน Windows PowerShell
**สาเหตุ**: Windows ปิดกั้นการรัน Script ของ PowerShell  
**วิธีแก้ไข**: เปิด PowerShell ด้วยสิทธิ์ Administrator แล้วรันคำสั่ง:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

---

### ❓ 2. Backend เชื่อมต่อฐานข้อมูลไม่สำเร็จ (`connection refused` หรือ `password authentication failed`)
**วิธีแก้ไข**:
1. ตรวจสอบว่า Container `cpms-postgres` หรือ Service PostgreSQL กำลังทำงานอยู่หรือไม่
2. ตรวจสอบค่า `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` ในไฟล์ `backend/.env` ว่าตรงกับฐานข้อมูลที่สร้างไว้หรือไม่

---

### ❓ 3. พอร์ต 3000 หรือ 8009 ถูกใช้งานอยู่แล้ว (Port already in use)
**วิธีแก้ไข**:
- ตรวจสอบว่ามีโปรเซสอื่นเปิดค้างไว้หรือไม่ หรือเปลี่ยนค่า `PORT` ในไฟล์ `.env` เป็นพอร์ตอื่น เช่น `PORT=8010` สำหรับ Backend หรือรัน `bun run dev -- -p 3001` สำหรับ Frontend

---

### ❓ 4. อัปโหลดรูปภาพ Logo / Favicon แล้วรูปไม่แสดงผล
**วิธีแก้ไข**:
- ตรวจสอบว่ามีโฟลเดอร์สำหรับเก็บไฟล์ตามที่ระบุใน `UPLOAD_DIR` หรือไม่ (เช่น โฟลเดอร์ `backend/uploads`) หากยังไม่มี ให้สร้างโฟลเดอร์ดังกล่าวและกำหนดสิทธิ์การเขียนไฟล์ให้เรียบร้อย

---

## 📄 ลิขสิทธิ์และผู้จัดทำ (License & Credits)

- **ผู้พัฒนาและดูแลโครงการ**: กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี (สาขาคอมพิวเตอร์) โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ
- **สิทธิการใช้งาน**: สงวนลิขสิทธิ์สำหรับการใช้งานภายในโรงเรียนเตรียมอุดมศึกษา ภาคเหนือ (TU-North)
