package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"tunorth-cpms-backend/internal/config"
	"tunorth-cpms-backend/internal/models"

	"gorm.io/gorm"
)

type TelegramService struct {
	db  *gorm.DB
	cfg *config.Config
}

var telegramClient = &http.Client{Timeout: 10 * time.Second}

func NewTelegramService(db *gorm.DB, cfg *config.Config) *TelegramService {
	return &TelegramService{db: db, cfg: cfg}
}

func (s *TelegramService) GetTelegramCredentials() (token, chatID string, enabled bool) {
	// Check database system_settings first
	var enabledSetting, tokenSetting, chatSetting models.SystemSetting
	_ = s.db.Where("key = ?", "telegram_bot_enabled").First(&enabledSetting).Error
	_ = s.db.Where("key = ?", "telegram_bot_token").First(&tokenSetting).Error
	_ = s.db.Where("key = ?", "telegram_chat_id").First(&chatSetting).Error

	enabled = enabledSetting.Value == "true" || enabledSetting.Value == "1"
	token = tokenSetting.Value
	chatID = chatSetting.Value

	// Fallback to environment variables if empty
	if token == "" {
		token = s.cfg.TelegramBotToken
	}
	if chatID == "" {
		chatID = s.cfg.TelegramChatID
	}
	if !enabled && token != "" && chatID != "" {
		enabled = true
	}

	return token, chatID, enabled
}

func (s *TelegramService) SendAsync(message string) {
	go func(msg string) {
		token, chatID, enabled := s.GetTelegramCredentials()
		if !enabled || token == "" || chatID == "" {
			return
		}

		err := SendTelegramRaw(token, chatID, msg)
		if err != nil {
			log.Printf("[Telegram Notification Error]: %v\n", err)
		}
	}(message)
}

func SendTelegramRaw(token, chatID, message string) error {
	if token == "" || chatID == "" {
		return fmt.Errorf("bot token or chat ID is empty")
	}

	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", token)
	payload := map[string]string{
		"chat_id":    chatID,
		"text":       message,
		"parse_mode": "HTML",
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	resp, err := telegramClient.Post(url, "application/json", bytes.NewBuffer(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("telegram API returned status code %d", resp.StatusCode)
	}

	return nil
}
