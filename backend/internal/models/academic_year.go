package models

import (
	"time"

	"github.com/google/uuid"
)

type AcademicYear struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Year      string    `gorm:"type:varchar(10);not null" json:"year"`
	Term      string    `gorm:"type:varchar(10);not null;default:'1'" json:"term"`
	IsCurrent bool      `gorm:"type:boolean;not null;default:false" json:"is_current"`
	IsActive   bool      `gorm:"type:boolean;not null;default:true" json:"is_active"`
	GroupCount int64     `gorm:"-" json:"group_count"`
	CreatedAt  time.Time `gorm:"type:timestamptz;default:CURRENT_TIMESTAMP" json:"created_at"`
}

func (AcademicYear) TableName() string {
	return "academic_years"
}
