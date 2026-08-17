package controllers

import (
	"strings"

	"tunorth-cpms-backend/internal/config"
	"tunorth-cpms-backend/internal/models"
	"tunorth-cpms-backend/internal/services"
	"tunorth-cpms-backend/internal/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuthController struct {
	db       *gorm.DB
	cfg      *config.Config
	telegram *services.TelegramService
}

func NewAuthController(db *gorm.DB, cfg *config.Config, tg *services.TelegramService) *AuthController {
	return &AuthController{db: db, cfg: cfg, telegram: tg}
}

type LoginRequest struct {
	Identifier string `json:"identifier"` // Email or StudentID
	Password   string `json:"password"`
}

func (ac *AuthController) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
		})
	}

	identifier := strings.TrimSpace(req.Identifier)
	if identifier == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Identifier and password are required",
		})
	}

	var user models.User
	query := ac.db.Preload("TeacherAssignments")
	if strings.Contains(identifier, "@") {
		query = query.Where("LOWER(email) = LOWER(?)", identifier)
	} else {
		query = query.Where("student_id = ? OR LOWER(email) = LOWER(?)", identifier, identifier)
	}

	if err := query.First(&user).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Invalid credentials or user not found",
		})
	}

	if !user.IsActive {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "Account is disabled. Please contact the administrator.",
		})
	}

	// Verify Password Hash
	if !utils.CheckPasswordHash(req.Password, user.PasswordHash) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Invalid credentials",
		})
	}

	accessToken, refreshToken, err := utils.GenerateTokens(&user, ac.cfg)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to generate authentication tokens",
		})
	}

	// Log activity
	ip := c.IP()
	userRoleStr := string(user.Role)
	services.LogActivity(ac.db, &user.ID, userRoleStr, "LOGIN", "User logged into system", ip)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Login successful",
		"data": fiber.Map{
			"access_token":  accessToken,
			"refresh_token": refreshToken,
			"user": fiber.Map{
				"id":         user.ID,
				"student_id": user.StudentID,
				"room":       user.Room,
				"email":      user.Email,
				"full_name":  user.FullName,
				"role":       user.Role,
				"is_active":  user.IsActive,
				"teacher_assignments": user.TeacherAssignments,
			},
		},
	})
}

func (ac *AuthController) GetProfile(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Unauthorized",
		})
	}

	var user models.User
	if err := ac.db.Preload("TeacherAssignments").Where("id = ?", userID).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "User not found",
		})
	}

	// If student, also retrieve group info
	var groupMember models.GroupMember
	var groupInfo *models.ProjectGroup = nil
	if user.Role == models.RoleStudent {
		if err := ac.db.Preload("Group").Preload("Group.Members.User").Preload("Group.Advisor").Where("user_id = ?", user.ID).First(&groupMember).Error; err == nil {
			groupInfo = groupMember.Group
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"user":         user,
			"group_info":   groupInfo,
			"is_leader":    groupMember.IsLeader,
		},
	})
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

func (ac *AuthController) ChangePassword(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Unauthorized",
		})
	}

	var req ChangePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
		})
	}

	if len(req.NewPassword) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "New password must be at least 6 characters long",
		})
	}

	var user models.User
	if err := ac.db.Where("id = ?", userID).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "User not found",
		})
	}

	if !utils.CheckPasswordHash(req.OldPassword, user.PasswordHash) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Incorrect current password",
		})
	}

	newHash, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to hash new password",
		})
	}

	if err := ac.db.Model(&user).Update("password_hash", newHash).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to update password",
		})
	}

	ip := c.IP()
	services.LogActivity(ac.db, &user.ID, string(user.Role), "CHANGE_PASSWORD", "User changed account password", ip)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Password changed successfully",
	})
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func (ac *AuthController) RefreshToken(c *fiber.Ctx) error {
	var req RefreshTokenRequest
	if err := c.BodyParser(&req); err != nil || req.RefreshToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Refresh token is required",
		})
	}

	claims, err := utils.ValidateToken(req.RefreshToken, ac.cfg.JWTRefreshSecret)
	if err != nil || claims.TokenType != "refresh" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Invalid or expired refresh token",
		})
	}

	var user models.User
	if err := ac.db.Where("id = ? AND is_active = true", claims.UserID).First(&user).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "User not found or disabled",
		})
	}

	newAccessToken, newRefreshToken, err := utils.GenerateTokens(&user, ac.cfg)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to generate tokens",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"access_token":  newAccessToken,
			"refresh_token": newRefreshToken,
		},
	})
}
