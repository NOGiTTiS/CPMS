# 📝 บันทึกการปรับปรุงระบบ: การตรวจงาน, การดู/แก้ไขผลตรวจ และการดาวน์โหลดไฟล์
**ระบบจัดการโครงงานคอมพิวเตอร์ (TU-North CPMS)**  
**วันที่บันทึก:** 27 สิงหาคม 2569  
**สถานะ:** ✅ พัฒนา ทดสอบ และ Deploy พร้อมใช้งาน (Go Backend & Next.js Turbopack Build 0 Errors)

---

## 📌 1. สรุปความต้องการและปัญหาที่พบ (Issues & Requirements)

### 1.1 ปัญหางานที่ครูตรวจแล้ว ไม่สามารถดูและแก้ไขได้
- **ฝั่งครู (Teacher Portal):**
  - เมื่อครูตรวจงานเสร็จ งานจะหายไปจากคิวรอตรวจทันที ทำให้ครูไม่สามารถดูย้อนหลังหรือแก้ไขคะแนน/คอมเมนต์ได้
  - ในตารางสรุปความก้าวหน้ารายห้อง (Progress Matrix) ช่องคะแนนแสดงเป็นข้อความธรรมดา ไม่สามารถคลิกเพื่อดูไฟล์งานหรือแก้ไขผลการตรวจได้
- **ฝั่งนักเรียน (Student Portal):**
  - ในขั้นตอนที่ครูอนุมัติแล้ว (`APPROVED`) ยังมีปุ่ม "ส่งงานแก้ไขใหม่ (Resubmit)" ซึ่งหากนักเรียนกดส่งใหม่จะทำให้สถานะถูกรีเซ็ตเป็น PENDING และคะแนนที่ตรวจไว้หายไป

### 1.2 ปัญหาการดาวน์โหลด/เปิดดูไฟล์ `File not found`
- เมื่อผู้ใช้กดปุ่มดาวน์โหลด/เปิดดูไฟล์ประวัติเดิมจากระบบเก่า เช่น:  
  `https://cpms.tn.ac.th/api/files/download?path=uploads%2Fgroup_43_step_6_8e1e7446d525c551.pdf&token=...`
- เซิร์ฟเวอร์ตอบกลับเป็น Plain Text `File not found` (HTTP 404) เนื่องจากข้อมูลเดิมถูก Migration มาเฉพาะโครงสร้างตารางในฐานข้อมูล แต่ยังไม่ได้คัดลอกไฟล์จริง (Physical Files) มายัง Volume ของเซิร์ฟเวอร์ใหม่

---

## 🛠️ 2. รายละเอียดการดำเนินการและโซลูชันทางเทคนิค (Technical Solutions)

### 2.1 ฝั่งครูผู้สอน (Teacher Portal)
1. **เพิ่มแถบตัวกรองสถานะในคิวการตรวจงาน (Review Queue Tabs):**
   - 🟡 **"รอตรวจ (Pending)"**: แสดงงานค้างตรวจ พร้อมตัวนับ Badge
   - 🟢 **"ตรวจแล้ว (Reviewed)"**: แสดงรายการงานที่ตรวจประเมินแล้ว (ทั้ง Approved และ Rejected) พร้อมคะแนน วันที่ตรวจ และคอมเมนต์
   - 🔵 **"ทั้งหมด (All)"**: แสดงรายการงานทั้งหมดในห้องและปีการศึกษาที่เลือก
   - เพิ่มปุ่ม **"ดูผลงาน / แก้ไขผลตรวจ"** สำหรับงานที่ตรวจแล้ว
2. **ตารางสรุปความก้าวหน้ารายห้องแบบโต้ตอบ (Interactive Progress Matrix Cells):**
   - ทุกช่องคะแนนที่มีการส่งงาน (Pending / Approved / Rejected) ได้รับการปรับเป็น **Interactive Button (คลิกได้)**
   - เมื่อคลิก จะเปิด Modal ตรวจงาน/แก้ไขผลตรวจ พร้อมโหลดข้อมูลกลุ่ม, ขั้นตอน, ผู้ส่ง, ไฟล์งาน และคะแนนเดิมให้อัตโนมัติ
3. **ปรับปรุง Modal ตรวจงาน (Review Modal):**
   - โหลดข้อมูลเดิม (สถานะ, คะแนน, ข้อเสนอแนะ) ขึ้นมาแสดงอัตโนมัติเมื่อเป็นงานที่เคยตรวจแล้ว
   - แสดงชื่อผู้ส่งและรอบที่ส่ง (Revision) อย่างชัดเจน
   - เปลี่ยนปุ่มบันทึกเป็น **"บันทึกการแก้ไขผลตรวจ"** สำหรับงานที่ตรวจแล้ว

### 2.2 ฝั่งนักเรียน (Student Portal)
1. **ขั้นตอนที่ผ่านการอนุมัติ (`APPROVED`):**
   - ล็อกปุ่มส่งซ้ำ ป้องกันการส่งทับผลตรวจเดิม
   - แสดง Badge สีเขียวชัดเจน: `✅ ผ่านการอนุมัติแล้ว (สำเร็จ)`
   - มีปุ่ม **"เปิดดูงานที่ผ่านแล้ว"** ให้นักเรียนเปิดดูไฟล์งานเดิมหรือลิงก์ภายนอกได้ตลอดเวลา
2. **ขั้นตอนที่ส่งกลับแก้ไข (`REJECTED`):**
   - ไฮไลต์กล่องคอมเมนต์ข้อเสนอแนะจากครูอย่างชัดเจน
   - แสดงปุ่ม `ส่งงานแก้ไขใหม่ (รอบที่ X)`
3. **ขั้นตอนที่รอตรวจ (`PENDING`):**
   - แสดงสถานะ `รอคุณครูตรวจประเมินผลงาน`
   - มีปุ่ม `แก้ไขไฟล์/ลิงก์ที่ส่ง (ส่งใหม่ก่อนตรวจ)`

### 2.3 ฝั่ง Backend API (Go Fiber)
1. **Endpoint `GET /api/v1/teacher/queue`:**
   - รองรับ Query Parameter `status` (`pending`, `reviewed`, `approved`, `rejected`, `all`)
   - จัดเรียงผลลัพธ์ตาม `reviewed_at DESC` สำหรับงานที่ตรวจแล้ว เพื่อแสดงงานล่าสุดไว้ด้านบน
2. **Endpoint `GET /api/v1/teacher/progress-matrix`:**
   - Preload ข้อมูล `Submissions.Step` และ `Submissions.Submitter` ครบถ้วน
3. **Endpoint `GET /api/files/download` (DownloadFile):**
   - **ขยาย Path Candidates**: ค้นหาไฟล์ครอบคลุมทุกโครงสร้างโฟลเดอร์ (`UploadDir`, `submissions/`, `legacy/`, `branding/`, `templates/`, `./uploads`, `../../data/uploads/cpms`)
   - **รองรับ Inline PDF Preview**: ตั้งค่า Header `Content-Type: application/pdf` และ `Content-Disposition: inline; filename="..."` เพื่อให้เปิดอ่านบนเบราว์เซอร์ได้ทันที
   - **หน้าแจ้งเตือนภาษาไทยดีไซน์สวยงาม (Friendly Not Found HTML Page)**: หากไม่พบไฟล์จริงบน Disk ระบบจะแสดงหน้าเว็บ Dark Theme สวยงาม พร้อมชี้แจงสาเหตุภาษาไทยและแนะนำวิธีปฏิบัติแทนหน้าขาว 404

---

## 📂 3. รายการไฟล์ที่มีการแก้ไข (Modified Files)

| ไฟล์ที่แก้ไข | ภาษา | รายละเอียดการแก้ไข |
| :--- | :--- | :--- |
| [`backend/internal/controllers/teacher_controller.go`](file:///D:/TUNorth/apps/cpms/backend/internal/controllers/teacher_controller.go) | Go | เพิ่ม `status` filter ใน `GetPendingSubmissionsQueue` และ Preload Submissions |
| [`backend/internal/controllers/step_submission_controller.go`](file:///D:/TUNorth/apps/cpms/backend/internal/controllers/step_submission_controller.go) | Go | ปรับปรุง `DownloadFile` ค้นหา Path ละเอียด, รองรับ Inline PDF, และหน้าแจ้งเตือน HTML สวยงาม |
| [`frontend/types/index.ts`](file:///D:/TUNorth/apps/cpms/frontend/types/index.ts) | TypeScript | เพิ่มฟิลด์ `submission?: Submission` ใน `MatrixStepCell` (ปลอด Semicolon) |
| [`frontend/app/teacher/page.tsx`](file:///D:/TUNorth/apps/cpms/frontend/app/teacher/page.tsx) | TypeScript (React) | เพิ่ม Filter tabs ใน Queue, Interactive cells ใน Matrix, และ Review Modal |
| [`frontend/app/student/page.tsx`](file:///D:/TUNorth/apps/cpms/frontend/app/student/page.tsx) | TypeScript (React) | ล็อกขั้นตอนที่ผ่านแล้ว, ไฮไลต์คอมเมนต์งานที่ต้องแก้ไข, และเปิดดูไฟล์เดิม |

---

## 💡 4. คำแนะนำสำหรับ Server Administrator ในการนำไฟล์เดิมขึ้น Server

หากมีโฟลเดอร์ไฟล์เดิม (`group_*.pdf`, `group_*.docx`) จากระบบเก่า สามารถคัดลอกมายังโฟลเดอร์ Volume บน Ubuntu Server ได้ด้วยคำสั่งดังนี้:

```bash
# 1. เข้าสู่โฟลเดอร์ uploads ของ CPMS บนเซิร์ฟเวอร์
mkdir -p ~/TUNorth/data/uploads/cpms

# 2. คัดลอกไฟล์เดิมทั้งหมดเข้ามาในโฟลเดอร์นี้
cp -r /path/to/old_uploads/* ~/TUNorth/data/uploads/cpms/

# 3. กำหนดสิทธิ์ให้ Container cpms-backend สามารถอ่านไฟล์ได้
chmod -R 777 ~/TUNorth/data/uploads/cpms
```

---

## 🧪 5. ผลการทดสอบและการตรวจสอบ (Verification Results)

```text
1. Go Backend Build:
   go build -o server.exe ./cmd/server -> Exit Code 0 (Passed)

2. Frontend Next.js Turbopack Build:
   bun run build -> Exit Code 0 (Compiled successfully, 8/8 routes static optimized)

3. Semicolon Rule Enforcement:
   No semicolons in TypeScript/JavaScript (100% Compliant with project rules)
```
