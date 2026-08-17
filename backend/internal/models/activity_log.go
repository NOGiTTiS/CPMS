package models

import (
	"time"

	"github.com/google/uuid"
)

type ActivityLog struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID      *uuid.UUID `gorm:"type:uuid;index" json:"user_id,omitempty"`
	UserRole    *string    `gorm:"type:varchar(50)" json:"user_role,omitempty"`
	Action      string     `gorm:"type:varchar(100);not null" json:"action"`
	Description *string    `gorm:"type:text" json:"description,omitempty"`
	IPAddress   *string    `gorm:"type:varchar(100)" json:"ip_address,omitempty"`
	CreatedAt   time.Time  `gorm:"type:timestamptz;default:CURRENT_TIMESTAMP" json:"created_at"`

	User *User `gorm:"foreignKey:UserID;constraint:OnDelete:SET NULL" json:"user,omitempty"`
}

func (ActivityLog) TableName() string {
	return "activity_logs"
}
