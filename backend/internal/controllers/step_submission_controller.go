package controllers

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"tunorth-cpms-backend/internal/config"
	"tunorth-cpms-backend/internal/models"
	"tunorth-cpms-backend/internal/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type StepSubmissionController struct {
	db       *gorm.DB
	cfg      *config.Config
	telegram *services.TelegramService
}

func NewStepSubmissionController(db *gorm.DB, cfg *config.Config, tg *services.TelegramService) *StepSubmissionController {
	return &StepSubmissionController{db: db, cfg: cfg, telegram: tg}
}

// ----------------------------------------------------
// PROJECT STEPS (CRUD)
// ----------------------------------------------------

func (ssc *StepSubmissionController) ListSteps(c *fiber.Ctx) error {
	userRole, _ := c.Locals("userRole").(models.UserRole)

	query := ssc.db.Model(&models.ProjectStep{}).Order("step_order ASC")
	// Students only see active steps unless admin/teacher
	if userRole == models.RoleStudent {
		query = query.Where("is_active = true")
	}

	var steps []models.ProjectStep
	if err := query.Find(&steps).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to fetch steps"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"count":   len(steps),
		"data":    steps,
	})
}

func (ssc *StepSubmissionController) GetStepByID(c *fiber.Ctx) error {
	idParam := c.Params("id")
	stepID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid step ID"})
	}

	var step models.ProjectStep
	if err := ssc.db.Where("id = ?", stepID).First(&step).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "Step not found"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    step,
	})
}

type CreateStepRequest struct {
	StepName        string     `json:"step_name"`
	Description     *string    `json:"description"`
	StepOrder       int        `json:"step_order"`
	FileFormPath    *string    `json:"file_form_path"`
	FileExamplePath *string    `json:"file_example_path"`
	Deadline        *time.Time `json:"deadline"`
	IsActive        bool       `json:"is_active"`
	MaxScore        float64    `json:"max_score"`
}

func (ssc *StepSubmissionController) CreateStep(c *fiber.Ctx) error {
	var req CreateStepRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	req.StepName = strings.TrimSpace(req.StepName)
	if req.StepName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Step name is required"})
	}

	if req.StepOrder <= 0 {
		var maxOrder int
		row := ssc.db.Model(&models.ProjectStep{}).Select("COALESCE(MAX(step_order), 0)").Row()
		_ = row.Scan(&maxOrder)
		req.StepOrder = maxOrder + 1
	}

	if req.MaxScore <= 0 {
		req.MaxScore = 10.0
	}

	step := models.ProjectStep{
		StepName:        req.StepName,
		Description:     req.Description,
		StepOrder:       req.StepOrder,
		FileFormPath:    req.FileFormPath,
		FileExamplePath: req.FileExamplePath,
		Deadline:        req.Deadline,
		IsActive:        req.IsActive,
		MaxScore:        req.MaxScore,
	}

	if err := ssc.db.Create(&step).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to create step"})
	}

	userID, _ := c.Locals("userID").(uuid.UUID)
	services.LogActivity(ssc.db, &userID, "ADMIN", "CREATE_STEP", fmt.Sprintf("Created step %d: %s", step.StepOrder, step.StepName), c.IP())

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "Project step created successfully",
		"data":    step,
	})
}

func (ssc *StepSubmissionController) UpdateStep(c *fiber.Ctx) error {
	idParam := c.Params("id")
	stepID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid step ID"})
	}

	var step models.ProjectStep
	if err := ssc.db.Where("id = ?", stepID).First(&step).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "Step not found"})
	}

	var req map[string]interface{}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	// Remove immutable fields if any
	delete(req, "id")
	delete(req, "created_at")

	if err := ssc.db.Model(&step).Updates(req).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to update step"})
	}

	var updated models.ProjectStep
	ssc.db.Where("id = ?", stepID).First(&updated)

	userID, _ := c.Locals("userID").(uuid.UUID)
	services.LogActivity(ssc.db, &userID, "ADMIN", "UPDATE_STEP", fmt.Sprintf("Updated step: %s", updated.StepName), c.IP())

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Step updated successfully",
		"data":    updated,
	})
}

func (ssc *StepSubmissionController) DeleteStep(c *fiber.Ctx) error {
	idParam := c.Params("id")
	stepID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid step ID"})
	}

	var step models.ProjectStep
	if err := ssc.db.Where("id = ?", stepID).First(&step).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "Step not found"})
	}

	if err := ssc.db.Delete(&step).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to delete step"})
	}

	userID, _ := c.Locals("userID").(uuid.UUID)
	services.LogActivity(ssc.db, &userID, "ADMIN", "DELETE_STEP", fmt.Sprintf("Deleted step: %s", step.StepName), c.IP())

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Step deleted successfully",
	})
}

// ----------------------------------------------------
// SUBMISSIONS (Student Upload / Link & Revision)
// ----------------------------------------------------

func (ssc *StepSubmissionController) SubmitWork(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "Unauthorized"})
	}

	// 1. Verify student's group
	var member models.GroupMember
	if err := ssc.db.Preload("Group").Where("user_id = ?", userID).First(&member).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "You are not a member of any project group"})
	}

	stepIDParam := c.FormValue("step_id")
	stepID, err := uuid.Parse(stepIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid step_id"})
	}

	// 2. Fetch step
	var currentStep models.ProjectStep
	if err := ssc.db.Where("id = ? AND is_active = true", stepID).First(&currentStep).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "Project step not found or inactive"})
	}

	// 3. Check Sequential Mode
	var submissionModeSetting models.SystemSetting
	isSequential := true
	if err := ssc.db.Where("key = ?", "submission_mode").First(&submissionModeSetting).Error; err == nil {
		if strings.ToLower(submissionModeSetting.Value) == "open" {
			isSequential = false
		}
	}

	if isSequential && currentStep.StepOrder > 1 {
		// Find previous step
		var prevStep models.ProjectStep
		if err := ssc.db.Where("step_order < ? AND is_active = true", currentStep.StepOrder).
			Order("step_order DESC").First(&prevStep).Error; err == nil {
			// Check if previous step submission is APPROVED
			var prevSubmission models.Submission
			err := ssc.db.Where("group_id = ? AND step_id = ? AND status = ?", member.GroupID, prevStep.ID, models.SubmissionStatusApproved).First(&prevSubmission).Error
			if err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"success": false,
					"message": fmt.Sprintf("Sequential mode enabled: You must complete and get '%s' approved before submitting this step.", prevStep.StepName),
				})
			}
		}
	}

	submissionType := models.SubmissionType(c.FormValue("submission_type"))
	if submissionType != models.SubmissionTypeFile && submissionType != models.SubmissionTypeLink {
		submissionType = models.SubmissionTypeFile
	}

	var filePath string
	if submissionType == models.SubmissionTypeLink {
		link := strings.TrimSpace(c.FormValue("link_url"))
		if link == "" || (!strings.HasPrefix(link, "http://") && !strings.HasPrefix(link, "https://")) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "A valid http/https URL is required for link submission"})
		}
		filePath = link
	} else {
		// File upload handling
		file, err := c.FormFile("file")
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "File upload is required"})
		}

		// Check size (<= 20MB)
		maxSizeBytes := ssc.cfg.MaxUploadSizeMB * 1024 * 1024
		if file.Size > maxSizeBytes {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": fmt.Sprintf("File size exceeds maximum allowed limit (%d MB)", ssc.cfg.MaxUploadSizeMB),
			})
		}

		// Destination directory
		groupUploadDir := filepath.Join(ssc.cfg.UploadDir, "submissions", member.GroupID.String())
		if err := os.MkdirAll(groupUploadDir, os.ModePerm); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to create upload directory"})
		}

		ext := filepath.Ext(file.Filename)
		cleanFileName := fmt.Sprintf("step_%d_rev_%d_%d%s", currentStep.StepOrder, time.Now().Unix(), time.Now().Nanosecond()%1000, ext)
		targetPath := filepath.Join(groupUploadDir, cleanFileName)

		if err := c.SaveFile(file, targetPath); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to save uploaded file"})
		}

		// Relative path for database storage
		filePath = filepath.ToSlash(filepath.Join("submissions", member.GroupID.String(), cleanFileName))
	}

	// 4. Create or Update Submission with Revision Tracking
	var existingSubmission models.Submission
	err = ssc.db.Where("group_id = ? AND step_id = ?", member.GroupID, stepID).First(&existingSubmission).Error

	var submission models.Submission
	if err == nil {
		// Revision increment
		existingSubmission.SubmissionType = submissionType
		existingSubmission.FilePath = filePath
		existingSubmission.Status = models.SubmissionStatusPending
		existingSubmission.SubmittedBy = &userID
		existingSubmission.RevisionNumber = existingSubmission.RevisionNumber + 1
		existingSubmission.SubmittedAt = time.Now()
		existingSubmission.ReviewedAt = nil

		if err := ssc.db.Save(&existingSubmission).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to update submission"})
		}
		submission = existingSubmission
	} else {
		// New submission
		submission = models.Submission{
			GroupID:        member.GroupID,
			StepID:         stepID,
			SubmittedBy:    &userID,
			SubmissionType: submissionType,
			FilePath:       filePath,
			Status:         models.SubmissionStatusPending,
			RevisionNumber: 1,
			SubmittedAt:    time.Now(),
		}
		if err := ssc.db.Create(&submission).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to create submission"})
		}
	}

	// Telegram notification to teachers
	var submitter models.User
	ssc.db.Where("id = ?", userID).First(&submitter)

	services.LogActivity(ssc.db, &userID, "STUDENT", "SUBMIT_WORK", fmt.Sprintf("Submitted step %d (%s) rev %d", currentStep.StepOrder, currentStep.StepName, submission.RevisionNumber), c.IP())

	ssc.telegram.SendAsync(fmt.Sprintf(
		"📤 <b>มีการส่งงานโครงงานใหม่</b>\n\n📌 <b>โครงงาน:</b> %s\n📋 <b>ขั้นตอนที่ %d:</b> %s\n👤 <b>ผู้ส่ง:</b> %s (ครั้งที่ %d)\n🔗 <b>ประเภท:</b> %s",
		member.Group.ProjectNameTH, currentStep.StepOrder, currentStep.StepName, submitter.FullName, submission.RevisionNumber, strings.ToUpper(string(submissionType)),
	))

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Work submitted successfully and pending teacher review",
		"data":    submission,
	})
}

func (ssc *StepSubmissionController) GetGroupSubmissions(c *fiber.Ctx) error {
	groupIDParam := c.Params("groupId")
	groupID, err := uuid.Parse(groupIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid groupId"})
	}

	var submissions []models.Submission
	if err := ssc.db.Preload("Step").Preload("Submitter").Where("group_id = ?", groupID).Order("submitted_at ASC").Find(&submissions).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to load submissions"})
	}

	userRole, _ := c.Locals("userRole").(string)
	if userRole == "STUDENT" {
		var showScoresSetting models.SystemSetting
		if err := ssc.db.Where("key = ?", "show_scores_to_students").First(&showScoresSetting).Error; err == nil {
			if showScoresSetting.Value == "false" || showScoresSetting.Value == "0" {
				for i := range submissions {
					submissions[i].Score = nil
				}
			}
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    submissions,
	})
}

// ----------------------------------------------------
// TEACHER REVIEW & GRADING
// ----------------------------------------------------

type ReviewSubmissionRequest struct {
	Status  models.SubmissionStatus `json:"status"` // APPROVED | REJECTED
	Score   *float64                `json:"score"`
	Comment *string                 `json:"comment"`
}

func (ssc *StepSubmissionController) ReviewSubmission(c *fiber.Ctx) error {
	idParam := c.Params("id")
	submissionID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid submission ID"})
	}

	reviewerID, _ := c.Locals("userID").(uuid.UUID)
	reviewerRole, _ := c.Locals("userRole").(models.UserRole)

	var submission models.Submission
	if err := ssc.db.Preload("Group").Preload("Step").Where("id = ?", submissionID).First(&submission).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "Submission not found"})
	}

	var req ReviewSubmissionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	if req.Status != models.SubmissionStatusApproved && req.Status != models.SubmissionStatusRejected {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Status must be either APPROVED or REJECTED",
		})
	}

	// Validate score if approved
	if req.Status == models.SubmissionStatusApproved && req.Score != nil {
		if *req.Score < 0 || *req.Score > submission.Step.MaxScore {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": fmt.Sprintf("Score must be between 0 and %.2f", submission.Step.MaxScore),
			})
		}
	}

	now := time.Now()
	submission.Status = req.Status
	submission.Score = req.Score
	submission.Comment = req.Comment
	submission.ReviewedAt = &now

	if err := ssc.db.Save(&submission).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to save review"})
	}

	var reviewer models.User
	ssc.db.Where("id = ?", reviewerID).First(&reviewer)

	services.LogActivity(ssc.db, &reviewerID, string(reviewerRole), "REVIEW_SUBMISSION", fmt.Sprintf("Reviewed step '%s' for group '%s' - %s", submission.Step.StepName, submission.Group.ProjectNameTH, submission.Status), c.IP())

	// Notify students via Telegram
	statusEmoji := "✅"
	if req.Status == models.SubmissionStatusRejected {
		statusEmoji = "❌"
	}

	scoreText := "-"
	if req.Score != nil {
		scoreText = fmt.Sprintf("%.2f / %.2f", *req.Score, submission.Step.MaxScore)
	}

	ssc.telegram.SendAsync(fmt.Sprintf(
		"%s <b>ผลการตรวจงานโครงงาน</b>\n\n📌 <b>โครงงาน:</b> %s\n📋 <b>ขั้นตอน:</b> %s\n📊 <b>ผลการตรวจ:</b> <b>%s</b>\n⭐️ <b>คะแนน:</b> %s\n👨‍🏫 <b>ผู้ตรวจ:</b> %s",
		statusEmoji, submission.Group.ProjectNameTH, submission.Step.StepName, submission.Status, scoreText, reviewer.FullName,
	))

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Submission reviewed successfully",
		"data":    submission,
	})
}

// Download file endpoint
func (ssc *StepSubmissionController) DownloadFile(c *fiber.Ctx) error {
	filePath := c.Query("path")
	if filePath == "" || strings.Contains(filePath, "..") {
		return c.Status(fiber.StatusBadRequest).SendString("Invalid file path")
	}

	// Candidates list to search for file
	candidates := []string{
		filepath.Join(ssc.cfg.UploadDir, filePath),
		filepath.Join(ssc.cfg.UploadDir, strings.TrimPrefix(filePath, "uploads/")),
		filepath.Join(`D:\TUNorth\apps\cpms\old_system\tunorth-cpms`, filePath),
		filepath.Join(`../old_system/tunorth-cpms`, filePath),
		filePath,
	}

	for _, p := range candidates {
		if fi, err := os.Stat(p); err == nil && !fi.IsDir() {
			return c.SendFile(p)
		}
	}

	return c.Status(fiber.StatusNotFound).SendString("File not found")
}

// Upload Step Template or Example document (Admin)
func (ssc *StepSubmissionController) UploadStepAsset(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "File is required"})
	}

	assetDir := filepath.Join(ssc.cfg.UploadDir, "templates")
	if err := os.MkdirAll(assetDir, os.ModePerm); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to create asset directory"})
	}

	cleanFileName := fmt.Sprintf("template_%d%s", time.Now().UnixNano(), filepath.Ext(file.Filename))
	targetPath := filepath.Join(assetDir, cleanFileName)

	if err := c.SaveFile(file, targetPath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to save asset"})
	}

	relPath := filepath.ToSlash(filepath.Join("templates", cleanFileName))
	return c.JSON(fiber.Map{
		"success":   true,
		"file_path": relPath,
		"url":       "/api/files/download?path=" + relPath,
	})
}
