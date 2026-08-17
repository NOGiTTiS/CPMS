package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                string
	Environment         string
	DBHost              string
	DBPort              string
	DBUser              string
	DBPassword          string
	DBName              string
	DBSSLMode           string
	JWTSecret           string
	JWTRefreshSecret    string
	JWTAccessExpiryHrs  int
	JWTRefreshExpiryDys int
	UploadDir           string
	MaxUploadSizeMB     int64
	TelegramBotToken    string
	TelegramChatID      string
}

var AppConfig *Config

func LoadConfig() *Config {
	// Try loading .env if it exists
	if err := godotenv.Load(); err != nil {
		log.Println("Note: .env file not found, reading from environment variables")
	}

	AppConfig = &Config{
		Port:                getEnv("PORT", "8009"),
		Environment:         getEnv("ENVIRONMENT", "development"),
		DBHost:              getEnv("DB_HOST", "127.0.0.1"),
		DBPort:              getEnv("DB_PORT", "5432"),
		DBUser:              getEnv("DB_USER", "postgres"),
		DBPassword:          getEnv("DB_PASSWORD", "postgres"),
		DBName:              getEnv("DB_NAME", "tunorth_cpms_db"),
		DBSSLMode:           getEnv("DB_SSLMODE", "disable"),
		JWTSecret:           getEnv("JWT_SECRET", "tunorth-cpms-jwt-access-secret-2568"),
		JWTRefreshSecret:    getEnv("JWT_REFRESH_SECRET", "tunorth-cpms-jwt-refresh-secret-2568"),
		JWTAccessExpiryHrs:  getEnvAsInt("JWT_ACCESS_EXPIRY_HOURS", 2),
		JWTRefreshExpiryDys: getEnvAsInt("JWT_REFRESH_EXPIRY_DAYS", 7),
		UploadDir:           getEnv("UPLOAD_DIR", "./uploads"),
		MaxUploadSizeMB:     int64(getEnvAsInt("MAX_UPLOAD_SIZE_MB", 20)),
		TelegramBotToken:    getEnv("TELEGRAM_BOT_TOKEN", ""),
		TelegramChatID:      getEnv("TELEGRAM_CHAT_ID", ""),
	}

	return AppConfig
}

func getEnv(key, defaultVal string) string {
	if val, exists := os.LookupEnv(key); exists && val != "" {
		return val
	}
	return defaultVal
}

func getEnvAsInt(key string, defaultVal int) int {
	if val, exists := os.LookupEnv(key); exists && val != "" {
		if intVal, err := strconv.Atoi(val); err == nil {
			return intVal
		}
	}
	return defaultVal
}
