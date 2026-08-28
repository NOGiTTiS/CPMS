# 📦 คู่มือการนำเข้าไฟล์งานจากระบบเก่า (Legacy Uploads Import Guide)
**ระบบจัดการโครงงานคอมพิวเตอร์ (TU-North CPMS)**  
**วันที่ดำเนินการ:** 28 สิงหาคม 2569  
**สถานะ:** ✅ นำเข้าในเครื่อง Local สำเร็จ (999 ไฟล์ / ~1.10 GB) และเตรียมแพ็กเกจ Tar พร้อมขึ้นเซิร์ฟเวอร์

---

## 📌 1. สรุปการดำเนินการ (Summary of Work)

1. **แหล่งไฟล์ต้นทาง:** `D:\New folder\tunorth-cpms\uploads` (ไฟล์เอกสารโครงงานระบบเดิม 999 รายการ รวมโฟลเดอร์ `steps/`, ขนาด ~1.10 GB)
2. **การนำเข้าสำหรับโหมด Local Development (Windows):**
   - คัดลอกไฟล์ทั้งหมดไปยัง:
     - `D:\TUNorth\data\uploads\cpms\`
     - `D:\TUNorth\apps\cpms\backend\uploads\`
   - ตรวจสอบไฟล์สำคัญ เช่น `group_43_step_6_8e1e7446d525c551.pdf` พบว่าพร้อมใช้งานบนเครื่องแล้ว
3. **การเตรียมแพ็กเกจสำหรับ Production Server (Ubuntu Server):**
   - บีบอัดไฟล์ทั้งหมดเป็น `D:\TUNorth\legacy_uploads.tar.gz` (ขนาด 1,047.99 MB)
   - จัดเตรียมคำสั่งส่งไฟล์และแตกไฟล์บนเซิร์ฟเวอร์แบบ 1-Click

---

## 🚀 2. ขั้นตอนการนำไฟล์ขึ้น Production Server (`cpms.tn.ac.th`)

### ขั้นตอนที่ 1: ส่งไฟล์ขึ้น Ubuntu Server
ใช้คำสั่ง `scp` จาก Windows หรือใช้โปรแกรม **MobaXterm / WinSCP** เพื่ออัปโหลดไฟล์ `legacy_uploads.tar.gz` ไปยังเซิร์ฟเวอร์:

```bash
# ตัวอย่างคำสั่งผ่าน scp (เปลี่ยน deploy และ server_ip ตามจริง)
scp "D:\TUNorth\legacy_uploads.tar.gz" deploy@server_ip:~/TUNorth/
```

### ขั้นตอนที่ 2: รันคำสั่งบน Ubuntu Server
เปิด Terminal ของ Ubuntu Server แล้วรันคำสั่งต่อไปนี้:

```bash
# 1. สร้างโฟลเดอร์สำหรับเก็บไฟล์ uploads ของ CPMS
mkdir -p ~/TUNorth/data/uploads/cpms

# 2. แตกไฟล์ทั้งหมดลงในโฟลเดอร์ uploads
tar -zxvf ~/TUNorth/legacy_uploads.tar.gz -C ~/TUNorth/data/uploads/cpms/

# 3. กำหนดสิทธิ์ Permission ให้ Docker Container สามารถอ่านและเขียนไฟล์ได้สมบูรณ์
chmod -R 777 ~/TUNorth/data/uploads/cpms

# 4. รีสตาร์ท Container cpms-backend
cd ~/TUNorth/apps/cpms
docker compose restart backend
```

---

## 🧪 3. การทดสอบและการตรวจสอบ (Verification)

เมื่อดำเนินการแตกไฟล์บนเซิร์ฟเวอร์เสร็จสิ้น:
1. คลิกเปิดลิงก์ดาวน์โหลด เช่น:  
   `https://cpms.tn.ac.th/api/files/download?path=uploads%2Fgroup_43_step_6_8e1e7446d525c551.pdf&token=...`
2. เบราว์เซอร์จะเปิดอ่านเอกสาร PDF ได้ทันทีโดยไม่ขึ้นข้อความ `File not found` อีกต่อไป
