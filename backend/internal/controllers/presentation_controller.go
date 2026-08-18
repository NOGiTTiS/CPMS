package controllers

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"tunorth-cpms-backend/internal/config"
	"tunorth-cpms-backend/internal/database"
	"tunorth-cpms-backend/internal/models"
	"tunorth-cpms-backend/internal/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PresentationController struct {
	db       *gorm.DB
	cfg      *config.Config
	telegram *services.TelegramService
}

func NewPresentationController(db *gorm.DB, cfg *config.Config, tg *services.TelegramService) *PresentationController {
	return &PresentationController{db: db, cfg: cfg, telegram: tg}
}

var PeriodTimes = map[int][2]string{
	1: {"08:30", "09:20"},
	2: {"09:20", "10:10"},
	3: {"10:10", "11:00"},
	4: {"11:00", "11:50"},
	6: {"12:40", "13:30"},
	7: {"13:30", "14:20"},
	8: {"14:20", "15:10"},
	9: {"15:10", "16:00"},
}

// ----------------------------------------------------
// DEFENSE SLOTS
// ----------------------------------------------------

func (pc *PresentationController) ListSlots(c *fiber.Ctx) error {
	academicYear := c.Query("academic_year")
	if academicYear == "" {
		academicYear = database.GetCurrentAcademicYear(pc.db)
	}

	query := pc.db.Model(&models.PresentationSlot{}).
		Preload("Bookings.Group.Members.User").
		Preload("Bookings.Group.Advisor").
		Preload("Bookings.Scores.Scorer").
		Order("start_time ASC")

	if academicYear != "all" && academicYear != "" {
		query = query.Where("academic_year = ?", academicYear)
	}

	var slots []models.PresentationSlot
	if err := query.Find(&slots).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to fetch slots"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"count":   len(slots),
		"data":    slots,
	})
}

type CreateSlotRequest struct {
	AcademicYear string    `json:"academic_year"`
	StartTime    time.Time `json:"start_time"`
	EndTime      time.Time `json:"end_time"`
	Location     string    `json:"location"`
	MaxGroups    int       `json:"max_groups"`
}

func (pc *PresentationController) CreateSlot(c *fiber.Ctx) error {
	var req CreateSlotRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	req.Location = strings.TrimSpace(req.Location)
	if req.Location == "" || req.StartTime.IsZero() || req.EndTime.IsZero() {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Start time, end time, and location are required"})
	}

	if req.MaxGroups <= 0 {
		req.MaxGroups = 1
	}
	if req.AcademicYear == "" {
		req.AcademicYear = database.GetCurrentAcademicYear(pc.db)
	}

	slot := models.PresentationSlot{
		AcademicYear: req.AcademicYear,
		StartTime:    req.StartTime,
		EndTime:      req.EndTime,
		Location:     req.Location,
		MaxGroups:    req.MaxGroups,
	}

	if err := pc.db.Create(&slot).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to create presentation slot"})
	}

	userID, _ := c.Locals("userID").(uuid.UUID)
	services.LogActivity(pc.db, &userID, "ADMIN", "CREATE_PRESENTATION_SLOT", fmt.Sprintf("Created slot at %s on %s", slot.Location, slot.StartTime.Format("2006-01-02 15:04")), c.IP())

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "Presentation slot created successfully",
		"data":    slot,
	})
}

type BatchCreateSlotsRequest struct {
	Dates        []string `json:"dates"`         // ["2026-08-18", "2026-08-19", ...]
	Periods      []int    `json:"periods"`       // [1, 2, 3, 4, 6, 7, 8, 9]
	Location     string   `json:"location"`
	MaxGroups    int      `json:"max_groups"`
	AcademicYear string   `json:"academic_year"`
}

func (pc *PresentationController) BatchCreateSlots(c *fiber.Ctx) error {
	var req BatchCreateSlotsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	req.Location = strings.TrimSpace(req.Location)
	if req.Location == "" {
		req.Location = "Meeting Room"
	}
	if req.MaxGroups <= 0 {
		req.MaxGroups = 1
	}
	if req.AcademicYear == "" {
		req.AcademicYear = database.GetCurrentAcademicYear(pc.db)
	}
	if len(req.Dates) == 0 || len(req.Periods) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Dates and periods are required"})
	}

	loc, err := time.LoadLocation("Asia/Bangkok")
	if err != nil {
		loc = time.FixedZone("Asia/Bangkok", 7*3600)
	}

	var createdSlots []models.PresentationSlot
	skippedCount := 0

	err = pc.db.Transaction(func(tx *gorm.DB) error {
		for _, dateStr := range req.Dates {
			dateStr = strings.TrimSpace(dateStr)
			if dateStr == "" {
				continue
			}
			for _, period := range req.Periods {
				times, ok := PeriodTimes[period]
				if !ok {
					continue
				}
				startTimeStr := fmt.Sprintf("%sT%s:00", dateStr, times[0])
				endTimeStr := fmt.Sprintf("%sT%s:00", dateStr, times[1])

				startTime, err1 := time.ParseInLocation("2006-01-02T15:04:05", startTimeStr, loc)
				endTime, err2 := time.ParseInLocation("2006-01-02T15:04:05", endTimeStr, loc)
				if err1 != nil || err2 != nil {
					continue
				}

				// Check duplicate
				var existingCount int64
				tx.Model(&models.PresentationSlot{}).
					Where("academic_year = ? AND location = ? AND start_time = ?", req.AcademicYear, req.Location, startTime).
					Count(&existingCount)
				if existingCount > 0 {
					skippedCount++
					continue
				}

				slot := models.PresentationSlot{
					AcademicYear: req.AcademicYear,
					StartTime:    startTime,
					EndTime:      endTime,
					Location:     req.Location,
					MaxGroups:    req.MaxGroups,
				}
				if err := tx.Create(&slot).Error; err != nil {
					return err
				}
				createdSlots = append(createdSlots, slot)
			}
		}
		return nil
	})

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to create batch presentation slots"})
	}

	userID, _ := c.Locals("userID").(uuid.UUID)
	userRole, _ := c.Locals("userRole").(models.UserRole)
	services.LogActivity(pc.db, &userID, string(userRole), "BATCH_CREATE_PRESENTATION_SLOTS", fmt.Sprintf("Created %d slots (skipped %d existing) at %s for Year %s", len(createdSlots), skippedCount, req.Location, req.AcademicYear), c.IP())

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success":       true,
		"message":       fmt.Sprintf("สร้างรอบนำเสนอเรียบร้อยแล้ว %d รอบ (ข้ามรอบซ้ำ %d รอบ)", len(createdSlots), skippedCount),
		"created_count": len(createdSlots),
		"skipped_count": skippedCount,
		"data":          createdSlots,
	})
}

func (pc *PresentationController) DeleteSlot(c *fiber.Ctx) error {
	idParam := c.Params("id")
	slotID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid slot ID"})
	}

	var slot models.PresentationSlot
	if err := pc.db.Preload("Bookings").Where("id = ?", slotID).First(&slot).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "Slot not found"})
	}

	if len(slot.Bookings) > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Cannot delete slot because groups have already booked it",
		})
	}

	if err := pc.db.Delete(&slot).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to delete slot"})
	}

	userID, _ := c.Locals("userID").(uuid.UUID)
	services.LogActivity(pc.db, &userID, "ADMIN", "DELETE_PRESENTATION_SLOT", fmt.Sprintf("Deleted slot: %s", slot.Location), c.IP())

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Slot deleted successfully",
	})
}

// ----------------------------------------------------
// PRESENTATION BOOKINGS
// ----------------------------------------------------

type BookSlotRequest struct {
	SlotID  uuid.UUID  `json:"slot_id"`
	GroupID *uuid.UUID `json:"group_id"` // Optional, if admin books for group
}

func (pc *PresentationController) BookSlot(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "Unauthorized"})
	}
	userRole, _ := c.Locals("userRole").(models.UserRole)

	var req BookSlotRequest
	if err := c.BodyParser(&req); err != nil || req.SlotID == uuid.Nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Slot ID is required"})
	}

	var targetGroupID uuid.UUID
	if userRole == models.RoleAdmin && req.GroupID != nil {
		targetGroupID = *req.GroupID
	} else {
		var member models.GroupMember
		if err := pc.db.Where("user_id = ?", userID).First(&member).Error; err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "You are not a member of any project group"})
		}
		targetGroupID = member.GroupID
	}

	// Verify slot exists & capacity
	var slot models.PresentationSlot
	if err := pc.db.Preload("Bookings").Where("id = ?", req.SlotID).First(&slot).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "Presentation slot not found"})
	}

	// If already booked another slot, remove old booking (or transfer)
	var existingBooking models.PresentationBooking
	hasExisting := pc.db.Where("group_id = ?", targetGroupID).First(&existingBooking).Error == nil

	if !hasExisting && len(slot.Bookings) >= slot.MaxGroups {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "This presentation slot is already full"})
	}

	if hasExisting {
		if existingBooking.SlotID == req.SlotID {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "You have already booked this slot"})
		}
		// Move to new slot if capacity allows
		if len(slot.Bookings) >= slot.MaxGroups {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "The selected new slot is full"})
		}
		existingBooking.SlotID = req.SlotID
		existingBooking.BookedAt = time.Now()
		if err := pc.db.Save(&existingBooking).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to update slot booking"})
		}
	} else {
		newBooking := models.PresentationBooking{
			SlotID:   req.SlotID,
			GroupID:  targetGroupID,
			BookedAt: time.Now(),
		}
		if err := pc.db.Create(&newBooking).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to book slot"})
		}
	}

	var group models.ProjectGroup
	pc.db.Where("id = ?", targetGroupID).First(&group)

	services.LogActivity(pc.db, &userID, string(userRole), "BOOK_DEFENSE_SLOT", fmt.Sprintf("Booked defense slot at %s on %s for group %s", slot.Location, slot.StartTime.Format("2006-01-02 15:04"), group.ProjectNameTH), c.IP())

	pc.telegram.SendAsync(fmt.Sprintf(
		"📅 <b>มีการจองรอบนำเสนอโครงงาน</b>\n\n📌 <b>โครงงาน:</b> %s\n🏢 <b>สถานที่:</b> %s\n⏰ <b>วันเวลา:</b> %s - %s",
		group.ProjectNameTH, slot.Location, slot.StartTime.Format("02/01/2006 15:04"), slot.EndTime.Format("15:04"),
	))

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Presentation slot booked successfully",
	})
}

func (pc *PresentationController) CancelBooking(c *fiber.Ctx) error {
	userID, _ := c.Locals("userID").(uuid.UUID)
	userRole, _ := c.Locals("userRole").(models.UserRole)

	bookingIDParam := c.Params("bookingId")
	bookingID, err := uuid.Parse(bookingIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid booking ID"})
	}

	var booking models.PresentationBooking
	if err := pc.db.Preload("Group").Where("id = ?", bookingID).First(&booking).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "Booking not found"})
	}

	if userRole != models.RoleAdmin {
		var member models.GroupMember
		if err := pc.db.Where("group_id = ? AND user_id = ?", booking.GroupID, userID).First(&member).Error; err != nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"success": false, "message": "Unauthorized to cancel this booking"})
		}
	}

	if err := pc.db.Delete(&booking).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to cancel booking"})
	}

	services.LogActivity(pc.db, &userID, string(userRole), "CANCEL_DEFENSE_SLOT", fmt.Sprintf("Canceled defense booking for group %s", booking.Group.ProjectNameTH), c.IP())

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Booking canceled successfully",
	})
}

// ----------------------------------------------------
// RUBRIC CRITERIA
// ----------------------------------------------------

func (pc *PresentationController) ListCriteria(c *fiber.Ctx) error {
	activeOnly := c.Query("active_only") == "true"

	query := pc.db.Order("criteria_order ASC, created_at ASC")
	if activeOnly {
		query = query.Where("is_active = ?", true)
	}

	var criteria []models.PresentationCriteria
	if err := query.Find(&criteria).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to fetch criteria"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    criteria,
	})
}

type CreateCriteriaRequest struct {
	Label         string  `json:"label"`
	Description   *string `json:"description"`
	MaxScore      float64 `json:"max_score"`
	CriteriaOrder int     `json:"criteria_order"`
	IsActive      *bool   `json:"is_active"`
}

func (pc *PresentationController) CreateCriteria(c *fiber.Ctx) error {
	userID, _ := c.Locals("userID").(uuid.UUID)
	userRole, _ := c.Locals("userRole").(models.UserRole)

	var req CreateCriteriaRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	req.Label = strings.TrimSpace(req.Label)
	if req.Label == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Label is required"})
	}

	if req.MaxScore <= 0 {
		req.MaxScore = 10.0
	}

	if req.CriteriaOrder <= 0 {
		var maxOrder int
		pc.db.Model(&models.PresentationCriteria{}).Select("COALESCE(MAX(criteria_order), 0)").Scan(&maxOrder)
		req.CriteriaOrder = maxOrder + 1
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	criterion := models.PresentationCriteria{
		Label:         req.Label,
		Description:   req.Description,
		MaxScore:      req.MaxScore,
		CriteriaOrder: req.CriteriaOrder,
		IsActive:      isActive,
	}

	if err := pc.db.Create(&criterion).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to create criteria"})
	}

	services.LogActivity(pc.db, &userID, string(userRole), "CREATE_RUBRIC_CRITERIA", fmt.Sprintf("Created rubric criterion '%s' (Max score: %.1f)", criterion.Label, criterion.MaxScore), c.IP())

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data":    criterion,
	})
}

func (pc *PresentationController) UpdateCriteria(c *fiber.Ctx) error {
	userID, _ := c.Locals("userID").(uuid.UUID)
	userRole, _ := c.Locals("userRole").(models.UserRole)

	idParam := c.Params("id")
	criteriaID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	var criterion models.PresentationCriteria
	if err := pc.db.Where("id = ?", criteriaID).First(&criterion).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "Criteria not found"})
	}

	var req map[string]interface{}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	delete(req, "id")

	// Validate label if passed
	if val, ok := req["label"]; ok {
		if labelStr, ok := val.(string); ok {
			labelStr = strings.TrimSpace(labelStr)
			if labelStr == "" {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Label cannot be empty"})
			}
			req["label"] = labelStr
		}
	}

	// Validate max_score if passed
	if val, ok := req["max_score"]; ok {
		if scoreFloat, ok := val.(float64); ok && scoreFloat <= 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Max score must be greater than 0"})
		}
	}

	if err := pc.db.Model(&criterion).Updates(req).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to update criteria"})
	}

	// Refetch to get updated object
	pc.db.Where("id = ?", criteriaID).First(&criterion)

	services.LogActivity(pc.db, &userID, string(userRole), "UPDATE_RUBRIC_CRITERIA", fmt.Sprintf("Updated rubric criterion '%s' (ID: %s)", criterion.Label, criterion.ID), c.IP())

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Criteria updated successfully",
		"data":    criterion,
	})
}

func (pc *PresentationController) DeleteCriteria(c *fiber.Ctx) error {
	userID, _ := c.Locals("userID").(uuid.UUID)
	userRole, _ := c.Locals("userRole").(models.UserRole)

	idParam := c.Params("id")
	criteriaID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	var criterion models.PresentationCriteria
	if err := pc.db.Where("id = ?", criteriaID).First(&criterion).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "Criteria not found"})
	}

	if err := pc.db.Where("id = ?", criteriaID).Delete(&models.PresentationCriteria{}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to delete criteria"})
	}

	services.LogActivity(pc.db, &userID, string(userRole), "DELETE_RUBRIC_CRITERIA", fmt.Sprintf("Deleted rubric criterion '%s' (ID: %s)", criterion.Label, criterion.ID), c.IP())

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Criteria deleted successfully",
	})
}

type ReorderCriteriaItem struct {
	ID            uuid.UUID `json:"id"`
	CriteriaOrder int       `json:"criteria_order"`
}

func (pc *PresentationController) ReorderCriteria(c *fiber.Ctx) error {
	userID, _ := c.Locals("userID").(uuid.UUID)
	userRole, _ := c.Locals("userRole").(models.UserRole)

	var items []ReorderCriteriaItem
	if err := c.BodyParser(&items); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid request payload"})
	}

	err := pc.db.Transaction(func(tx *gorm.DB) error {
		for _, item := range items {
			if err := tx.Model(&models.PresentationCriteria{}).
				Where("id = ?", item.ID).
				Update("criteria_order", item.CriteriaOrder).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to reorder criteria"})
	}

	services.LogActivity(pc.db, &userID, string(userRole), "REORDER_RUBRIC_CRITERIA", fmt.Sprintf("Reordered %d rubric criteria", len(items)), c.IP())

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Criteria reordered successfully",
	})
}

// ----------------------------------------------------
// MULTI-EVALUATOR SCORING & SUMMARY
// ----------------------------------------------------

type SubmitPresentationScoreRequest struct {
	BookingID    uuid.UUID          `json:"booking_id"`
	CriteriaData map[string]float64 `json:"criteria_data"` // { criterion_id: score }
	Comments     *string            `json:"comments"`
}

func (pc *PresentationController) SubmitScore(c *fiber.Ctx) error {
	scorerID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "Unauthorized"})
	}
	scorerRole, _ := c.Locals("userRole").(models.UserRole)

	var req SubmitPresentationScoreRequest
	if err := c.BodyParser(&req); err != nil || req.BookingID == uuid.Nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Valid booking_id is required"})
	}

	var booking models.PresentationBooking
	if err := pc.db.Preload("Group").Where("id = ?", req.BookingID).First(&booking).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "Booking not found"})
	}

	// Calculate total score from criteria map
	var totalScore float64 = 0
	for _, scoreVal := range req.CriteriaData {
		totalScore += scoreVal
	}

	criteriaJSON, _ := json.Marshal(req.CriteriaData)

	// Check if this teacher already scored this booking
	var existingScore models.PresentationScore
	err := pc.db.Where("booking_id = ? AND scorer_id = ?", req.BookingID, scorerID).First(&existingScore).Error

	if err == nil {
		existingScore.CriteriaData = string(criteriaJSON)
		existingScore.TotalScore = totalScore
		existingScore.Comments = req.Comments
		existingScore.UpdatedAt = time.Now()
		if err := pc.db.Save(&existingScore).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to update score"})
		}
	} else {
		newScore := models.PresentationScore{
			BookingID:    req.BookingID,
			ScorerID:     &scorerID,
			CriteriaData: string(criteriaJSON),
			TotalScore:   totalScore,
			Comments:     req.Comments,
			ScoredAt:     time.Now(),
			UpdatedAt:    time.Now(),
		}
		if err := pc.db.Create(&newScore).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to save score"})
		}
	}

	services.LogActivity(pc.db, &scorerID, string(scorerRole), "EVALUATE_PRESENTATION", fmt.Sprintf("Evaluated defense presentation for group '%s' (Total: %.2f)", booking.Group.ProjectNameTH, totalScore), c.IP())

	return c.JSON(fiber.Map{
		"success":     true,
		"message":     "Presentation score saved successfully",
		"total_score": totalScore,
	})
}

func (pc *PresentationController) ExportScoresCSV(c *fiber.Ctx) error {
	academicYear := strings.TrimSpace(c.Query("academic_year"))
	if academicYear == "" {
		academicYear = database.GetCurrentAcademicYear(pc.db)
	}

	var bookings []models.PresentationBooking
	if err := pc.db.Preload("Group.Members.User").
		Preload("Group.Advisor").
		Preload("Slot").
		Preload("Scores.Scorer").
		Joins("JOIN presentation_slots ON presentation_slots.id = presentation_bookings.slot_id").
		Where("presentation_slots.academic_year = ?", academicYear).
		Find(&bookings).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to load scores for export"})
	}

	// Fetch active criteria headers
	var criteria []models.PresentationCriteria
	pc.db.Where("is_active = true").Order("criteria_order ASC").Find(&criteria)

	buf := new(bytes.Buffer)
	// UTF-8 BOM for Microsoft Excel Thai language compatibility
	buf.WriteString("\xEF\xBB\xBF")

	writer := csv.NewWriter(buf)

	// CSV Header
	header := []string{
		"ลำดับ", "ห้อง", "ชื่อโครงงาน (ไทย)", "ชื่อโครงงาน (อังกฤษ)", "ครูที่ปรึกษา", "สมาชิกในกลุ่ม",
		"วันเวลานำเสนอ", "สถานที่", "จำนวนกรรมการที่ประเมิน", "คะแนนรวมเฉลี่ย", "รายชื่อกรรมการและคะแนน",
	}
	_ = writer.Write(header)

	for i, b := range bookings {
		var memberNames []string
		room := "-"
		if b.Group.Room != nil {
			room = *b.Group.Room
		}
		for _, m := range b.Group.Members {
			if m.User != nil {
				roleLabel := ""
				if m.IsLeader {
					roleLabel = " (หัวหน้า)"
				}
				memberNames = append(memberNames, fmt.Sprintf("%s%s", m.User.FullName, roleLabel))
			}
		}

		advisorName := "-"
		if b.Group.AdvisorName != nil {
			advisorName = *b.Group.AdvisorName
		}

		slotTime := "-"
		slotLoc := "-"
		if b.Slot != nil {
			slotTime = fmt.Sprintf("%s - %s", b.Slot.StartTime.Format("02/01/2006 15:04"), b.Slot.EndTime.Format("15:04"))
			slotLoc = b.Slot.Location
		}

		numScores := len(b.Scores)
		var totalSum float64 = 0
		var scorerDetails []string
		for _, sc := range b.Scores {
			totalSum += sc.TotalScore
			scorerName := "กรรมการ"
			if sc.Scorer != nil {
				scorerName = sc.Scorer.FullName
			}
			scorerDetails = append(scorerDetails, fmt.Sprintf("%s: %.2f", scorerName, sc.TotalScore))
		}

		avgScore := 0.0
		if numScores > 0 {
			avgScore = totalSum / float64(numScores)
		}

		row := []string{
			fmt.Sprintf("%d", i+1),
			room,
			b.Group.ProjectNameTH,
			b.Group.ProjectNameEN,
			advisorName,
			strings.Join(memberNames, ", "),
			slotTime,
			slotLoc,
			fmt.Sprintf("%d", numScores),
			fmt.Sprintf("%.2f", avgScore),
			strings.Join(scorerDetails, " | "),
		}
		_ = writer.Write(row)
	}

	writer.Flush()

	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=presentation_scores_%s.csv", academicYear))
	return c.Send(buf.Bytes())
}
