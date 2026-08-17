package main

import (
	"bufio"
	"bytes"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"tunorth-cpms-backend/internal/config"
	"tunorth-cpms-backend/internal/database"
	"tunorth-cpms-backend/internal/models"
	"tunorth-cpms-backend/internal/utils"

	"github.com/google/uuid"
)

func strPtr(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" || s == "NULL" || s == "null" {
		return nil
	}
	return &s
}

func main() {
	log.Println("==================================================")
	log.Println("🚀 Starting Legacy CPMS UTF-8 Database Migration")
	log.Println("==================================================")

	cfg := config.LoadConfig()
	db, err := database.ConnectDB(cfg)
	if err != nil {
		log.Fatalf("❌ Database connection failed: %v", err)
	}

	log.Println("📦 Running AutoMigrate...")
	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("❌ AutoMigrate failed: %v", err)
	}

	sqlPath := `D:\TUNorth\apps\cpms\old_system\tunorth-cpms\backup_cpms_db.sql`
	if _, err := os.Stat(sqlPath); os.IsNotExist(err) {
		sqlPath = `../old_system/tunorth-cpms/backup_cpms_db.sql`
	}

	fileBytes, err := os.ReadFile(sqlPath)
	if err != nil {
		log.Fatalf("❌ Failed to read backup SQL file: %v", err)
	}

	// Map old integer IDs to new UUIDs
	userIdMap := make(map[int]uuid.UUID)
	groupIdMap := make(map[int]uuid.UUID)
	stepIdMap := make(map[int]uuid.UUID)

	// ==========================================
	// PASS 1: Users, Project Steps, Project Groups
	// ==========================================
	log.Println("🔄 PASS 1: Migrating Users, Steps, and Project Groups...")
	scanner := bufio.NewScanner(bytes.NewReader(fileBytes))
	buf := make([]byte, 1024*1024)
	scanner.Buffer(buf, 10*1024*1024)

	var currentTable string
	userCount := 0
	groupCount := 0
	stepCount := 0

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "--") || strings.HasPrefix(line, "/*") {
			continue
		}

		if strings.HasPrefix(line, "INSERT INTO `") {
			parts := strings.Split(line, "`")
			if len(parts) >= 2 {
				currentTable = parts[1]
			}
		}

		tuples := extractTuplesFromLine(line)
		for _, tupleStr := range tuples {
			fields := parseSqlFields(tupleStr)

			switch currentTable {
			case "users":
				if len(fields) >= 7 {
					oldId, _ := strconv.Atoi(fields[0])
					studentId := fields[1]
					room := fields[2]
					email := strings.ToLower(fields[3])
					passwordHash := fields[4]
					fullName := fields[5]
					roleStr := strings.ToUpper(fields[6])

					var role models.UserRole
					switch roleStr {
					case "ADMIN":
						role = models.RoleAdmin
					case "TEACHER":
						role = models.RoleTeacher
					default:
						role = models.RoleStudent
					}

					if !strings.HasPrefix(passwordHash, "$2y$") && !strings.HasPrefix(passwordHash, "$2a$") {
						passwordHash, _ = utils.HashPassword("student1234")
					} else if strings.HasPrefix(passwordHash, "$2y$") {
						passwordHash = "$2a$" + passwordHash[4:]
					}

					var user models.User
					if err := db.Where("LOWER(email) = ?", email).First(&user).Error; err == nil {
						user.FullName = fullName
						user.StudentID = strPtr(studentId)
						user.Room = strPtr(room)
						user.Role = role
						user.PasswordHash = passwordHash
						user.IsActive = true
						db.Save(&user)
						userIdMap[oldId] = user.ID
					} else {
						newUser := models.User{
							FullName:     fullName,
							Email:        email,
							StudentID:    strPtr(studentId),
							Room:         strPtr(room),
							Role:         role,
							PasswordHash: passwordHash,
							IsActive:     true,
						}
						db.Create(&newUser)
						userIdMap[oldId] = newUser.ID
					}
					userCount++
				}

			case "project_steps":
				if len(fields) >= 3 {
					oldStepId, _ := strconv.Atoi(fields[0])
					stepName := fields[1]
					stepOrder, _ := strconv.Atoi(fields[2])
					var fileForm, fileExample *string
					if len(fields) >= 4 {
						fileForm = strPtr(fields[3])
					}
					if len(fields) >= 5 {
						fileExample = strPtr(fields[4])
					}

					maxScore := 10.0
					if strings.Contains(stepName, "5 คะแนน") {
						maxScore = 5.0
					} else if strings.Contains(stepName, "20 คะแนน") {
						maxScore = 20.0
					}

					var step models.ProjectStep
					if err := db.Where("step_order = ?", stepOrder).First(&step).Error; err == nil {
						step.StepName = stepName
						step.MaxScore = maxScore
						step.FileFormPath = fileForm
						step.FileExamplePath = fileExample
						step.IsActive = true
						db.Save(&step)
						stepIdMap[oldStepId] = step.ID
					} else {
						newStep := models.ProjectStep{
							StepName:        stepName,
							StepOrder:       stepOrder,
							MaxScore:        maxScore,
							FileFormPath:    fileForm,
							FileExamplePath: fileExample,
							IsActive:        true,
						}
						db.Create(&newStep)
						stepIdMap[oldStepId] = newStep.ID
					}
					stepCount++
				}

			case "project_groups":
				if len(fields) >= 7 {
					oldGroupId, _ := strconv.Atoi(fields[0])
					nameTH := fields[1]
					nameEN := fields[2]
					advisorName := fields[4]
					room := fields[5]
					academicYear := fields[7]
					if academicYear == "" || academicYear == "NULL" {
						academicYear = "2568"
					}

					var group models.ProjectGroup
					if err := db.Where("project_name_th = ?", nameTH).First(&group).Error; err == nil {
						group.ProjectNameTH = nameTH
						group.ProjectNameEN = nameEN
						group.AdvisorName = strPtr(advisorName)
						group.Room = strPtr(room)
						group.AcademicYear = academicYear
						db.Save(&group)
						groupIdMap[oldGroupId] = group.ID
					} else {
						newGroup := models.ProjectGroup{
							ProjectNameTH: nameTH,
							ProjectNameEN: nameEN,
							AdvisorName:   strPtr(advisorName),
							Room:          strPtr(room),
							AcademicYear:  academicYear,
						}
						db.Create(&newGroup)
						groupIdMap[oldGroupId] = newGroup.ID
					}
					groupCount++
				}
			}
		}

		if strings.HasSuffix(line, ";") {
			currentTable = ""
		}
	}

	// ==========================================
	// PASS 2: Group Members, Submissions, Teacher Assignments
	// ==========================================
	log.Println("🔄 PASS 2: Migrating Group Members, Submissions, Teacher Assignments...")
	scanner2 := bufio.NewScanner(bytes.NewReader(fileBytes))
	scanner2.Buffer(buf, 10*1024*1024)

	currentTable = ""
	memberCount := 0
	subCount := 0

	for scanner2.Scan() {
		line := strings.TrimSpace(scanner2.Text())
		if line == "" || strings.HasPrefix(line, "--") || strings.HasPrefix(line, "/*") {
			continue
		}

		if strings.HasPrefix(line, "INSERT INTO `") {
			parts := strings.Split(line, "`")
			if len(parts) >= 2 {
				currentTable = parts[1]
			}
		}

		tuples := extractTuplesFromLine(line)
		for _, tupleStr := range tuples {
			fields := parseSqlFields(tupleStr)

			switch currentTable {
			case "teacher_assignments":
				if len(fields) >= 3 {
					oldTeacherId, _ := strconv.Atoi(fields[1])
					room := fields[2]
					if teacherUUID, exists := userIdMap[oldTeacherId]; exists {
						var existing models.TeacherAssignment
						if err := db.Where("teacher_id = ? AND room = ?", teacherUUID, room).First(&existing).Error; err != nil {
							db.Create(&models.TeacherAssignment{
								TeacherID: teacherUUID,
								Room:      room,
							})
						}
					}
				}

			case "group_members":
				if len(fields) >= 2 {
					oldGroupId, _ := strconv.Atoi(fields[0])
					oldUserId, _ := strconv.Atoi(fields[1])
					isLeader := false
					if len(fields) >= 3 {
						isLeader = fields[2] == "1" || strings.ToLower(fields[2]) == "true"
					}

					groupUUID, gOk := groupIdMap[oldGroupId]
					userUUID, uOk := userIdMap[oldUserId]

					if gOk && uOk {
						var existing models.GroupMember
						if err := db.Where("group_id = ? AND user_id = ?", groupUUID, userUUID).First(&existing).Error; err != nil {
							db.Create(&models.GroupMember{
								GroupID:  groupUUID,
								UserID:   userUUID,
								IsLeader: isLeader,
								JoinedAt: time.Now(),
							})
						} else {
							existing.IsLeader = isLeader
							db.Save(&existing)
						}
						memberCount++
					}
				}

			case "submissions":
				if len(fields) >= 7 {
					oldGroupId, _ := strconv.Atoi(fields[1])
					oldUserId, _ := strconv.Atoi(fields[2])
					oldStepId, _ := strconv.Atoi(fields[3])
					filePath := fields[4]
					comment := fields[5]
					statusStr := strings.ToUpper(fields[6])

					var score *float64
					if len(fields) >= 9 && fields[8] != "" && fields[8] != "NULL" {
						if sc, err := strconv.ParseFloat(fields[8], 64); err == nil {
							score = &sc
						}
					}

					groupUUID, gOk := groupIdMap[oldGroupId]
					userUUID, uOk := userIdMap[oldUserId]
					stepUUID, sOk := stepIdMap[oldStepId]

					if gOk && uOk && sOk {
						subType := models.SubmissionTypeFile
						if strings.HasPrefix(filePath, "http://") || strings.HasPrefix(filePath, "https://") {
							subType = models.SubmissionTypeLink
						}

						var status models.SubmissionStatus
						switch statusStr {
						case "APPROVED":
							status = models.SubmissionStatusApproved
						case "REJECTED":
							status = models.SubmissionStatusRejected
						default:
							status = models.SubmissionStatusPending
						}

						var existing models.Submission
						if err := db.Where("group_id = ? AND step_id = ?", groupUUID, stepUUID).First(&existing).Error; err != nil {
							db.Create(&models.Submission{
								GroupID:        groupUUID,
								StepID:         stepUUID,
								SubmittedBy:    &userUUID,
								SubmissionType: subType,
								FilePath:       filePath,
								Comment:        strPtr(comment),
								Status:         status,
								Score:          score,
								RevisionNumber: 1,
								SubmittedAt:    time.Now(),
							})
						} else {
							existing.FilePath = filePath
							existing.Comment = strPtr(comment)
							existing.Status = status
							existing.Score = score
							db.Save(&existing)
						}
						subCount++
					}
				}
			}
		}

		if strings.HasSuffix(line, ";") {
			currentTable = ""
		}
	}

	log.Println("==================================================")
	log.Printf("🎉 Migration Summary:\n")
	log.Printf("   👤 Users Restored: %d\n", userCount)
	log.Printf("   📋 Project Steps Restored: %d\n", stepCount)
	log.Printf("   👥 Project Groups Restored: %d\n", groupCount)
	log.Printf("   🤝 Group Members Restored: %d\n", memberCount)
	log.Printf("   📝 Submissions Restored: %d\n", subCount)
	log.Println("==================================================")
}

// extractTuplesFromLine finds (1, 'val', 2), (2, 'val2', 3)
func extractTuplesFromLine(line string) []string {
	var tuples []string
	var current strings.Builder
	inQuote := false
	inTuple := false
	escape := false

	reader := bufio.NewReader(strings.NewReader(line))
	for {
		r, _, err := reader.ReadRune()
		if err != nil {
			break
		}

		if escape {
			if inTuple {
				current.WriteRune(r)
			}
			escape = false
			continue
		}

		if r == '\\' {
			if inTuple {
				current.WriteRune(r)
			}
			escape = true
			continue
		}

		if r == '\'' {
			inQuote = !inQuote
			if inTuple {
				current.WriteRune(r)
			}
			continue
		}

		if !inQuote {
			if r == '(' && !inTuple {
				inTuple = true
				current.Reset()
				continue
			}
			if r == ')' && inTuple {
				inTuple = false
				tuples = append(tuples, current.String())
				current.Reset()
				continue
			}
		}

		if inTuple {
			current.WriteRune(r)
		}
	}

	return tuples
}

// parseSqlFields parses tuple content: 1, '29267', '6.10', 'นายบรรณวัชร  เพิ่มทอง'
func parseSqlFields(raw string) []string {
	var result []string
	var current strings.Builder
	inQuote := false
	escape := false

	reader := bufio.NewReader(strings.NewReader(raw))
	for {
		r, _, err := reader.ReadRune()
		if err != nil {
			break
		}

		if escape {
			current.WriteRune(r)
			escape = false
			continue
		}

		if r == '\\' {
			escape = true
			continue
		}

		if r == '\'' {
			inQuote = !inQuote
			continue
		}

		if r == ',' && !inQuote {
			val := strings.TrimSpace(current.String())
			if val == "NULL" || val == "null" {
				val = ""
			}
			result = append(result, val)
			current.Reset()
			continue
		}

		current.WriteRune(r)
	}

	val := strings.TrimSpace(current.String())
	if val == "NULL" || val == "null" {
		val = ""
	}
	result = append(result, val)
	return result
}
