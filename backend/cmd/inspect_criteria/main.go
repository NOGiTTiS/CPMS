package main

import (
	"fmt"
	"log"

	"tunorth-cpms-backend/internal/config"
	"tunorth-cpms-backend/internal/database"
	"tunorth-cpms-backend/internal/models"
)

func main() {
	cfg := config.LoadConfig()
	db, err := database.ConnectDB(cfg)
	if err != nil {
		log.Fatalf("❌ Connect failed: %v", err)
	}

	fmt.Println("=== CHECKING PRESENTATION CRITERIA ===")
	var criteria []models.PresentationCriteria
	db.Order("criteria_order ASC").Find(&criteria)
	for _, c := range criteria {
		desc := ""
		if c.Description != nil {
			desc = *c.Description
		}
		fmt.Printf("ID: %s | Order: %d | Label: %s | Desc: %s | MaxScore: %.2f\n", c.ID, c.CriteriaOrder, c.Label, desc, c.MaxScore)
	}
}
