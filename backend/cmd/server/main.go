package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"tunorth-cpms-backend/internal/config"
	"tunorth-cpms-backend/internal/database"
	"tunorth-cpms-backend/internal/middleware"
	"tunorth-cpms-backend/internal/routes"

	"github.com/gofiber/fiber/v2"
)

func main() {
	// 1. Load Configurations
	cfg := config.LoadConfig()

	// 2. Ensure Upload Directories Exist
	if err := os.MkdirAll(cfg.UploadDir, os.ModePerm); err != nil {
		log.Fatalf("Failed to create base upload directory: %v", err)
	}

	// 3. Connect to Database & AutoMigrate
	db, err := database.ConnectDB(cfg)
	if err != nil {
		log.Printf("Warning: Database connection failed at startup: %v\n", err)
		log.Println("Server will still start, but database operations will fail until connected.")
	} else {
		if err := database.AutoMigrate(db); err != nil {
			log.Fatalf("Database migration failed: %v", err)
		}
	}

	// 4. Initialize Fiber App
	app := fiber.New(fiber.Config{
		AppName:      "TU-North CPMS Backend v1.0",
		BodyLimit:    25 * 1024 * 1024, // 25 MB Body Limit for File Uploads
		ServerHeader: "Fiber",
	})

	// 5. Mount Middlewares
	app.Use(middleware.SetupLogger())
	app.Use(middleware.SetupCORS())
	app.Use(middleware.SetupRecover())

	// 6. Setup Application Routes
	if db != nil {
		routes.SetupRoutes(app, db, cfg)
	}

	// 7. Graceful Shutdown Handler
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		log.Println("Gracefully shutting down CPMS server...")
		_ = app.Shutdown()
	}()

	// 8. Start HTTP Server
	serverAddr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("🚀 TU-North CPMS Server is running on port %s (Environment: %s)\n", cfg.Port, cfg.Environment)
	if err := app.Listen(serverAddr); err != nil {
		log.Printf("Server shut down: %v\n", err)
	}
}
