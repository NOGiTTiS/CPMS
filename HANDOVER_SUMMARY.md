# สรุปบันทึกการพัฒนา TU-North CPMS (Handover Summary)
**วันที่บันทึก**: 17 สิงหาคม 2569  
**สถานะ Repository**: Git Push ขึ้น [https://github.com/NOGiTTiS/CPMS.git](https://github.com/NOGiTTiS/CPMS.git) เรียบร้อยแล้ว (Branch `main`)

---

## 📌 สรุปงานสำคัญทั้งหมดที่ดำเนินการแล้วเสร็จในวันนี้

### 1. ระบบจัดการปีการศึกษา (Academic Year Management)
- **Backend API**:
  - `GET /api/admin/academic-years`: ดึงรายการปีการศึกษา พร้อมคำนวณจำนวนกลุ่มโครงงาน (`group_count`) ในแต่ละปี
  - `GET /api/academic-years/active`: ดึงปีการศึกษาที่เปิดใช้งาน (`is_active = true`)
  - `POST /api/admin/academic-years`: สร้างปีการศึกษา/ภาคเรียนใหม่ (ตรวจสอบปี/เทอมซ้ำ)
  - `PUT /api/admin/academic-years/:id`: แก้ไขข้อมูลและสถานะเปิด/ปิด
  - `POST /api/admin/academic-years/:id/set-current`: สลับปีการศึกษาปัจจุบัน (1-Click Switch) พร้อม sync ค่าไปยัง `system_settings`
  - `DELETE /api/admin/academic-years/:id`: ระบบลบอย่างปลอดภัย (บล็อกการลบปีปัจจุบันและปีที่มีกลุ่มโครงงานอยู่)
- **Frontend UI (Admin Portal)**:
  - เพิ่มเมนูและแท็บ **"จัดการปีการศึกษา"** ใน Sidebar และหน้าต่าง Admin
  - การ์ดสถิติ (ปีปัจจุบัน, ปีทั้งหมด, กลุ่มโครงงานรวม)
  - ตารางปีการศึกษา พร้อมปุ่ม 👑 ตั้งเป็นปีปัจจุบัน, ✏️ แก้ไข, 🗑️ ลบ
  - Modal เพิ่ม/แก้ไขปีการศึกษา
- **Dynamic Dropdowns**:
  - เชื่อมโยงตัวเลือกปีการศึกษาไปยังหน้า Admin (จัดการกลุ่ม), Student (ลงทะเบียนกลุ่ม), และ Teacher (ส่งออก Rubric)

---

### 2. ปรับปรุง UX/Accessibility ของ Modal ทุกจุดทั่วทั้งระบบ
- สร้างคอมโพเนนต์กลาง `<Modal>` ใน `frontend/components/ui/modal.tsx`
- **รองรับการกดปุ่ม `ESC`** เพื่อปิดหน้าต่างทันที
- **รองรับการคลิกนอกพื้นที่ (Backdrop click)** เพื่อปิดหน้าต่าง
- ล็อกการเลื่อนหน้าเว็บพื้นหลัง (Body scroll lock) ขณะเปิด Modal
- ใช้งานครอบคลุมทั้ง 3 พอร์ทัล:
  - **Student Portal**: สร้างกลุ่ม, แก้ไขกลุ่ม, เพิ่มสมาชิก, ส่งงาน
  - **Teacher Portal**: ตรวจงาน, ให้คะแนน Rubric
  - **Admin Portal**: จัดการผู้ใช้ (เพิ่ม/แก้ไข/CSV/รีเซ็ตรหัส), จัดการกลุ่มโครงงาน, มอบหมายสมาชิก, ขั้นตอนส่งงาน, รอบนำเสนอ, เกณฑ์ Rubric, จัดการปีการศึกษา

---

### 3. ระบบจัดการผู้ใช้ (User Management) & จัดการกลุ่มโครงงาน (Group CRUD)
- ค้นหา กรองบทบาท กรองห้องเรียน กรองสถานะ และ Pagination
- ปุ่มดาวน์โหลด **CSV Template** และระบบ **CSV Import** นำเข้ารายชื่อนักเรียน
- ฟังก์ชัน **Reset Password** โดยตรงจาก Admin
- ระบบจัดการสมาชิกกลุ่ม: แต่งตั้งหัวหน้ากลุ่ม (👑), ลบสมาชิกออกจากกลุ่ม, เพิ่มสมาชิกใหม่จากห้องเรียนเดียวกัน
- สิทธิ์นักเรียนในการแก้ไขชื่อโครงงาน (TH/EN) และเปลี่ยนครูที่ปรึกษา

---

### 4. Git & GitHub Repository Setup
- สร้าง `.gitignore` เพื่อยกเว้นโฟลเดอร์ `old_system/`, build outputs, binaries (`*.exe`), และ environment variables (`.env`)
- Commit และ Push ข้อมูลชุดสมบูรณ์ขึ้น `https://github.com/NOGiTTiS/CPMS.git` (Branch `main`)

---

## 🚀 สรุปพอร์ตและคำสั่งสำหรับเริ่มงานในครั้งถัดไป

### รัน Backend Server:
```bash
cd D:\TUNorth\apps\cpms\backend
go run ./cmd/server
# หรือรันไบนารี: .\server.exe
# พอร์ต: http://localhost:8009
```

### รัน Frontend Server:
```bash
cd D:\TUNorth\apps\cpms\frontend
bun run dev
# พอร์ต: http://localhost:3000
```

### บัญชีทดสอบในระบบ (Default Credentials):
- **Admin**: `admin@tunorth.ac.th` / `admin1234`
- **Teacher**: `somchai@tunorth.ac.th` / `password`
- **Student**: `student1@tunorth.ac.th` / `password`
