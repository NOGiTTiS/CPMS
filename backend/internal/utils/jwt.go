package utils

import (
	"errors"
	"time"

	"tunorth-cpms-backend/internal/config"
	"tunorth-cpms-backend/internal/models"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type JWTClaims struct {
	UserID    uuid.UUID       `json:"user_id"`
	Email     string          `json:"email"`
	FullName  string          `json:"full_name"`
	Role      models.UserRole `json:"role"`
	StudentID *string         `json:"student_id,omitempty"`
	Room      *string         `json:"room,omitempty"`
	TokenType string          `json:"token_type"` // access | refresh
	jwt.RegisteredClaims
}

func GenerateTokens(user *models.User, cfg *config.Config) (string, string, error) {
	now := time.Now()

	// 1. Access Token
	accessClaims := JWTClaims{
		UserID:    user.ID,
		Email:      user.Email,
		FullName:  user.FullName,
		Role:      user.Role,
		StudentID: user.StudentID,
		Room:      user.Room,
		TokenType: "access",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(cfg.JWTAccessExpiryHrs) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Subject:   user.ID.String(),
			Issuer:    "tunorth-cpms",
		},
	}
	accessTokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessToken, err := accessTokenObj.SignedString([]byte(cfg.JWTSecret))
	if err != nil {
		return "", "", err
	}

	// 2. Refresh Token
	refreshClaims := JWTClaims{
		UserID:    user.ID,
		Email:      user.Email,
		Role:      user.Role,
		TokenType: "refresh",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(cfg.JWTRefreshExpiryDys) * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Subject:   user.ID.String(),
			Issuer:    "tunorth-cpms",
		},
	}
	refreshTokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshToken, err := refreshTokenObj.SignedString([]byte(cfg.JWTRefreshSecret))
	if err != nil {
		return "", "", err
	}

	return accessToken, refreshToken, nil
}

func ValidateToken(tokenString string, secret string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}
