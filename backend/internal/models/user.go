package models

import (
	"time"

	"github.com/google/uuid"
)

type UserRole string

const (
	RoleAdmin   UserRole = "ADMIN"
	RoleTeacher UserRole = "TEACHER"
	RoleStudent UserRole = "STUDENT"
)

type User struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StudentID    *string   `gorm:"type:varchar(50);unique" json:"student_id,omitempty"`
	Room         *string   `gorm:"type:varchar(20)" json:"room,omitempty"`
	Email        string    `gorm:"type:varchar(150);unique;not null" json:"email"`
	PasswordHash string    `gorm:"type:varchar(255);not null" json:"-"`
	FullName     string    `gorm:"type:varchar(150);not null" json:"full_name"`
	Role         UserRole  `gorm:"type:varchar(50);not null" json:"role"`
	AcademicYear *string   `gorm:"type:varchar(10);index" json:"academic_year,omitempty"`
	IsActive     bool      `gorm:"type:boolean;not null;default:true" json:"is_active"`
	CreatedAt    time.Time `gorm:"type:timestamptz;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt    time.Time `gorm:"type:timestamptz;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// Relationships
	TeacherAssignments []TeacherAssignment `gorm:"foreignKey:TeacherID;constraint:OnDelete:CASCADE" json:"teacher_assignments,omitempty"`
}

func (User) TableName() string {
	return "users"
}

type TeacherAssignment struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TeacherID uuid.UUID `gorm:"type:uuid;not null;index" json:"teacher_id"`
	Room      string    `gorm:"type:varchar(20);not null" json:"room"`
	CreatedAt time.Time `gorm:"type:timestamptz;default:CURRENT_TIMESTAMP" json:"created_at"`

	Teacher *User `gorm:"foreignKey:TeacherID" json:"teacher,omitempty"`
}

func (TeacherAssignment) TableName() string {
	return "teacher_assignments"
}
