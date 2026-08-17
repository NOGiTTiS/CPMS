package main

import (
	"fmt"
	"log"

	"tunorth-cpms-backend/internal/config"
	"tunorth-cpms-backend/internal/database"
	"tunorth-cpms-backend/internal/models"
)

func main() {
	log.Println("==================================================")
	log.Println("🎯 Restoring Clean Thai Presentation Criteria")
	log.Println("==================================================")

	cfg := config.LoadConfig()
	db, err := database.ConnectDB(cfg)
	if err != nil {
		log.Fatalf("❌ Connect failed: %v", err)
	}

	cleanCriteria := []struct {
		Order    int
		Label    string
		MaxScore float64
	}{
		{1, "เนื้อหาของโครงงานมีความน่าสนใจ และเป็นประโยชน์", 10},
		{2, "มีกระบวนการพัฒนาโครงงานอย่างเป็นระบบ", 10},
		{3, "มีการเลือกใช้เครื่องมือ โปรแกรม ได้อย่างเหมาะสม", 10},
		{4, "ความคิดสร้างสรรค์ และความน่าสนใจของผลงาน", 10},
		{5, "การประสานงานและสืบเสาะข้อมูลจากแหล่งเรียนรู้ในชุมชน", 10},
		{6, "ความสมบูรณ์ของผลงาน (เนื้อหา,ภาพประกอบ หรือ อื่นๆ)", 10},
		{7, "เทคนิคในการนำเสนอโครงงาน", 10},
		{8, "การนำเสนอเสียงดังฟังชัด และออกเสียงอักขระถูกต้อง", 10},
		{9, "การนำเสนอโครงงานทันตามเวลาที่กำหนด", 10},
		{10, "การแต่งกายของผู้นำเสนอโครงงานถูกต้องตามระเบียบ", 10},
	}

	for _, c := range cleanCriteria {
		var crit models.PresentationCriteria
		if err := db.Where("criteria_order = ?", c.Order).First(&crit).Error; err == nil {
			crit.Label = c.Label
			crit.MaxScore = c.MaxScore
			crit.IsActive = true
			db.Save(&crit)
			fmt.Printf("✅ Updated Criteria %d: %s\n", c.Order, c.Label)
		} else {
			newCrit := models.PresentationCriteria{
				CriteriaOrder: c.Order,
				Label:         c.Label,
				MaxScore:      c.MaxScore,
				IsActive:      true,
			}
			db.Create(&newCrit)
			fmt.Printf("✅ Created Criteria %d: %s\n", c.Order, c.Label)
		}
	}

	log.Println("==================================================")
	log.Println("🎉 All 10 Presentation Rubric Criteria restored in Thai UTF-8!")
	log.Println("==================================================")
}
