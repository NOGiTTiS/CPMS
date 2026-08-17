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

	fmt.Println("=== CHECKING GROUPS WITH '?' ===")
	var groups []models.ProjectGroup
	db.Where("project_name_th LIKE '%?%'").Find(&groups)
	fmt.Printf("Found %d groups with '?':\n", len(groups))
	for _, g := range groups {
		fmt.Printf("  ID: %s, Room: %v, Name: %s\n", g.ID, g.Room, g.ProjectNameTH)
	}

	fmt.Println("\n=== CHECKING STEPS WITH '?' ===")
	var steps []models.ProjectStep
	db.Where("step_name LIKE '%?%'").Find(&steps)
	fmt.Printf("Found %d steps with '?':\n", len(steps))
	for _, s := range steps {
		fmt.Printf("  ID: %s, Order: %d, Name: %s\n", s.ID, s.StepOrder, s.StepName)
	}

	fmt.Println("\n=== CHECKING USERS WITH '?' ===")
	var users []models.User
	db.Where("full_name LIKE '%?%'").Find(&users)
	fmt.Printf("Found %d users with '?':\n", len(users))
	for _, u := range users {
		fmt.Printf("  ID: %s, Email: %s, Name: %s\n", u.ID, u.Email, u.FullName)
	}
}
