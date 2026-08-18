package controllers

import (
	"encoding/csv"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"tunorth-cpms-backend/internal/config"
	"tunorth-cpms-backend/internal/database"
	"tunorth-cpms-backend/internal/models"
	"tunorth-cpms-backend/internal/services"
	"tunorth-cpms-backend/internal/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AdminController struct {
	db       *gorm.DB
	cfg      *config.Config
	telegram *services.TelegramService
}

func NewAdminController(db *gorm.DB, cfg *config.Config, tg *services.TelegramService) *AdminController {
	return &AdminController{db: db, cfg: cfg, telegram: tg}
}

// ----------------------------------------------------
// USER MANAGEMENT (CRUD & RESET PASSWORD)
// ----------------------------------------------------

func (ac *AdminController) ListUsers(c *fiber.Ctx) error {
	role := c.Query("role")
	room := c.Query("room")
	academicYear := c.Query("academic_year")
	search := strings.TrimSpace(c.Query("search"))
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "1000"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 5000 {
		limit = 1000
	}
	offset := (page - 1) * limit

	query := ac.db.Model(&models.User{}).Preload("TeacherAssignments")

	if role != "" {
		query = query.Where("role = ?", strings.ToUpper(role))
	}
	if room != "" {
		query = query.Where("room = ?", room)
	}
	if academicYear != "" && academicYear != "ALL" {
		query = query.Where("(academic_year = ? OR role != 'STUDENT')", academicYear)
	}
	if search != "" {
		pattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(full_name) LIKE ? OR student_id LIKE ? OR LOWER(email) LIKE ?", pattern, pattern, pattern)
	}

	var total int64
	query.Count(&total)

	var users []models.User
	if err := query.Order("role ASC, room ASC, student_id ASC, full_name ASC").
		Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to fetch users"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"total":   total,
		"page":    page,
		"limit":   limit,
		"data":    users,
	})
}

type CreateUserRequest struct {
	FullName     string          `json:"full_name"`
	Email        string          `json:"email"`
	Password     string          `json:"password"`
	Role         models.UserRole `json:"role"`
	StudentID    *string         `json:"student_id"`
	Room         *string         `json:"room"`
	AcademicYear *string         `json:"academic_year"`
}

func (ac *AdminController) CreateUser(c *fiber.Ctx) error {
	var req CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	req.FullName = strings.TrimSpace(req.FullName)
	req.Email = strings.TrimSpace(req.Email)
	if req.FullName == "" || req.Email == "" || req.Password == "" || req.Role == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Full name, email, password, and role are required"})
	}

	// Check email uniqueness
	var existing models.User
	if err := ac.db.Where("LOWER(email) = LOWER(?)", req.Email).First(&existing).Error; err == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Email already exists"})
	}

	if req.StudentID != nil && *req.StudentID != "" {
		if err := ac.db.Where("student_id = ?", *req.StudentID).First(&existing).Error; err == nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Student ID already exists"})
		}
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to hash password"})
	}

	var academicYear *string
	if req.AcademicYear != nil && strings.TrimSpace(*req.AcademicYear) != "" {
		ay := strings.TrimSpace(*req.AcademicYear)
		academicYear = &ay
	} else if req.Role == models.RoleStudent {
		ay := database.GetCurrentAcademicYear(ac.db)
		academicYear = &ay
	}

	user := models.User{
		FullName:     req.FullName,
		Email:        req.Email,
		PasswordHash: hashedPassword,
		Role:         req.Role,
		StudentID:    req.StudentID,
		Room:         req.Room,
		AcademicYear: academicYear,
		IsActive:     true,
	}

	if err := ac.db.Create(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to create user"})
	}

	adminID, _ := c.Locals("userID").(uuid.UUID)
	services.LogActivity(ac.db, &adminID, "ADMIN", "CREATE_USER", fmt.Sprintf("Created user %s (%s)", user.FullName, user.Role), c.IP())

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "User created successfully",
		"data":    user,
	})
}

func (ac *AdminController) UpdateUser(c *fiber.Ctx) error {
	idParam := c.Params("id")
	targetID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid user ID"})
	}

	var user models.User
	if err := ac.db.Where("id = ?", targetID).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "User not found"})
	}

	var req map[string]interface{}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	// Remove password updates from general update (must use reset password)
	delete(req, "password")
	delete(req, "password_hash")
	delete(req, "id")

	if err := ac.db.Model(&user).Updates(req).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to update user"})
	}

	var updated models.User
	ac.db.Preload("TeacherAssignments").Where("id = ?", targetID).First(&updated)

	adminID, _ := c.Locals("userID").(uuid.UUID)
	services.LogActivity(ac.db, &adminID, "ADMIN", "UPDATE_USER", fmt.Sprintf("Updated user %s", updated.FullName), c.IP())

	return c.JSON(fiber.Map{
		"success": true,
		"message": "User updated successfully",
		"data":    updated,
	})
}

func (ac *AdminController) DeleteUser(c *fiber.Ctx) error {
	idParam := c.Params("id")
	targetID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid user ID"})
	}

	var user models.User
	if err := ac.db.Where("id = ?", targetID).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "User not found"})
	}

	if err := ac.db.Delete(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to delete user"})
	}

	adminID, _ := c.Locals("userID").(uuid.UUID)
	services.LogActivity(ac.db, &adminID, "ADMIN", "DELETE_USER", fmt.Sprintf("Deleted user %s (%s)", user.FullName, user.Email), c.IP())

	return c.JSON(fiber.Map{
		"success": true,
		"message": "User deleted successfully",
	})
}

type AdminResetPasswordRequest struct {
	NewPassword string `json:"new_password"`
}

func (ac *AdminController) ResetUserPassword(c *fiber.Ctx) error {
	idParam := c.Params("id")
	targetID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid user ID"})
	}

	var req AdminResetPasswordRequest
	if err := c.BodyParser(&req); err != nil || len(req.NewPassword) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "New password must be at least 6 characters long",
		})
	}

	var user models.User
	if err := ac.db.Where("id = ?", targetID).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "User not found"})
	}

	newHash, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to hash password"})
	}

	if err := ac.db.Model(&user).Update("password_hash", newHash).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to reset password"})
	}

	adminID, _ := c.Locals("userID").(uuid.UUID)
	services.LogActivity(ac.db, &adminID, "ADMIN", "RESET_PASSWORD", fmt.Sprintf("Reset password for user %s (%s)", user.FullName, user.Email), c.IP())

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Password reset successfully",
	})
}

// ----------------------------------------------------
// CSV IMPORT (Feature 1.3)
// ----------------------------------------------------

func (ac *AdminController) ImportUsersCSV(c *fiber.Ctx) error {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "CSV file upload is required"})
	}

	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to open uploaded file"})
	}
	defer file.Close()

	reader := csv.NewReader(file)
	// Optional support for UTF-8 BOM
	records, err := reader.ReadAll()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Failed to parse CSV file: " + err.Error()})
	}

	if len(records) < 2 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "CSV file is empty or missing data rows"})
	}

	// Read and map headers
	headerRow := records[0]
	colMap := make(map[string]int)
	for idx, col := range headerRow {
		cleaned := strings.TrimSpace(strings.ToLower(strings.TrimPrefix(col, "\ufeff")))
		colMap[cleaned] = idx
	}

	requiredCols := []string{"full_name", "email", "password", "role"}
	for _, req := range requiredCols {
		if _, exists := colMap[req]; !exists {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": fmt.Sprintf("Missing required CSV column '%s'. Required: full_name, email, password, role, student_id, room", req),
			})
		}
	}

	defaultAcademicYear := strings.TrimSpace(c.FormValue("academic_year"))
	if defaultAcademicYear == "" {
		defaultAcademicYear = database.GetCurrentAcademicYear(ac.db)
	}

	successCount := 0
	skippedCount := 0
	var errorLog []string

	for lineIdx, row := range records[1:] {
		rowNum := lineIdx + 2
		fullName := strings.TrimSpace(row[colMap["full_name"]])
		email := strings.TrimSpace(row[colMap["email"]])
		password := strings.TrimSpace(row[colMap["password"]])
		roleStr := strings.ToUpper(strings.TrimSpace(row[colMap["role"]]))

		if fullName == "" || email == "" || password == "" {
			skippedCount++
			errorLog = append(errorLog, fmt.Sprintf("Row %d: Missing mandatory fields", rowNum))
			continue
		}

		var studentID *string
		if idx, exists := colMap["student_id"]; exists && idx < len(row) {
			sID := strings.TrimSpace(row[idx])
			if sID != "" {
				studentID = &sID
			}
		}

		var room *string
		if idx, exists := colMap["room"]; exists && idx < len(row) {
			rVal := strings.TrimSpace(row[idx])
			if rVal != "" {
				room = &rVal
			}
		}

		var rowAcademicYear *string
		if idx, exists := colMap["academic_year"]; exists && idx < len(row) {
			ayVal := strings.TrimSpace(row[idx])
			if ayVal != "" {
				rowAcademicYear = &ayVal
			}
		}

		// Check duplicate by Email
		var count int64
		ac.db.Model(&models.User{}).Where("LOWER(email) = LOWER(?)", email).Count(&count)
		if count > 0 {
			skippedCount++
			errorLog = append(errorLog, fmt.Sprintf("Row %d: Email '%s' already exists", rowNum, email))
			continue
		}

		// Check duplicate by StudentID
		if studentID != nil {
			ac.db.Model(&models.User{}).Where("student_id = ?", *studentID).Count(&count)
			if count > 0 {
				skippedCount++
				errorLog = append(errorLog, fmt.Sprintf("Row %d: Student ID '%s' already exists", rowNum, *studentID))
				continue
			}
		}

		hashedPassword, err := utils.HashPassword(password)
		if err != nil {
			skippedCount++
			continue
		}

		role := models.RoleStudent
		if roleStr == "ADMIN" {
			role = models.RoleAdmin
		} else if roleStr == "TEACHER" {
			role = models.RoleTeacher
		}

		var userAY *string
		if rowAcademicYear != nil {
			userAY = rowAcademicYear
		} else if role == models.RoleStudent {
			userAY = &defaultAcademicYear
		}

		newUser := models.User{
			FullName:     fullName,
			Email:        email,
			PasswordHash: hashedPassword,
			Role:         role,
			StudentID:    studentID,
			Room:         room,
			AcademicYear: userAY,
			IsActive:     true,
		}

		if err := ac.db.Create(&newUser).Error; err != nil {
			skippedCount++
			errorLog = append(errorLog, fmt.Sprintf("Row %d: DB Insert error: %s", rowNum, err.Error()))
		} else {
			successCount++
		}
	}

	adminID, _ := c.Locals("userID").(uuid.UUID)
	services.LogActivity(ac.db, &adminID, "ADMIN", "IMPORT_USERS_CSV", fmt.Sprintf("Imported %d users, skipped %d", successCount, skippedCount), c.IP())

	return c.JSON(fiber.Map{
		"success":       true,
		"message":       fmt.Sprintf("Import completed: %d created, %d skipped", successCount, skippedCount),
		"success_count": successCount,
		"skipped_count": skippedCount,
		"error_log":     errorLog,
	})
}

// ----------------------------------------------------
// TEACHER ROOM ASSIGNMENT
// ----------------------------------------------------

type AssignRoomRequest struct {
	TeacherID    uuid.UUID `json:"teacher_id"`
	Room         string    `json:"room,omitempty"`
	Rooms        []string  `json:"rooms,omitempty"`
	AcademicYear string    `json:"academic_year,omitempty"`
}

func (ac *AdminController) AssignRoomToTeacher(c *fiber.Ctx) error {
	var req AssignRoomRequest
	if err := c.BodyParser(&req); err != nil || req.TeacherID == uuid.Nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Teacher ID is required"})
	}

	// Determine academic year
	academicYear := strings.TrimSpace(req.AcademicYear)
	if academicYear == "" {
		academicYear = database.GetCurrentAcademicYear(ac.db)
	}

	// Verify teacher exists and has TEACHER role
	var teacher models.User
	if err := ac.db.Where("id = ? AND role = ?", req.TeacherID, models.RoleTeacher).First(&teacher).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "Teacher not found"})
	}

	// Batch sync mode if Rooms slice is provided
	if req.Rooms != nil {
		var cleanedRooms []string
		seen := make(map[string]bool)
		for _, r := range req.Rooms {
			trimmed := strings.TrimSpace(r)
			if trimmed != "" && !seen[trimmed] {
				seen[trimmed] = true
				cleanedRooms = append(cleanedRooms, trimmed)
			}
		}

		err := ac.db.Transaction(func(tx *gorm.DB) error {
			// Remove existing assignments for this teacher in this academic year
			if err := tx.Where("teacher_id = ? AND academic_year = ?", req.TeacherID, academicYear).Delete(&models.TeacherAssignment{}).Error; err != nil {
				return err
			}

			// Insert new assignments
			for _, r := range cleanedRooms {
				assignment := models.TeacherAssignment{
					TeacherID:    req.TeacherID,
					Room:         r,
					AcademicYear: academicYear,
					CreatedAt:    time.Now(),
				}
				if err := tx.Create(&assignment).Error; err != nil {
					return err
				}
			}
			return nil
		})

		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to update room assignments"})
		}

		var updatedAssignments []models.TeacherAssignment
		ac.db.Where("teacher_id = ? AND academic_year = ?", req.TeacherID, academicYear).Find(&updatedAssignments)

		return c.JSON(fiber.Map{
			"success": true,
			"message": "Room assignments updated successfully",
			"data":    updatedAssignments,
		})
	}

	// Single room mode (Backward compatibility)
	req.Room = strings.TrimSpace(req.Room)
	if req.Room == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Room is required"})
	}

	var existing models.TeacherAssignment
	if err := ac.db.Where("teacher_id = ? AND room = ? AND academic_year = ?", req.TeacherID, req.Room, academicYear).First(&existing).Error; err == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Teacher is already assigned to this room"})
	}

	assignment := models.TeacherAssignment{
		TeacherID:    req.TeacherID,
		Room:         req.Room,
		AcademicYear: academicYear,
		CreatedAt:    time.Now(),
	}

	if err := ac.db.Create(&assignment).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to assign room"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "Room assigned to teacher successfully",
		"data":    assignment,
	})
}

func (ac *AdminController) RemoveTeacherAssignment(c *fiber.Ctx) error {
	idParam := c.Params("id")
	assignmentID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	if err := ac.db.Where("id = ?", assignmentID).Delete(&models.TeacherAssignment{}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to remove assignment"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Room assignment removed successfully",
	})
}

type CloneTeacherAssignmentsRequest struct {
	FromYear string `json:"from_year"`
	ToYear   string `json:"to_year"`
}

func (ac *AdminController) CloneTeacherAssignments(c *fiber.Ctx) error {
	var req CloneTeacherAssignmentsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	req.FromYear = strings.TrimSpace(req.FromYear)
	req.ToYear = strings.TrimSpace(req.ToYear)
	if req.FromYear == "" || req.ToYear == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "from_year and to_year are required"})
	}
	if req.FromYear == req.ToYear {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "from_year and to_year must be different"})
	}

	var sourceAssignments []models.TeacherAssignment
	if err := ac.db.Where("academic_year = ?", req.FromYear).Find(&sourceAssignments).Error; err != nil || len(sourceAssignments) == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": fmt.Sprintf("No assignments found for academic year %s", req.FromYear)})
	}

	clonedCount := 0
	err := ac.db.Transaction(func(tx *gorm.DB) error {
		for _, sa := range sourceAssignments {
			var existing models.TeacherAssignment
			if err := tx.Where("teacher_id = ? AND room = ? AND academic_year = ?", sa.TeacherID, sa.Room, req.ToYear).First(&existing).Error; err != nil {
				newAssign := models.TeacherAssignment{
					TeacherID:    sa.TeacherID,
					Room:         sa.Room,
					AcademicYear: req.ToYear,
					CreatedAt:    time.Now(),
				}
				if err := tx.Create(&newAssign).Error; err != nil {
					return err
				}
				clonedCount++
			}
		}
		return nil
	})

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to clone room assignments"})
	}

	return c.JSON(fiber.Map{
		"success":      true,
		"message":      fmt.Sprintf("Successfully cloned %d assignments from year %s to %s", clonedCount, req.FromYear, req.ToYear),
		"cloned_count": clonedCount,
	})
}

// ----------------------------------------------------
// ACADEMIC YEARS
// ----------------------------------------------------

func (ac *AdminController) ListAcademicYears(c *fiber.Ctx) error {
	var years []models.AcademicYear
	if err := ac.db.Order("year DESC, term DESC").Find(&years).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to fetch academic years"})
	}

	// Count groups & students for each academic year
	for i := range years {
		var groupCnt int64
		ac.db.Model(&models.ProjectGroup{}).Where("academic_year = ?", years[i].Year).Count(&groupCnt)
		years[i].GroupCount = groupCnt

		var studentCnt int64
		ac.db.Model(&models.User{}).Where("role = ? AND academic_year = ?", models.RoleStudent, years[i].Year).Count(&studentCnt)
		years[i].StudentCount = studentCnt
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    years,
	})
}

func (ac *AdminController) ListActiveAcademicYears(c *fiber.Ctx) error {
	var years []models.AcademicYear
	if err := ac.db.Where("is_active = true").Order("year DESC, term DESC").Find(&years).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to fetch active academic years"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    years,
	})
}

type CreateAcademicYearRequest struct {
	Year      string `json:"year"`
	Term      string `json:"term"`
	IsCurrent bool   `json:"is_current"`
	IsActive  *bool  `json:"is_active"`
}

func (ac *AdminController) CreateAcademicYear(c *fiber.Ctx) error {
	var req CreateAcademicYearRequest
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.Year) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Academic year is required"})
	}

	yearStr := strings.TrimSpace(req.Year)
	termStr := strings.TrimSpace(req.Term)
	if termStr == "" {
		termStr = "1"
	}

	// Check if Year + Term already exists
	var existing models.AcademicYear
	if err := ac.db.Where("year = ? AND term = ?", yearStr, termStr).First(&existing).Error; err == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": fmt.Sprintf("ปีการศึกษา %s ภาคเรียนที่ %s มีอยู่ในระบบแล้ว", yearStr, termStr)})
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	if req.IsCurrent {
		// Reset other current flags
		ac.db.Model(&models.AcademicYear{}).Where("is_current = true").Update("is_current", false)

		// Sync with system_settings
		ac.db.Model(&models.SystemSetting{}).Where("key = ?", "academic_year").Update("value", yearStr)
		ac.db.Model(&models.SystemSetting{}).Where("key = ?", "academic_term").Update("value", termStr)
	}

	yearObj := models.AcademicYear{
		Year:      yearStr,
		Term:      termStr,
		IsCurrent: req.IsCurrent,
		IsActive:  isActive,
		CreatedAt: time.Now(),
	}

	if err := ac.db.Create(&yearObj).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to create academic year"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data":    yearObj,
		"message": "สร้างปีการศึกษาสำเร็จ",
	})
}

type UpdateAcademicYearRequest struct {
	Year      *string `json:"year"`
	Term      *string `json:"term"`
	IsCurrent *bool   `json:"is_current"`
	IsActive  *bool   `json:"is_active"`
}

func (ac *AdminController) UpdateAcademicYear(c *fiber.Ctx) error {
	id := c.Params("id")
	var yearObj models.AcademicYear
	if err := ac.db.Where("id = ?", id).First(&yearObj).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "Academic year not found"})
	}

	var req UpdateAcademicYearRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	if req.Year != nil && strings.TrimSpace(*req.Year) != "" {
		yearObj.Year = strings.TrimSpace(*req.Year)
	}
	if req.Term != nil && strings.TrimSpace(*req.Term) != "" {
		yearObj.Term = strings.TrimSpace(*req.Term)
	}
	if req.IsActive != nil {
		yearObj.IsActive = *req.IsActive
	}
	if req.IsCurrent != nil && *req.IsCurrent {
		yearObj.IsCurrent = true
		// Reset other current flags
		ac.db.Model(&models.AcademicYear{}).Where("id != ?", yearObj.ID).Update("is_current", false)

		// Sync with system_settings
		ac.db.Model(&models.SystemSetting{}).Where("key = ?", "academic_year").Update("value", yearObj.Year)
		ac.db.Model(&models.SystemSetting{}).Where("key = ?", "academic_term").Update("value", yearObj.Term)
	} else if req.IsCurrent != nil && !*req.IsCurrent {
		yearObj.IsCurrent = false
	}

	if err := ac.db.Save(&yearObj).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to update academic year"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    yearObj,
		"message": "บันทึกการแก้ไขปีการศึกษาสำเร็จ",
	})
}

func (ac *AdminController) SetCurrentAcademicYear(c *fiber.Ctx) error {
	id := c.Params("id")
	var yearObj models.AcademicYear
	if err := ac.db.Where("id = ?", id).First(&yearObj).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "Academic year not found"})
	}

	// Set is_current = true and is_active = true
	yearObj.IsCurrent = true
	yearObj.IsActive = true
	if err := ac.db.Save(&yearObj).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to set current academic year"})
	}

	// Reset other current flags
	ac.db.Model(&models.AcademicYear{}).Where("id != ?", yearObj.ID).Update("is_current", false)

	// Sync with system_settings
	ac.db.Model(&models.SystemSetting{}).Where("key = ?", "academic_year").Update("value", yearObj.Year)
	ac.db.Model(&models.SystemSetting{}).Where("key = ?", "academic_term").Update("value", yearObj.Term)

	return c.JSON(fiber.Map{
		"success": true,
		"data":    yearObj,
		"message": fmt.Sprintf("ตั้งค่าปีการศึกษา %s ภาคเรียนที่ %s เป็นปีการศึกษาปัจจุบันเรียบร้อยแล้ว", yearObj.Year, yearObj.Term),
	})
}

func (ac *AdminController) DeleteAcademicYear(c *fiber.Ctx) error {
	id := c.Params("id")
	var yearObj models.AcademicYear
	if err := ac.db.Where("id = ?", id).First(&yearObj).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "Academic year not found"})
	}

	if yearObj.IsCurrent {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถลบปีการศึกษาที่เป็นปีปัจจุบันได้ กรุณาตั้งปีอื่นเป็นปีปัจจุบันก่อน",
		})
	}

	// Check if any project groups use this academic year
	var groupCount int64
	ac.db.Model(&models.ProjectGroup{}).Where("academic_year = ?", yearObj.Year).Count(&groupCount)
	if groupCount > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": fmt.Sprintf("ไม่สามารถลบได้ เนื่องจากมีกลุ่มโครงงาน %d กลุ่มอยู่ในปีการศึกษานี้ (แนะนำให้ปิดการใช้งานแทน)", groupCount),
		})
	}

	if err := ac.db.Delete(&yearObj).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to delete academic year"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "ลบปีการศึกษาสำเร็จ",
	})
}

func (ac *AdminController) ArchiveAcademicYearStudents(c *fiber.Ctx) error {
	id := c.Params("id")
	var yearObj models.AcademicYear
	if err := ac.db.Where("id = ?", id).First(&yearObj).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "Academic year not found"})
	}

	// Deactivate active students from this academic year
	res := ac.db.Model(&models.User{}).
		Where("role = ? AND academic_year = ? AND is_active = true", models.RoleStudent, yearObj.Year).
		Update("is_active", false)

	if res.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to archive students"})
	}

	adminID, _ := c.Locals("userID").(uuid.UUID)
	services.LogActivity(ac.db, &adminID, "ADMIN", "ARCHIVE_STUDENTS", fmt.Sprintf("Archived %d students for academic year %s", res.RowsAffected, yearObj.Year), c.IP())

	return c.JSON(fiber.Map{
		"success": true,
		"message": fmt.Sprintf("ปิดการใช้งาน/จัดเก็บข้อมูลนักเรียนปีการศึกษา %s จำนวน %d บัญชีเรียบร้อยแล้ว", yearObj.Year, res.RowsAffected),
		"count":   res.RowsAffected,
	})
}

// ----------------------------------------------------
// SYSTEM SETTINGS & TELEGRAM TEST
// ----------------------------------------------------

func (ac *AdminController) GetSettings(c *fiber.Ctx) error {
	var settings []models.SystemSetting
	if err := ac.db.Find(&settings).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to load settings"})
	}

	settingsMap := make(map[string]string)
	for _, s := range settings {
		settingsMap[s.Key] = s.Value
	}

	// Legacy fallback support for telegram_bot_token if only telegram_api_token is present
	if settingsMap["telegram_bot_token"] == "" && settingsMap["telegram_api_token"] != "" {
		settingsMap["telegram_bot_token"] = settingsMap["telegram_api_token"]
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    settingsMap,
	})
}

func (ac *AdminController) GetPublicSettings(c *fiber.Ctx) error {
	var settings []models.SystemSetting
	if err := ac.db.Find(&settings).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to load settings"})
	}

	publicKeys := map[string]bool{
		"system_name":             true,
		"system_description":      true,
		"institute_name":          true,
		"max_members_per_group":   true,
		"submission_mode":         true,
		"site_logo":               true,
		"site_favicon":            true,
		"site_copyright":          true,
		"show_scores_to_students": true,
		"telegram_bot_enabled":    true,
	}

	settingsMap := make(map[string]string)
	for _, s := range settings {
		if publicKeys[s.Key] {
			settingsMap[s.Key] = s.Value
		}
	}

	// Set defaults if not present
	if _, ok := settingsMap["submission_mode"]; !ok {
		settingsMap["submission_mode"] = "sequential"
	}
	if _, ok := settingsMap["show_scores_to_students"]; !ok {
		settingsMap["show_scores_to_students"] = "true"
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    settingsMap,
	})
}

// Upload Logo / Favicon (Admin only)
func (ac *AdminController) UploadSettingImage(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Image file is required"})
	}

	// Validate file size <= 5MB
	if file.Size > 5*1024*1024 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "File size exceeds limit (5MB)"})
	}

	// Validate extension
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExts := map[string]bool{
		".png":  true,
		".jpg":  true,
		".jpeg": true,
		".svg":  true,
		".webp": true,
		".ico":  true,
		".gif":  true,
	}
	if !allowedExts[ext] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid file type. Allowed: PNG, JPG, JPEG, SVG, WEBP, ICO, GIF"})
	}

	imageType := strings.TrimSpace(c.FormValue("type")) // "logo" or "favicon"
	if imageType == "" {
		imageType = "branding"
	}

	brandingDir := filepath.Join(ac.cfg.UploadDir, "branding")
	if err := os.MkdirAll(brandingDir, os.ModePerm); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to create upload directory"})
	}

	cleanFileName := fmt.Sprintf("%s_%d%s", imageType, time.Now().UnixNano(), ext)
	targetPath := filepath.Join(brandingDir, cleanFileName)

	if err := c.SaveFile(file, targetPath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to save uploaded image"})
	}

	relPath := filepath.ToSlash(filepath.Join("branding", cleanFileName))
	fullURL := "/api/files/download?path=" + relPath

	adminID, _ := c.Locals("userID").(uuid.UUID)
	services.LogActivity(ac.db, &adminID, "ADMIN", "UPLOAD_BRANDING", fmt.Sprintf("Uploaded %s image: %s", imageType, cleanFileName), c.IP())

	return c.JSON(fiber.Map{
		"success":   true,
		"file_path": relPath,
		"url":       fullURL,
		"message":   "อัปโหลดรูปภาพสำเร็จ",
	})
}

func (ac *AdminController) UpdateSettings(c *fiber.Ctx) error {
	var rawBody map[string]interface{}
	if err := c.BodyParser(&rawBody); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	settingsToUpdate := make(map[string]string)

	// Check if wrapped in "settings" key: { "settings": { ... } }
	if nestedSettings, ok := rawBody["settings"].(map[string]interface{}); ok {
		for k, v := range nestedSettings {
			if v != nil {
				settingsToUpdate[k] = fmt.Sprint(v)
			}
		}
	} else {
		// Flat map: { "system_name": "...", ... }
		for k, v := range rawBody {
			if k == "settings" {
				continue
			}
			if v != nil {
				settingsToUpdate[k] = fmt.Sprint(v)
			}
		}
	}

	for k, v := range settingsToUpdate {
		var setting models.SystemSetting
		if err := ac.db.Where("key = ?", k).First(&setting).Error; err == nil {
			setting.Value = v
			setting.UpdatedAt = time.Now()
			ac.db.Save(&setting)
		} else {
			ac.db.Create(&models.SystemSetting{
				Key:       k,
				Value:     v,
				UpdatedAt: time.Now(),
			})
		}
	}

	adminID, _ := c.Locals("userID").(uuid.UUID)
	services.LogActivity(ac.db, &adminID, "ADMIN", "UPDATE_SETTINGS", "Updated system settings", c.IP())

	return c.JSON(fiber.Map{
		"success": true,
		"message": "System settings updated successfully",
		"data":    settingsToUpdate,
	})
}

type TestTelegramRequest struct {
	BotToken string `json:"bot_token"`
	ChatID   string `json:"chat_id"`
}

func (ac *AdminController) TestTelegram(c *fiber.Ctx) error {
	var req TestTelegramRequest
	_ = c.BodyParser(&req)

	token := strings.TrimSpace(req.BotToken)
	chatID := strings.TrimSpace(req.ChatID)

	if token == "" || chatID == "" {
		t, ch, _ := ac.telegram.GetTelegramCredentials()
		token = t
		chatID = ch
	}

	if token == "" || chatID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Telegram Bot Token and Chat ID are required for testing",
		})
	}

	testMsg := "🤖 <b>TU-North CPMS - ทดสอบการเชื่อมต่อ Telegram Bot สำเร็จ</b>\n\nการแจ้งเตือนจากระบบพร้อมใช้งาน!"
	err := services.SendTelegramRaw(token, chatID, testMsg)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Telegram connection failed: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Telegram connection test message sent successfully!",
	})
}

// ----------------------------------------------------
// ACTIVITY AUDIT LOGS
// ----------------------------------------------------

func (ac *AdminController) ListActivityLogs(c *fiber.Ctx) error {
	role := c.Query("role")
	action := c.Query("action")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 50
	}
	offset := (page - 1) * limit

	query := ac.db.Model(&models.ActivityLog{}).Preload("User")

	if role != "" {
		query = query.Where("user_role = ?", strings.ToUpper(role))
	}
	if action != "" {
		query = query.Where("action = ?", strings.ToUpper(action))
	}

	var total int64
	query.Count(&total)

	var logs []models.ActivityLog
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&logs).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to fetch activity logs"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"total":   total,
		"page":    page,
		"limit":   limit,
		"data":    logs,
	})
}
