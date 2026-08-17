package controllers

import (
	"strings"
	"time"

	"tunorth-cpms-backend/internal/config"
	"tunorth-cpms-backend/internal/models"
	"tunorth-cpms-backend/internal/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AnnouncementController struct {
	db       *gorm.DB
	cfg      *config.Config
	telegram *services.TelegramService
}

func NewAnnouncementController(db *gorm.DB, cfg *config.Config, tg *services.TelegramService) *AnnouncementController {
	return &AnnouncementController{db: db, cfg: cfg, telegram: tg}
}

func (anc *AnnouncementController) ListAnnouncements(c *fiber.Ctx) error {
	var announcements []models.Announcement
	if err := anc.db.Preload("Creator").Order("is_pinned DESC, created_at DESC").Find(&announcements).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to fetch announcements"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    announcements,
	})
}

type CreateAnnouncementRequest struct {
	Title    string  `json:"title"`
	Content  *string `json:"content"`
	IsPinned bool    `json:"is_pinned"`
}

func (anc *AnnouncementController) CreateAnnouncement(c *fiber.Ctx) error {
	userID, _ := c.Locals("userID").(uuid.UUID)

	var req CreateAnnouncementRequest
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.Title) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Announcement title is required"})
	}

	announcement := models.Announcement{
		Title:     strings.TrimSpace(req.Title),
		Content:   req.Content,
		IsPinned:  req.IsPinned,
		CreatedBy: &userID,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := anc.db.Create(&announcement).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to create announcement"})
	}

	// Telegram notification
	anc.telegram.SendAsync("📢 <b>ประกาศใหม่จากระบบ CPMS</b>\n\n📌 <b>" + announcement.Title + "</b>")

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "Announcement created successfully",
		"data":    announcement,
	})
}

func (anc *AnnouncementController) DeleteAnnouncement(c *fiber.Ctx) error {
	idParam := c.Params("id")
	announcementID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	if err := anc.db.Where("id = ?", announcementID).Delete(&models.Announcement{}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to delete announcement"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Announcement deleted successfully",
	})
}
