package controllers

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"strings"

	"tunorth-cpms-backend/internal/config"
	"tunorth-cpms-backend/internal/models"
	"tunorth-cpms-backend/internal/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TeacherController struct {
	db       *gorm.DB
	cfg      *config.Config
	telegram *services.TelegramService
}

func NewTeacherController(db *gorm.DB, cfg *config.Config, tg *services.TelegramService) *TeacherController {
	return &TeacherController{db: db, cfg: cfg, telegram: tg}
}

func (tc *TeacherController) GetAssignedRooms(c *fiber.Ctx) error {
	teacherID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "Unauthorized"})
	}

	var assignments []models.TeacherAssignment
	if err := tc.db.Where("teacher_id = ?", teacherID).Find(&assignments).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to fetch room assignments"})
	}

	var rooms []string
	for _, a := range assignments {
		rooms = append(rooms, a.Room)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    rooms,
	})
}

func (tc *TeacherController) GetPendingSubmissionsQueue(c *fiber.Ctx) error {
	teacherID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "Unauthorized"})
	}
	userRole, _ := c.Locals("userRole").(models.UserRole)

	query := tc.db.Model(&models.Submission{}).
		Preload("Group.Members.User").
		Preload("Group.Advisor").
		Preload("Step").
		Preload("Submitter").
		Where("submissions.status = ?", models.SubmissionStatusPending).
		Order("submissions.submitted_at ASC")

	if userRole != models.RoleAdmin {
		// Find rooms assigned to this teacher
		var assignments []models.TeacherAssignment
		tc.db.Where("teacher_id = ?", teacherID).Find(&assignments)
		var rooms []string
		for _, a := range assignments {
			rooms = append(rooms, a.Room)
		}

		// Show submissions where group room is in assigned rooms OR teacher is group advisor
		query = query.Joins("JOIN project_groups ON project_groups.id = submissions.group_id").
			Where("project_groups.room IN (?) OR project_groups.advisor_id = ?", rooms, teacherID)
	}

	var pending []models.Submission
	if err := query.Find(&pending).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to fetch pending queue"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"count":   len(pending),
		"data":    pending,
	})
}

func (tc *TeacherController) GetClassProgressMatrix(c *fiber.Ctx) error {
	room := c.Query("room")
	academicYear := c.Query("academic_year", "2568")

	// Get all steps
	var steps []models.ProjectStep
	if err := tc.db.Where("is_active = true").Order("step_order ASC").Find(&steps).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to load steps"})
	}

	// Query groups
	groupQuery := tc.db.Model(&models.ProjectGroup{}).
		Preload("Advisor").
		Preload("Members.User").
		Preload("Submissions.Step").
		Where("academic_year = ?", academicYear)

	if room != "" {
		groupQuery = groupQuery.Where("room = ?", room)
	}

	var groups []models.ProjectGroup
	if err := groupQuery.Order("room ASC, project_name_th ASC").Find(&groups).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to load groups"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"steps":  steps,
			"groups": groups,
		},
	})
}

func (tc *TeacherController) ExportGradeSheetCSV(c *fiber.Ctx) error {
	room := c.Query("room")
	academicYear := c.Query("academic_year", "2568")

	var steps []models.ProjectStep
	tc.db.Where("is_active = true").Order("step_order ASC").Find(&steps)

	groupQuery := tc.db.Model(&models.ProjectGroup{}).
		Preload("Advisor").
		Preload("Members.User").
		Preload("Submissions").
		Where("academic_year = ?", academicYear)

	if room != "" {
		groupQuery = groupQuery.Where("room = ?", room)
	}

	var groups []models.ProjectGroup
	if err := groupQuery.Order("room ASC, project_name_th ASC").Find(&groups).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to load groups for export"})
	}

	buf := new(bytes.Buffer)
	// UTF-8 BOM for Microsoft Excel Thai support
	buf.WriteString("\xEF\xBB\xBF")

	writer := csv.NewWriter(buf)

	// Build dynamic header
	header := []string{"ลำดับ", "ห้อง", "ชื่อโครงงาน (ไทย)", "ชื่อโครงงาน (อังกฤษ)", "ครูที่ปรึกษา", "สมาชิกในกลุ่ม"}
	for _, step := range steps {
		header = append(header, fmt.Sprintf("%s (เต็ม %.0f)", step.StepName, step.MaxScore))
	}
	header = append(header, "คะแนนรวมทุกขั้นตอน")
	_ = writer.Write(header)

	for i, g := range groups {
		groupRoom := "-"
		if g.Room != nil {
			groupRoom = *g.Room
		}

		var memberNames []string
		for _, m := range g.Members {
			if m.User != nil {
				roleTag := ""
				if m.IsLeader {
					roleTag = " (หัวหน้า)"
				}
				memberNames = append(memberNames, fmt.Sprintf("%s%s", m.User.FullName, roleTag))
			}
		}

		advisor := "-"
		if g.AdvisorName != nil {
			advisor = *g.AdvisorName
		}

		// Map submissions by step ID
		subMap := make(map[uuid.UUID]models.Submission)
		for _, s := range g.Submissions {
			subMap[s.StepID] = s
		}

		var totalScore float64 = 0
		row := []string{
			fmt.Sprintf("%d", i+1),
			groupRoom,
			g.ProjectNameTH,
			g.ProjectNameEN,
			advisor,
			strings.Join(memberNames, ", "),
		}

		for _, step := range steps {
			if sub, exists := subMap[step.ID]; exists {
				if sub.Status == models.SubmissionStatusApproved && sub.Score != nil {
					row = append(row, fmt.Sprintf("%.2f", *sub.Score))
					totalScore += *sub.Score
				} else {
					row = append(row, string(sub.Status))
				}
			} else {
				row = append(row, "ยังไม่ส่ง")
			}
		}

		row = append(row, fmt.Sprintf("%.2f", totalScore))
		_ = writer.Write(row)
	}

	writer.Flush()

	c.Set("Content-Type", "text/csv; charset=utf-8")
	fileName := fmt.Sprintf("gradesheet_%s", academicYear)
	if room != "" {
		fileName += fmt.Sprintf("_room_%s", room)
	}
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s.csv", fileName))
	return c.Send(buf.Bytes())
}
