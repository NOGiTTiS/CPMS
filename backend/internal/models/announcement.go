package models

import (
	"time"

	"github.com/google/uuid"
)

type Announcement struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Title     string     `gorm:"type:varchar(300);not null" json:"title"`
	Content   *string    `gorm:"type:text" json:"content,omitempty"`
	IsPinned  bool       `gorm:"type:boolean;not null;default:false" json:"is_pinned"`
	CreatedBy *uuid.UUID `gorm:"type:uuid;index" json:"created_by,omitempty"`
	CreatedAt time.Time  `gorm:"type:timestamptz;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt time.Time  `gorm:"type:timestamptz;default:CURRENT_TIMESTAMP" json:"updated_at"`

	Creator *User `gorm:"foreignKey:CreatedBy;constraint:OnDelete:SET NULL" json:"creator,omitempty"`
}

func (Announcement) TableName() string {
	return "announcements"
}
