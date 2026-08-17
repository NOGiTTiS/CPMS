package models

import (
	"time"

	"github.com/google/uuid"
)

type PresentationSlot struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	AcademicYear string    `gorm:"type:varchar(20);not null;default:'2568'" json:"academic_year"`
	StartTime    time.Time `gorm:"type:timestamptz;not null" json:"start_time"`
	EndTime      time.Time `gorm:"type:timestamptz;not null" json:"end_time"`
	Location     string    `gorm:"type:varchar(150);not null" json:"location"`
	MaxGroups    int       `gorm:"type:integer;not null;default:1" json:"max_groups"`
	CreatedAt    time.Time `gorm:"type:timestamptz;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt    time.Time `gorm:"type:timestamptz;default:CURRENT_TIMESTAMP" json:"updated_at"`

	Bookings []PresentationBooking `gorm:"foreignKey:SlotID;constraint:OnDelete:CASCADE" json:"bookings,omitempty"`
}

func (PresentationSlot) TableName() string {
	return "presentation_slots"
}

type PresentationBooking struct {
	ID       uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	SlotID   uuid.UUID `gorm:"type:uuid;not null;index" json:"slot_id"`
	GroupID  uuid.UUID `gorm:"type:uuid;not null;unique" json:"group_id"`
	BookedAt time.Time `gorm:"type:timestamptz;default:CURRENT_TIMESTAMP" json:"booked_at"`

	Slot   *PresentationSlot   `gorm:"foreignKey:SlotID;constraint:OnDelete:CASCADE" json:"slot,omitempty"`
	Group  *ProjectGroup       `gorm:"foreignKey:GroupID;constraint:OnDelete:CASCADE" json:"group,omitempty"`
	Scores []PresentationScore `gorm:"foreignKey:BookingID;constraint:OnDelete:CASCADE" json:"scores,omitempty"`
}

func (PresentationBooking) TableName() string {
	return "presentation_bookings"
}

type PresentationCriteria struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Label         string    `gorm:"type:varchar(300);not null" json:"label"`
	Description   *string   `gorm:"type:text" json:"description,omitempty"`
	MaxScore      float64   `gorm:"type:numeric(5,2);not null;default:10.00" json:"max_score"`
	CriteriaOrder int       `gorm:"type:integer;not null;default:1" json:"criteria_order"`
	IsActive      bool      `gorm:"type:boolean;not null;default:true" json:"is_active"`
	CreatedAt     time.Time `gorm:"type:timestamptz;default:CURRENT_TIMESTAMP" json:"created_at"`
}

func (PresentationCriteria) TableName() string {
	return "presentation_criteria"
}

type PresentationScore struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	BookingID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"booking_id"`
	ScorerID     *uuid.UUID `gorm:"type:uuid;index" json:"scorer_id,omitempty"`
	CriteriaData string     `gorm:"type:jsonb;not null;default:'{}'" json:"criteria_data"`
	TotalScore   float64    `gorm:"type:numeric(5,2);not null;default:0.00" json:"total_score"`
	Comments     *string    `gorm:"type:text" json:"comments,omitempty"`
	ScoredAt     time.Time  `gorm:"type:timestamptz;default:CURRENT_TIMESTAMP" json:"scored_at"`
	UpdatedAt    time.Time  `gorm:"type:timestamptz;default:CURRENT_TIMESTAMP" json:"updated_at"`

	Scorer  *User                `gorm:"foreignKey:ScorerID;constraint:OnDelete:SET NULL" json:"scorer,omitempty"`
	Booking *PresentationBooking `gorm:"foreignKey:BookingID;constraint:OnDelete:CASCADE" json:"booking,omitempty"`
}

func (PresentationScore) TableName() string {
	return "presentation_scores"
}
