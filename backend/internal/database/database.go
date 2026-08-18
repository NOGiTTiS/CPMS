package database

import (
	"fmt"
	"log"
	"time"

	"tunorth-cpms-backend/internal/config"
	"tunorth-cpms-backend/internal/models"
	"tunorth-cpms-backend/internal/utils"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func strPtr(s string) *string {
	return &s
}

func ConnectDB(cfg *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Bangkok",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort, cfg.DBSSLMode,
	)

	gormLogLevel := logger.Warn
	if cfg.Environment == "development" {
		gormLogLevel = logger.Info
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(gormLogLevel),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get generic database object: %w", err)
	}

	// Connection pool tuning
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetConnMaxLifetime(1 * time.Hour)

	DB = db
	log.Println("Database connection established successfully")
	return db, nil
}

func AutoMigrate(db *gorm.DB) error {
	log.Println("Running AutoMigration for GORM models...")
	err := db.AutoMigrate(
		&models.AcademicYear{},
		&models.User{},
		&models.TeacherAssignment{},
		&models.ProjectGroup{},
		&models.GroupMember{},
		&models.ProjectStep{},
		&models.Submission{},
		&models.PresentationSlot{},
		&models.PresentationBooking{},
		&models.PresentationCriteria{},
		&models.PresentationScore{},
		&models.SystemSetting{},
		&models.Announcement{},
		&models.ActivityLog{},
	)
	if err != nil {
		return fmt.Errorf("auto migration failed: %w", err)
	}

	// Seed essential system settings if not present
	defaultSettings := map[string]string{
		"system_name":             "TU-North CPMS",
		"school_name":             "โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ",
		"academic_year":           "2568",
		"academic_term":           "2",
		"max_members_per_group":   "3",
		"submission_mode":         "sequential", // sequential | open
		"allow_group_cross_room":  "true",
		"show_scores_to_students": "true",
		"telegram_bot_enabled":    "false",
		"telegram_bot_token":      "",
		"telegram_chat_id":        "",
	}

	for key, val := range defaultSettings {
		var setting models.SystemSetting
		if err := db.Where("key = ?", key).First(&setting).Error; err != nil {
			db.Create(&models.SystemSetting{
				Key:       key,
				Value:     val,
				UpdatedAt: time.Now(),
			})
		}
	}

	// Seed Academic Year 2568
	var yr models.AcademicYear
	if err := db.Where("year = ?", "2568").First(&yr).Error; err != nil {
		db.Create(&models.AcademicYear{
			Year:      "2568",
			Term:      "2",
			IsCurrent: true,
			IsActive:  true,
		})
	}

	// Backfill existing students with academic_year = 2568 if null
	db.Model(&models.User{}).Where("role = ? AND (academic_year IS NULL OR academic_year = '')", models.RoleStudent).Update("academic_year", "2568")

	// Seed Default Users
	seedUsers(db)

	// Seed Default Project Steps
	seedProjectSteps(db)

	// Seed Default Rubric Criteria
	seedRubricCriteria(db)

	log.Println("Database migration & seeding completed")
	return nil
}

func seedUsers(db *gorm.DB) {
	// 1. Admin
	var admin models.User
	if err := db.Where("email = ?", "admin@tunorth.ac.th").First(&admin).Error; err != nil {
		hash, _ := utils.HashPassword("admin1234")
		db.Create(&models.User{
			FullName:     "ผู้ดูแลระบบ CPMS (Admin)",
			Email:        "admin@tunorth.ac.th",
			PasswordHash: hash,
			Role:         models.RoleAdmin,
			IsActive:     true,
		})
		log.Println("Seeded Admin user: admin@tunorth.ac.th")
	}

	// 2. Teacher (Somchai)
	var teacher models.User
	if err := db.Where("email = ?", "somchai@tunorth.ac.th").First(&teacher).Error; err != nil {
		hash, _ := utils.HashPassword("teacher1234")
		teacher = models.User{
			FullName:     "ครูสมชาย ใจดี",
			Email:        "somchai@tunorth.ac.th",
			PasswordHash: hash,
			Role:         models.RoleTeacher,
			Room:         strPtr("6.1"),
			IsActive:     true,
		}
		db.Create(&teacher)

		// Assign room 6.1
		db.Create(&models.TeacherAssignment{
			TeacherID: teacher.ID,
			Room:      "6.1",
		})
		log.Println("Seeded Teacher user: somchai@tunorth.ac.th")
	}

	// 3. Student 1 (Room 6.1)
	var student1 models.User
	if err := db.Where("email = ?", "student1@tunorth.ac.th").First(&student1).Error; err != nil {
		hash, _ := utils.HashPassword("student1234")
		db.Create(&models.User{
			FullName:     "นายธนกฤต มั่งมี",
			Email:        "student1@tunorth.ac.th",
			StudentID:    strPtr("50101"),
			PasswordHash: hash,
			Role:         models.RoleStudent,
			Room:         strPtr("6.1"),
			AcademicYear: strPtr("2568"),
			IsActive:     true,
		})
		log.Println("Seeded Student 1 user: student1@tunorth.ac.th (50101)")
	}

	// 4. Student 2 (Room 6.2)
	var student2 models.User
	if err := db.Where("email = ?", "student2@tunorth.ac.th").First(&student2).Error; err != nil {
		hash, _ := utils.HashPassword("student1234")
		db.Create(&models.User{
			FullName:     "นางสาวกัญญา พัฒนากุล",
			Email:        "student2@tunorth.ac.th",
			StudentID:    strPtr("50201"),
			PasswordHash: hash,
			Role:         models.RoleStudent,
			Room:         strPtr("6.2"),
			AcademicYear: strPtr("2568"),
			IsActive:     true,
		})
		log.Println("Seeded Student 2 user: student2@tunorth.ac.th (50201)")
	}
}

func seedProjectSteps(db *gorm.DB) {
	var count int64
	db.Model(&models.ProjectStep{}).Count(&count)
	if count == 0 {
		steps := []models.ProjectStep{
			{
				StepOrder:   1,
				StepName:    "ขั้นตอนที่ 1: เสนอหัวข้อโครงงานและเค้าโครงย่อ",
				Description: strPtr("จัดทำเอกสารข้อเสนอหัวข้อโครงงาน วัตถุประสงค์ และขอบเขตการทำงาน"),
				MaxScore:    10,
				IsActive:    true,
			},
			{
				StepOrder:   2,
				StepName:    "ขั้นตอนที่ 2: บทที่ 1-3 (บทนำ เอกสารที่เกี่ยวข้อง และวิธีดำเนินงาน)",
				Description: strPtr("เขียนรายงานโครงงานคอมพิวเตอร์บทที่ 1 ถึงบทที่ 3 ตามรูปแบบที่กำหนด"),
				MaxScore:    20,
				IsActive:    true,
			},
			{
				StepOrder:   3,
				StepName:    "ขั้นตอนที่ 3: พัฒนาระบบ/โปรแกรมชิ้นงานต้นแบบ (Prototype)",
				Description: strPtr("ส่งลิงก์ Source Code หรือไฟล์โปรแกรมชิ้นงานที่สามารถทำงานได้จริง"),
				MaxScore:    20,
				IsActive:    true,
			},
			{
				StepOrder:   4,
				StepName:    "ขั้นตอนที่ 4: รายงานฉบับสมบูรณ์ (บทที่ 1-5 และคู่มือการใช้งาน)",
				Description: strPtr("จัดทำรายงานฉบับสมบูรณ์ครบทั้ง 5 บท และคู่มือผู้ใช้งาน"),
				MaxScore:    20,
				IsActive:    true,
			},
			{
				StepOrder:   5,
				StepName:    "ขั้นตอนที่ 5: สื่อนำเสนอ สไลด์ และคลิปวิดีโอสาธิต",
				Description: strPtr("เตรียมสไลด์นำเสนอและคลิปวิดีโอแนะนำโครงงานความยาวไม่เกิน 5 นาที"),
				MaxScore:    10,
				IsActive:    true,
			},
		}

		for _, st := range steps {
			db.Create(&st)
		}
		log.Println("Seeded 5 default project steps")
	}
}

func seedRubricCriteria(db *gorm.DB) {
	var count int64
	db.Model(&models.PresentationCriteria{}).Count(&count)
	if count == 0 {
		criteria := []models.PresentationCriteria{
			{
				CriteriaOrder: 1,
				Label:         "ความคิดสร้างสรรค์และคุณค่าของโครงงาน (Creativity & Value)",
				Description:   strPtr("ความแปลกใหม่ ประโยชน์ที่ได้รับ และการประยุกต์ใช้เทคโนโลยี"),
				MaxScore:      5,
				IsActive:      true,
			},
			{
				CriteriaOrder: 2,
				Label:         "ความสมบูรณ์และการทำงานของชิ้นงาน (System Implementation)",
				Description:   strPtr("โปรแกรมหรือระบบสามารถทำงานได้ถูกต้องตามวัตถุประสงค์ที่กำหนด"),
				MaxScore:      10,
				IsActive:      true,
			},
			{
				CriteriaOrder: 3,
				Label:         "ทักษะการนำเสนอและการตอบคำถาม (Presentation & Q&A)",
				Description:   strPtr("การสื่อสารที่ชัดเจน การจัดสรรเวลา และความเข้าใจในการตอบข้อซักถาม"),
				MaxScore:      5,
				IsActive:      true,
			},
		}

		for _, cr := range criteria {
			db.Create(&cr)
		}
		log.Println("Seeded 3 default presentation rubric criteria")
	}
}
