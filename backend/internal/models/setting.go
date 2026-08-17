package models

import "time"

type SystemSetting struct {
	Key       string    `gorm:"type:varchar(100);primaryKey" json:"key"`
	Value     string    `gorm:"type:text" json:"value"`
	UpdatedAt time.Time `gorm:"type:timestamptz;default:CURRENT_TIMESTAMP" json:"updated_at"`
}

func (SystemSetting) TableName() string {
	return "system_settings"
}
