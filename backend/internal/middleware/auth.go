package middleware

import (
	"strings"

	"tunorth-cpms-backend/internal/config"
	"tunorth-cpms-backend/internal/models"
	"tunorth-cpms-backend/internal/utils"

	"github.com/gofiber/fiber/v2"
)

func AuthRequired(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var tokenString string

		// 1. Check Authorization header
		authHeader := c.Get("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
				tokenString = parts[1]
			}
		}

		// 2. Check query parameter (e.g. for browser file downloads/views)
		if tokenString == "" {
			tokenString = c.Query("token")
		}

		// 3. Check cookies
		if tokenString == "" {
			tokenString = c.Cookies("cpms_token")
			if tokenString == "" {
				tokenString = c.Cookies("token")
			}
		}

		if tokenString == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"message": "Missing authorization token",
			})
		}

		claims, err := utils.ValidateToken(tokenString, cfg.JWTSecret)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"message": "Invalid or expired authorization token",
			})
		}

		if claims.TokenType != "access" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"message": "Invalid token type, access token required",
			})
		}

		// Set user in locals
		c.Locals("user", claims)
		c.Locals("userID", claims.UserID)
		c.Locals("userRole", claims.Role)
		c.Locals("userEmail", claims.Email)

		return c.Next()
	}
}

func AdminGuard() fiber.Handler {
	return func(c *fiber.Ctx) error {
		role, ok := c.Locals("userRole").(models.UserRole)
		if !ok || role != models.RoleAdmin {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"message": "Access denied: Administrator privilege required",
			})
		}
		return c.Next()
	}
}

func TeacherGuard() fiber.Handler {
	return func(c *fiber.Ctx) error {
		role, ok := c.Locals("userRole").(models.UserRole)
		if !ok || (role != models.RoleTeacher && role != models.RoleAdmin) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"message": "Access denied: Teacher or Administrator privilege required",
			})
		}
		return c.Next()
	}
}

func StudentGuard() fiber.Handler {
	return func(c *fiber.Ctx) error {
		role, ok := c.Locals("userRole").(models.UserRole)
		if !ok || (role != models.RoleStudent && role != models.RoleAdmin) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"message": "Access denied: Student privilege required",
			})
		}
		return c.Next()
	}
}
