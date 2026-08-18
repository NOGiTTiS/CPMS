package routes

import (
	"time"

	"tunorth-cpms-backend/internal/config"
	"tunorth-cpms-backend/internal/controllers"
	"tunorth-cpms-backend/internal/middleware"
	"tunorth-cpms-backend/internal/services"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func SetupRoutes(app *fiber.App, db *gorm.DB, cfg *config.Config) {
	// Initialize Services
	telegramService := services.NewTelegramService(db, cfg)

	// Initialize Controllers
	authCtrl := controllers.NewAuthController(db, cfg, telegramService)
	groupCtrl := controllers.NewGroupController(db, cfg, telegramService)
	stepSubmissionCtrl := controllers.NewStepSubmissionController(db, cfg, telegramService)
	presentationCtrl := controllers.NewPresentationController(db, cfg, telegramService)
	teacherCtrl := controllers.NewTeacherController(db, cfg, telegramService)
	adminCtrl := controllers.NewAdminController(db, cfg, telegramService)
	announcementCtrl := controllers.NewAnnouncementController(db, cfg, telegramService)

	// Global Health Check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":    "healthy",
			"app":       "TU-North CPMS Backend",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	})

	api := app.Group("/api")

	// ----------------------------------------------------
	// 1. AUTH ROUTES
	// ----------------------------------------------------
	authGroup := api.Group("/auth")
	authGroup.Post("/login", authCtrl.Login)
	authGroup.Post("/refresh", authCtrl.RefreshToken)

	// Protected Auth Routes
	authGroup.Use(middleware.AuthRequired(cfg))
	authGroup.Get("/me", authCtrl.GetProfile)
	authGroup.Post("/change-password", authCtrl.ChangePassword)

	// ----------------------------------------------------
	// 2. FILE DOWNLOAD / UPLOAD
	// ----------------------------------------------------
	filesGroup := api.Group("/files")
	filesGroup.Use(middleware.AuthRequired(cfg))
	filesGroup.Get("/download", stepSubmissionCtrl.DownloadFile)

	// ----------------------------------------------------
	// 3. ANNOUNCEMENTS & ACADEMIC YEARS
	// ----------------------------------------------------
	announcementGroup := api.Group("/announcements")
	announcementGroup.Use(middleware.AuthRequired(cfg))
	announcementGroup.Get("/", announcementCtrl.ListAnnouncements)

	academicYearsGroup := api.Group("/academic-years")
	academicYearsGroup.Use(middleware.AuthRequired(cfg))
	academicYearsGroup.Get("/active", adminCtrl.ListActiveAcademicYears)

	// ----------------------------------------------------
	// 4. PROJECT GROUPS
	// ----------------------------------------------------
	groupsGroup := api.Group("/groups")
	groupsGroup.Use(middleware.AuthRequired(cfg))
	groupsGroup.Post("/", groupCtrl.CreateGroup)
	groupsGroup.Get("/my-group", groupCtrl.GetMyGroup)
	groupsGroup.Get("/teachers", groupCtrl.ListTeachers)
	groupsGroup.Get("/search-students", groupCtrl.SearchAvailableStudents)
	groupsGroup.Get("/", groupCtrl.ListGroups)
	groupsGroup.Get("/:id", groupCtrl.GetGroupByID)
	groupsGroup.Put("/:id", groupCtrl.UpdateGroup)
	groupsGroup.Delete("/:id", groupCtrl.DissolveGroup)
	groupsGroup.Post("/:id/members", groupCtrl.AddMember)
	groupsGroup.Delete("/:id/members/:userId", groupCtrl.RemoveMember)
	groupsGroup.Post("/:id/leader/:userId", groupCtrl.SetGroupLeader)

	// ----------------------------------------------------
	// 5. PROJECT STEPS & SUBMISSIONS
	// ----------------------------------------------------
	stepsGroup := api.Group("/steps")
	stepsGroup.Use(middleware.AuthRequired(cfg))
	stepsGroup.Get("/", stepSubmissionCtrl.ListSteps)
	stepsGroup.Get("/:id", stepSubmissionCtrl.GetStepByID)
	stepsGroup.Post("/", middleware.AdminGuard(), stepSubmissionCtrl.CreateStep)
	stepsGroup.Put("/:id", middleware.AdminGuard(), stepSubmissionCtrl.UpdateStep)
	stepsGroup.Delete("/:id", middleware.AdminGuard(), stepSubmissionCtrl.DeleteStep)
	stepsGroup.Post("/upload-asset", middleware.AdminGuard(), stepSubmissionCtrl.UploadStepAsset)

	submissionsGroup := api.Group("/submissions")
	submissionsGroup.Use(middleware.AuthRequired(cfg))
	submissionsGroup.Post("/", middleware.StudentGuard(), stepSubmissionCtrl.SubmitWork)
	submissionsGroup.Get("/group/:groupId", stepSubmissionCtrl.GetGroupSubmissions)
	submissionsGroup.Put("/:id/review", middleware.TeacherGuard(), stepSubmissionCtrl.ReviewSubmission)

	// ----------------------------------------------------
	// 6. PRESENTATION & RUBRIC EVALUATION
	// ----------------------------------------------------
	presGroup := api.Group("/presentation")
	presGroup.Use(middleware.AuthRequired(cfg))
	presGroup.Get("/slots", presentationCtrl.ListSlots)
	presGroup.Post("/slots", middleware.TeacherGuard(), presentationCtrl.CreateSlot)
	presGroup.Delete("/slots/:id", middleware.AdminGuard(), presentationCtrl.DeleteSlot)
	presGroup.Post("/bookings", presentationCtrl.BookSlot)
	presGroup.Delete("/bookings/:bookingId", presentationCtrl.CancelBooking)
	presGroup.Get("/criteria", presentationCtrl.ListCriteria)
	presGroup.Post("/criteria", middleware.AdminGuard(), presentationCtrl.CreateCriteria)
	presGroup.Put("/criteria/reorder", middleware.AdminGuard(), presentationCtrl.ReorderCriteria)
	presGroup.Put("/criteria/:id", middleware.AdminGuard(), presentationCtrl.UpdateCriteria)
	presGroup.Delete("/criteria/:id", middleware.AdminGuard(), presentationCtrl.DeleteCriteria)
	presGroup.Post("/scores", middleware.TeacherGuard(), presentationCtrl.SubmitScore)
	presGroup.Get("/scores/export", middleware.TeacherGuard(), presentationCtrl.ExportScoresCSV)

	// ----------------------------------------------------
	// 7. TEACHER PORTAL ROUTES
	// ----------------------------------------------------
	teacherGroup := api.Group("/teacher")
	teacherGroup.Use(middleware.AuthRequired(cfg), middleware.TeacherGuard())
	teacherGroup.Get("/assigned-rooms", teacherCtrl.GetAssignedRooms)
	teacherGroup.Get("/queue", teacherCtrl.GetPendingSubmissionsQueue)
	teacherGroup.Get("/progress-matrix", teacherCtrl.GetClassProgressMatrix)
	teacherGroup.Get("/gradesheet/export", teacherCtrl.ExportGradeSheetCSV)

	// ----------------------------------------------------
	// 8. ADMIN PORTAL ROUTES
	// ----------------------------------------------------
	adminGroup := api.Group("/admin")
	adminGroup.Use(middleware.AuthRequired(cfg), middleware.AdminGuard())
	adminGroup.Get("/users", adminCtrl.ListUsers)
	adminGroup.Post("/users", adminCtrl.CreateUser)
	adminGroup.Put("/users/:id", adminCtrl.UpdateUser)
	adminGroup.Delete("/users/:id", adminCtrl.DeleteUser)
	adminGroup.Post("/users/:id/reset-password", adminCtrl.ResetUserPassword)
	adminGroup.Post("/users/import-csv", adminCtrl.ImportUsersCSV)
	adminGroup.Post("/teacher-assignments", adminCtrl.AssignRoomToTeacher)
	adminGroup.Delete("/teacher-assignments/:id", adminCtrl.RemoveTeacherAssignment)
	adminGroup.Get("/academic-years", adminCtrl.ListAcademicYears)
	adminGroup.Post("/academic-years", adminCtrl.CreateAcademicYear)
	adminGroup.Put("/academic-years/:id", adminCtrl.UpdateAcademicYear)
	adminGroup.Post("/academic-years/:id/set-current", adminCtrl.SetCurrentAcademicYear)
	adminGroup.Delete("/academic-years/:id", adminCtrl.DeleteAcademicYear)
	adminGroup.Get("/settings", adminCtrl.GetSettings)
	adminGroup.Put("/settings", adminCtrl.UpdateSettings)
	adminGroup.Post("/settings/test-telegram", adminCtrl.TestTelegram)
	adminGroup.Get("/logs", adminCtrl.ListActivityLogs)
	adminGroup.Post("/announcements", announcementCtrl.CreateAnnouncement)
	adminGroup.Delete("/announcements/:id", announcementCtrl.DeleteAnnouncement)
}
