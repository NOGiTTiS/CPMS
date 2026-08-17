package models

import (
	"time"

	"github.com/google/uuid"
)

type ProjectStep struct {
	ID              uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StepName        string     `gorm:"type:varchar(255);not null" json:"step_name"`
	Description     *string    `gorm:"type:text" json:"description,omitempty"`
	StepOrder       int        `gorm:"type:integer;not null;default:1" json:"step_order"`
	FileFormPath    *string    `gorm:"type:varchar(500)" json:"file_form_path,omitempty"`
	FileExamplePath *string    `gorm:"type:varchar(500)" json:"file_example_path,omitempty"`
	Deadline        *time.Time `gorm:"type:timestamptz" json:"deadline,omitempty"`
	IsActive        bool       `gorm:"type:boolean;not null;default:true" json:"is_active"`
	MaxScore        float64    `gorm:"type:numeric(5,2);not null;default:10.00" json:"max_score"`
	CreatedAt       time.Time  `gorm:"type:timestamptz;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt       time.Time  `gorm:"type:timestamptz;default:CURRENT_TIMESTAMP" json:"updated_at"`

	Submissions []Submission `gorm:"foreignKey:StepID;constraint:OnDelete:CASCADE" json:"submissions,omitempty"`
}

func (ProjectStep) TableName() string {
	return "project_steps"
}
