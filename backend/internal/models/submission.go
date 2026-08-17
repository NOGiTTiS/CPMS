package models

import (
	"time"

	"github.com/google/uuid"
)

type SubmissionStatus string

const (
	SubmissionStatusPending  SubmissionStatus = "PENDING"
	SubmissionStatusApproved SubmissionStatus = "APPROVED"
	SubmissionStatusRejected SubmissionStatus = "REJECTED"
)

type SubmissionType string

const (
	SubmissionTypeFile SubmissionType = "file"
	SubmissionTypeLink SubmissionType = "link"
)

type Submission struct {
	ID             uuid.UUID        `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	GroupID        uuid.UUID        `gorm:"type:uuid;not null;index" json:"group_id"`
	StepID         uuid.UUID        `gorm:"type:uuid;not null;index" json:"step_id"`
	SubmittedBy    *uuid.UUID       `gorm:"type:uuid;index" json:"submitted_by,omitempty"`
	SubmissionType SubmissionType   `gorm:"type:varchar(20);not null;default:'file'" json:"submission_type"`
	FilePath       string           `gorm:"type:text;not null" json:"file_path"`
	Status         SubmissionStatus `gorm:"type:varchar(50);not null;default:'PENDING'" json:"status"`
	Comment        *string          `gorm:"type:text" json:"comment,omitempty"`
	Score          *float64         `gorm:"type:numeric(5,2)" json:"score,omitempty"`
	RevisionNumber int              `gorm:"type:integer;not null;default:1" json:"revision_number"`
	SubmittedAt    time.Time        `gorm:"type:timestamptz;default:CURRENT_TIMESTAMP" json:"submitted_at"`
	ReviewedAt     *time.Time       `gorm:"type:timestamptz" json:"reviewed_at,omitempty"`

	Group     *ProjectGroup `gorm:"foreignKey:GroupID;constraint:OnDelete:CASCADE" json:"group,omitempty"`
	Step      *ProjectStep  `gorm:"foreignKey:StepID;constraint:OnDelete:CASCADE" json:"step,omitempty"`
	Submitter *User         `gorm:"foreignKey:SubmittedBy;constraint:OnDelete:SET NULL" json:"submitter,omitempty"`
}

func (Submission) TableName() string {
	return "submissions"
}
