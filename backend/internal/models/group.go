package models

import (
	"time"

	"github.com/google/uuid"
)

type ProjectGroup struct {
	ID            uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ProjectNameTH string     `gorm:"type:varchar(300);not null" json:"project_name_th"`
	ProjectNameEN string     `gorm:"type:varchar(300);not null" json:"project_name_en"`
	AdvisorID     *uuid.UUID `gorm:"type:uuid;index" json:"advisor_id,omitempty"`
	AdvisorName   *string    `gorm:"type:varchar(255)" json:"advisor_name,omitempty"`
	AcademicYear  string     `gorm:"type:varchar(20);not null;default:'2568'" json:"academic_year"`
	Room          *string    `gorm:"type:varchar(20)" json:"room,omitempty"`
	CreatedAt     time.Time  `gorm:"type:timestamptz;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt     time.Time  `gorm:"type:timestamptz;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// Relationships
	Advisor     *User                `gorm:"foreignKey:AdvisorID;constraint:OnDelete:SET NULL" json:"advisor,omitempty"`
	Members     []GroupMember        `gorm:"foreignKey:GroupID;constraint:OnDelete:CASCADE" json:"members,omitempty"`
	Submissions []Submission         `gorm:"foreignKey:GroupID;constraint:OnDelete:CASCADE" json:"submissions,omitempty"`
	Booking     *PresentationBooking `gorm:"foreignKey:GroupID;constraint:OnDelete:CASCADE" json:"booking,omitempty"`
}

func (ProjectGroup) TableName() string {
	return "project_groups"
}

type GroupMember struct {
	ID       uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	GroupID  uuid.UUID `gorm:"type:uuid;not null;index" json:"group_id"`
	UserID   uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	IsLeader bool      `gorm:"type:boolean;not null;default:false" json:"is_leader"`
	JoinedAt time.Time `gorm:"type:timestamptz;default:CURRENT_TIMESTAMP" json:"joined_at"`

	User  *User         `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	Group *ProjectGroup `gorm:"foreignKey:GroupID;constraint:OnDelete:CASCADE" json:"group,omitempty"`
}

func (GroupMember) TableName() string {
	return "group_members"
}
