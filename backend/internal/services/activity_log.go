package services

import (
	"log"
	"time"

	"tunorth-cpms-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func LogActivity(db *gorm.DB, userID *uuid.UUID, userRole, action, description, ipAddress string) {
	go func() {
		activity := models.ActivityLog{
			UserID:      userID,
			Action:      action,
			Description: &description,
			IPAddress:   &ipAddress,
			CreatedAt:   time.Now(),
		}
		if userRole != "" {
			activity.UserRole = &userRole
		}

		if err := db.Create(&activity).Error; err != nil {
			log.Printf("[ActivityLog Error]: %v\n", err)
		}
	}()
}
