package controllers

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"sort"
	"strings"
	"time"

	"tunorth-cpms-backend/internal/config"
	"tunorth-cpms-backend/internal/database"
	"tunorth-cpms-backend/internal/models"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type ExportController struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewExportController(db *gorm.DB, cfg *config.Config) *ExportController {
	return &ExportController{db: db, cfg: cfg}
}

// sanitizeSheetName ensures sheet name is valid for Excel (max 31 runes, no invalid characters)
func sanitizeSheetName(name string, existingNames map[string]bool) string {
	replacer := strings.NewReplacer(
		"\\", "_",
		"/", "_",
		"?", "_",
		"*", "_",
		"[", "_",
		"]", "_",
		":", "_",
	)
	cleaned := strings.TrimSpace(replacer.Replace(name))
	if cleaned == "" {
		cleaned = "Sheet"
	}

	runes := []rune(cleaned)
	if len(runes) > 28 {
		cleaned = string(runes[:28])
	}

	candidate := cleaned
	counter := 2
	for existingNames[strings.ToLower(candidate)] {
		candidate = fmt.Sprintf("%s_%d", cleaned, counter)
		counter++
	}
	existingNames[strings.ToLower(candidate)] = true
	return candidate
}

// GroupScoreExportData holds calculated score data for a group
type GroupScoreExportData struct {
	Group                  models.ProjectGroup   `json:"group"`
	Room                   string                `json:"room"`
	AdvisorName            string                `json:"advisor_name"`
	LeaderName             string                `json:"leader_name"`
	LeaderUser             *models.User          `json:"leader_user,omitempty"`
	MemberNames            []string              `json:"member_names"`
	Members                []models.GroupMember  `json:"members"`
	StepScores             []float64             `json:"step_scores"`
	StepGraded             []bool                `json:"step_graded"`
	GradedStepCount        int                   `json:"graded_step_count"`
	AccumulatedStepScore   float64               `json:"accumulated_step_score"` // คะแนนงาน (เต็ม 60)
	MidtermScore           float64               `json:"midterm_score"`          // สอบกลางภาค (เต็ม 20)
	CriteriaScores         []float64             `json:"criteria_scores"`
	TotalPresentationScore float64               `json:"total_presentation_score"` // คะแนนดิบนำเสนอ
	PresentationScore20    float64               `json:"presentation_score_20"`    // คะแนนนำเสนอ (เต็ม 20)
	EvaluatorCount         int                   `json:"evaluator_count"`
	TotalScore             float64               `json:"total_score"` // คะแนนรวมสุทธิ (เต็ม 100)
	GradingStatus          string                `json:"grading_status"`
}

// loadScoreData fetches all necessary entities and computes score breakdowns
func (ec *ExportController) loadScoreData(academicYear, roomFilter string) (
	steps []models.ProjectStep,
	criteria []models.PresentationCriteria,
	dataList []GroupScoreExportData,
	roomDataMap map[string][]GroupScoreExportData,
	uniqueRooms []string,
	err error,
) {
	// 1. Fetch active steps
	if err = ec.db.Where("is_active = true").Order("step_order ASC").Find(&steps).Error; err != nil {
		return
	}

	// 2. Fetch active presentation criteria
	if err = ec.db.Where("is_active = true").Order("criteria_order ASC").Find(&criteria).Error; err != nil {
		return
	}

	totalCriteriaMaxScore := 0.0
	for _, cr := range criteria {
		totalCriteriaMaxScore += cr.MaxScore
	}

	// 3. Fetch groups matching academic year and room
	query := ec.db.Model(&models.ProjectGroup{}).
		Preload("Advisor").
		Preload("Members.User").
		Preload("Submissions").
		Preload("Booking.Slot").
		Preload("Booking.Scores.Scorer").
		Where("academic_year = ?", academicYear)

	if roomFilter != "" && roomFilter != "all" {
		query = query.Where("room = ?", roomFilter)
	}

	var groups []models.ProjectGroup
	if err = query.Order("room ASC, project_name_th ASC").Find(&groups).Error; err != nil {
		return
	}

	roomDataMap = make(map[string][]GroupScoreExportData)
	roomSet := make(map[string]bool)

	for _, g := range groups {
		gRoom := "-"
		if g.Room != nil && strings.TrimSpace(*g.Room) != "" {
			gRoom = strings.TrimSpace(*g.Room)
		}

		advisor := "-"
		if g.AdvisorName != nil && strings.TrimSpace(*g.AdvisorName) != "" {
			advisor = strings.TrimSpace(*g.AdvisorName)
		} else if g.Advisor != nil {
			advisor = g.Advisor.FullName
		}

		var leaderUser *models.User
		leaderName := "-"
		var memberNames []string

		for _, m := range g.Members {
			if m.User != nil {
				roleLabel := ""
				if m.IsLeader {
					roleLabel = " (หัวหน้า)"
					leaderUser = m.User
					leaderName = m.User.FullName
				}
				memberNames = append(memberNames, fmt.Sprintf("%s%s", m.User.FullName, roleLabel))
			}
		}

		if leaderName == "-" && len(g.Members) > 0 && g.Members[0].User != nil {
			leaderName = g.Members[0].User.FullName
			leaderUser = g.Members[0].User
		}

		// Calculate step submission scores
		subMap := make(map[uuid.UUID]models.Submission)
		for _, s := range g.Submissions {
			subMap[s.StepID] = s
		}

		stepScores := make([]float64, len(steps))
		stepGraded := make([]bool, len(steps))
		gradedCount := 0
		accumulatedStep := 0.0

		for i, st := range steps {
			if sub, exists := subMap[st.ID]; exists {
				if sub.Status == models.SubmissionStatusApproved && sub.Score != nil {
					scoreVal := *sub.Score
					stepScores[i] = scoreVal
					stepGraded[i] = true
					gradedCount++
					accumulatedStep += scoreVal
				}
			}
		}

		// Calculate presentation defense scores (Rubrics)
		critScores := make([]float64, len(criteria))
		rawPresScore := 0.0
		evaluatorCount := 0

		if g.Booking != nil && len(g.Booking.Scores) > 0 {
			evaluatorCount = len(g.Booking.Scores)
			criteriaSums := make(map[string]float64)
			criteriaCounts := make(map[string]int)

			for _, sc := range g.Booking.Scores {
				if sc.CriteriaData != "" && sc.CriteriaData != "{}" {
					var cMap map[string]float64
					if jsonErr := json.Unmarshal([]byte(sc.CriteriaData), &cMap); jsonErr == nil {
						for cIDStr, val := range cMap {
							criteriaSums[cIDStr] += val
							criteriaCounts[cIDStr]++
						}
					}
				}
			}

			for cIdx, crit := range criteria {
				cIDStr := crit.ID.String()
				if count, ok := criteriaCounts[cIDStr]; ok && count > 0 {
					avg := criteriaSums[cIDStr] / float64(count)
					critScores[cIdx] = avg
					rawPresScore += avg
				}
			}
		}

		// Calculate presentation score scaled to 20 points (ปัดเศษเป็นจำนวนเต็มไม่มีทศนิยม)
		pres20 := 0.0
		if totalCriteriaMaxScore > 0 {
			pres20 = math.Round((rawPresScore / totalCriteriaMaxScore) * 20.0)
		}

		// Midterm external exam score (default 0.00, filled by teachers)
		midterm := 0.0

		// Total score = Work (60) + Midterm (20) + Presentation (20)
		totalNetScore := accumulatedStep + midterm + pres20

		statusText := fmt.Sprintf("ตรวจแล้ว (%d/%d)", gradedCount, len(steps))
		if len(steps) > 0 && gradedCount == len(steps) {
			if len(criteria) > 0 {
				if evaluatorCount > 0 {
					statusText = "ตรวจครบแล้ว"
				} else {
					statusText = fmt.Sprintf("ผ่านขั้นตอนครบ (%d/%d) รอสอบ", gradedCount, len(steps))
				}
			} else {
				statusText = "ตรวจครบแล้ว"
			}
		}

		item := GroupScoreExportData{
			Group:                  g,
			Room:                   gRoom,
			AdvisorName:            advisor,
			LeaderName:             leaderName,
			LeaderUser:             leaderUser,
			MemberNames:            memberNames,
			Members:                g.Members,
			StepScores:             stepScores,
			StepGraded:             stepGraded,
			GradedStepCount:        gradedCount,
			AccumulatedStepScore:   accumulatedStep,
			MidtermScore:           midterm,
			CriteriaScores:         critScores,
			TotalPresentationScore: rawPresScore,
			PresentationScore20:    pres20,
			EvaluatorCount:         evaluatorCount,
			TotalScore:             totalNetScore,
			GradingStatus:          statusText,
		}

		dataList = append(dataList, item)
		roomDataMap[gRoom] = append(roomDataMap[gRoom], item)
		if gRoom != "-" {
			roomSet[gRoom] = true
		}
	}

	for r := range roomSet {
		uniqueRooms = append(uniqueRooms, r)
	}
	sort.Strings(uniqueRooms)

	return
}

// ExportScoresExcel exports comprehensive scores to Excel (.xlsx) styled matching GPMS
func (ec *ExportController) ExportScoresExcel(c *fiber.Ctx) error {
	academicYear := strings.TrimSpace(c.Query("academic_year"))
	if academicYear == "" {
		academicYear = database.GetCurrentAcademicYear(ec.db)
	}
	roomFilter := strings.TrimSpace(c.Query("room"))
	exportType := strings.ToLower(strings.TrimSpace(c.Query("type", "group")))
	if exportType != "student" {
		exportType = "group"
	}

	steps, criteria, dataList, roomDataMap, uniqueRooms, err := ec.loadScoreData(academicYear, roomFilter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to load score data: " + err.Error(),
		})
	}

	// 1. Initialize Excel File
	f := excelize.NewFile()
	defer func() {
		if closeErr := f.Close(); closeErr != nil {
			log.Println("Error closing excel file:", closeErr)
		}
	}()

	existingSheetNames := make(map[string]bool)

	// Styles
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 14, Color: "0F172A"},
		Alignment: &excelize.Alignment{
			Horizontal: "left",
			Vertical:   "center",
		},
	})

	subtitleStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Size: 10, Color: "475569"},
		Alignment: &excelize.Alignment{
			Horizontal: "left",
			Vertical:   "center",
		},
	})

	// Navy Slate Header (matching GPMS standard)
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Color: "FFFFFF", Size: 10},
		Fill: excelize.Fill{
			Type:    "pattern",
			Color:   []string{"1E293B"},
			Pattern: 1,
		},
		Alignment: &excelize.Alignment{
			Horizontal: "center",
			Vertical:   "center",
			WrapText:   true,
		},
		Border: []excelize.Border{
			{Type: "top", Color: "94A3B8", Style: 1},
			{Type: "bottom", Color: "94A3B8", Style: 1},
			{Type: "left", Color: "94A3B8", Style: 1},
			{Type: "right", Color: "94A3B8", Style: 1},
		},
	})

	// Crimson Pink Header for Summary Columns (matching GPMS / TU Crimson standard)
	headerCrimsonStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Color: "FFFFFF", Size: 10},
		Fill: excelize.Fill{
			Type:    "pattern",
			Color:   []string{"990000"},
			Pattern: 1,
		},
		Alignment: &excelize.Alignment{
			Horizontal: "center",
			Vertical:   "center",
			WrapText:   true,
		},
		Border: []excelize.Border{
			{Type: "top", Color: "94A3B8", Style: 1},
			{Type: "bottom", Color: "94A3B8", Style: 1},
			{Type: "left", Color: "94A3B8", Style: 1},
			{Type: "right", Color: "94A3B8", Style: 1},
		},
	})

	dataTextStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Size: 10, Color: "1E293B"},
		Alignment: &excelize.Alignment{
			Horizontal: "left",
			Vertical:   "center",
		},
		Border: []excelize.Border{
			{Type: "top", Color: "E2E8F0", Style: 1},
			{Type: "bottom", Color: "E2E8F0", Style: 1},
			{Type: "left", Color: "E2E8F0", Style: 1},
			{Type: "right", Color: "E2E8F0", Style: 1},
		},
	})

	dataCenterStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Size: 10, Color: "1E293B"},
		Alignment: &excelize.Alignment{
			Horizontal: "center",
			Vertical:   "center",
		},
		Border: []excelize.Border{
			{Type: "top", Color: "E2E8F0", Style: 1},
			{Type: "bottom", Color: "E2E8F0", Style: 1},
			{Type: "left", Color: "E2E8F0", Style: 1},
			{Type: "right", Color: "E2E8F0", Style: 1},
		},
	})

	dataNumberStyle, _ := f.NewStyle(&excelize.Style{
		Font:         &excelize.Font{Size: 10, Color: "1E293B"},
		CustomNumFmt: &[]string{"0.00"}[0],
		Alignment: &excelize.Alignment{
			Horizontal: "right",
			Vertical:   "center",
		},
		Border: []excelize.Border{
			{Type: "top", Color: "E2E8F0", Style: 1},
			{Type: "bottom", Color: "E2E8F0", Style: 1},
			{Type: "left", Color: "E2E8F0", Style: 1},
			{Type: "right", Color: "E2E8F0", Style: 1},
		},
	})

	dataIntegerStyle, _ := f.NewStyle(&excelize.Style{
		Font:   &excelize.Font{Size: 10, Color: "1E293B"},
		NumFmt: 1, // Standard Excel integer format: 0 (no decimals)
		Alignment: &excelize.Alignment{
			Horizontal: "right",
			Vertical:   "center",
		},
		Border: []excelize.Border{
			{Type: "top", Color: "E2E8F0", Style: 1},
			{Type: "bottom", Color: "E2E8F0", Style: 1},
			{Type: "left", Color: "E2E8F0", Style: 1},
			{Type: "right", Color: "E2E8F0", Style: 1},
		},
	})

	dataTotalScoreStyle, _ := f.NewStyle(&excelize.Style{
		Font:         &excelize.Font{Bold: true, Size: 10, Color: "990000"},
		CustomNumFmt: &[]string{"0.00"}[0],
		Alignment: &excelize.Alignment{
			Horizontal: "right",
			Vertical:   "center",
		},
		Border: []excelize.Border{
			{Type: "top", Color: "E2E8F0", Style: 1},
			{Type: "bottom", Color: "E2E8F0", Style: 1},
			{Type: "left", Color: "E2E8F0", Style: 1},
			{Type: "right", Color: "E2E8F0", Style: 1},
		},
	})

	totalStepMaxScore := 0.0
	for _, st := range steps {
		totalStepMaxScore += st.MaxScore
	}
	totalCriteriaMaxScore := 0.0
	for _, cr := range criteria {
		totalCriteriaMaxScore += cr.MaxScore
	}
	// Grand total max score = Steps (60) + Midterm (20) + Presentation (20) = 100.00
	grandTotalMaxScore := totalStepMaxScore + 20.0 + 20.0

	renderSheet := func(sheetName, classroomTitle string, items []GroupScoreExportData) {
		// Row 1: Title
		f.SetCellValue(sheetName, "A1", fmt.Sprintf("รายงานผลคะแนนและการประเมินโครงงาน CPMS - %s", classroomTitle))
		f.SetCellStyle(sheetName, "A1", "A1", titleStyle)

		// Row 2: Subtitle
		timestampStr := time.Now().Format("02/01/2006 15:04")
		typeLabel := "สรุปผลรายกลุ่ม"
		if exportType == "student" {
			typeLabel = "รายชื่อนักเรียนรายบุคคล"
		}
		f.SetCellValue(sheetName, "A2", fmt.Sprintf("ปีการศึกษา %s | รูปแบบ: %s | ข้อมูล ณ วันที่: %s",
			academicYear, typeLabel, timestampStr,
		))
		f.SetCellStyle(sheetName, "A2", "A2", subtitleStyle)

		// Row 4: Table Headers
		headerRow := 4
		f.SetRowHeight(sheetName, headerRow, 28)

		var headers []string
		if exportType == "student" {
			headers = []string{
				"ลำดับ", "รหัสนักเรียน/Username", "ชื่อ-นามสกุล", "ห้องเรียน",
				"ชื่อโครงงาน (ไทย)", "บทบาท", "ชื่อโครงงาน (อังกฤษ)", "ครูที่ปรึกษา",
			}
		} else {
			headers = []string{
				"ลำดับ", "ห้องเรียน", "ชื่อโครงงาน (ไทย)", "ชื่อโครงงาน (อังกฤษ)",
				"ครูที่ปรึกษา", "หัวหน้ากลุ่ม", "สมาชิกในกลุ่ม",
			}
		}

		// Milestone steps columns (e.g. 60 pts)
		for _, st := range steps {
			headers = append(headers, fmt.Sprintf("%s\n(เต็ม %.2f)", st.StepName, st.MaxScore))
		}
		headers = append(headers, fmt.Sprintf("รวมคะแนนย่อยขั้นตอน (คะแนนงาน)\n(เต็ม %.2f)", totalStepMaxScore))

		// Midterm exam external score (20 pts)
		headers = append(headers, "สอบกลางภาค (ภายนอก)\n(เต็ม 20.00)")

		// Presentation Rubric criteria columns
		for _, cr := range criteria {
			headers = append(headers, fmt.Sprintf("Rubric: %s\n(เต็ม %.2f)", cr.Label, cr.MaxScore))
		}

		if len(criteria) > 0 {
			headers = append(headers, fmt.Sprintf("รวมคะแนนนำเสนอ (คะแนนดิบ)\n(เต็ม %.2f)", totalCriteriaMaxScore))
		}
		headers = append(headers, "รวมคะแนนนำเสนอ (20 คะแนน)\n(เต็ม 20)")

		headers = append(headers,
			fmt.Sprintf("คะแนนรวมสุทธิ\n(เต็ม %.2f)", grandTotalMaxScore),
			"สถานะการตรวจ",
		)

		for cIdx, h := range headers {
			cell, _ := excelize.CoordinatesToCellName(cIdx+1, headerRow)
			f.SetCellValue(sheetName, cell, h)
			if strings.HasPrefix(h, "รวมคะแนน") || strings.HasPrefix(h, "คะแนนรวมสุทธิ") || strings.HasPrefix(h, "สอบกลางภาค") {
				f.SetCellStyle(sheetName, cell, cell, headerCrimsonStyle)
			} else {
				f.SetCellStyle(sheetName, cell, cell, headerStyle)
			}
		}

		// Row 5+: Data Rows
		currentRow := 5
		rowCounter := 1

		if exportType == "student" {
			for _, item := range items {
				g := item.Group
				members := item.Members

				// Fallback if no members loaded but leader exists
				if len(members) == 0 && item.LeaderUser != nil {
					members = []models.GroupMember{
						{User: item.LeaderUser, IsLeader: true},
					}
				}

				for _, m := range members {
					f.SetRowHeight(sheetName, currentRow, 22)

					studentID := "-"
					fullName := "-"
					if m.User != nil {
						if m.User.StudentID != nil && *m.User.StudentID != "" {
							studentID = *m.User.StudentID
						} else {
							studentID = m.User.Email
						}
						fullName = m.User.FullName
					}

					roleName := "สมาชิก"
					if m.IsLeader {
						roleName = "หัวหน้ากลุ่ม"
					}

					baseCols := []interface{}{
						rowCounter,
						studentID,
						fullName,
						item.Room,
						g.ProjectNameTH,
						roleName,
						g.ProjectNameEN,
						item.AdvisorName,
					}

					for cIdx, val := range baseCols {
						cell, _ := excelize.CoordinatesToCellName(cIdx+1, currentRow)
						f.SetCellValue(sheetName, cell, val)
						if cIdx == 0 || cIdx == 1 || cIdx == 3 || cIdx == 5 {
							f.SetCellStyle(sheetName, cell, cell, dataCenterStyle)
						} else {
							f.SetCellStyle(sheetName, cell, cell, dataTextStyle)
						}
					}

					colOffset := len(baseCols)

					// 1. Step Scores
					for sIdx, score := range item.StepScores {
						cell, _ := excelize.CoordinatesToCellName(colOffset+sIdx+1, currentRow)
						f.SetCellValue(sheetName, cell, score)
						f.SetCellStyle(sheetName, cell, cell, dataNumberStyle)
					}
					colOffset += len(steps)

					// 2. Step Accumulated Score (Work 60)
					accCell, _ := excelize.CoordinatesToCellName(colOffset+1, currentRow)
					f.SetCellValue(sheetName, accCell, item.AccumulatedStepScore)
					f.SetCellStyle(sheetName, accCell, accCell, dataNumberStyle)
					colOffset += 1

					// 3. Midterm External Score (20)
					midtermCell, _ := excelize.CoordinatesToCellName(colOffset+1, currentRow)
					f.SetCellValue(sheetName, midtermCell, item.MidtermScore)
					f.SetCellStyle(sheetName, midtermCell, midtermCell, dataNumberStyle)
					colOffset += 1

					// 4. Presentation Criteria Scores
					for crIdx, score := range item.CriteriaScores {
						cell, _ := excelize.CoordinatesToCellName(colOffset+crIdx+1, currentRow)
						f.SetCellValue(sheetName, cell, score)
						f.SetCellStyle(sheetName, cell, cell, dataNumberStyle)
					}
					colOffset += len(criteria)

					// 5. Raw Presentation Total
					if len(criteria) > 0 {
						rawPresCell, _ := excelize.CoordinatesToCellName(colOffset+1, currentRow)
						f.SetCellValue(sheetName, rawPresCell, item.TotalPresentationScore)
						f.SetCellStyle(sheetName, rawPresCell, rawPresCell, dataNumberStyle)
						colOffset += 1
					}

					// 6. Presentation Score 20 (แบบไม่มีทศนิยม)
					pres20Cell, _ := excelize.CoordinatesToCellName(colOffset+1, currentRow)
					f.SetCellValue(sheetName, pres20Cell, int(math.Round(item.PresentationScore20)))
					f.SetCellStyle(sheetName, pres20Cell, pres20Cell, dataIntegerStyle)
					colOffset += 1

					// 7. Grand Total Score: Work (60) + Midterm (20) + Presentation (20)
					totCell, _ := excelize.CoordinatesToCellName(colOffset+1, currentRow)
					f.SetCellFormula(sheetName, totCell, fmt.Sprintf("%s+%s+%s", accCell, midtermCell, pres20Cell))
					f.SetCellValue(sheetName, totCell, item.TotalScore)
					f.SetCellStyle(sheetName, totCell, totCell, dataTotalScoreStyle)
					colOffset += 1

					// 8. Status
					statCell, _ := excelize.CoordinatesToCellName(colOffset+1, currentRow)
					f.SetCellValue(sheetName, statCell, item.GradingStatus)
					f.SetCellStyle(sheetName, statCell, statCell, dataCenterStyle)

					currentRow++
					rowCounter++
				}
			}
		} else {
			// Group level export
			for _, item := range items {
				g := item.Group
				f.SetRowHeight(sheetName, currentRow, 22)

				baseCols := []interface{}{
					rowCounter,
					item.Room,
					g.ProjectNameTH,
					g.ProjectNameEN,
					item.AdvisorName,
					item.LeaderName,
					strings.Join(item.MemberNames, ", "),
				}

				for cIdx, val := range baseCols {
					cell, _ := excelize.CoordinatesToCellName(cIdx+1, currentRow)
					f.SetCellValue(sheetName, cell, val)
					if cIdx == 0 || cIdx == 1 {
						f.SetCellStyle(sheetName, cell, cell, dataCenterStyle)
					} else {
						f.SetCellStyle(sheetName, cell, cell, dataTextStyle)
					}
				}

				colOffset := len(baseCols)

				// 1. Step Scores
				for sIdx, score := range item.StepScores {
					cell, _ := excelize.CoordinatesToCellName(colOffset+sIdx+1, currentRow)
					f.SetCellValue(sheetName, cell, score)
					f.SetCellStyle(sheetName, cell, cell, dataNumberStyle)
				}
				colOffset += len(steps)

				// 2. Step Accumulated Score (Work 60)
				accCell, _ := excelize.CoordinatesToCellName(colOffset+1, currentRow)
				f.SetCellValue(sheetName, accCell, item.AccumulatedStepScore)
				f.SetCellStyle(sheetName, accCell, accCell, dataNumberStyle)
				colOffset += 1

				// 3. Midterm External Score (20)
				midtermCell, _ := excelize.CoordinatesToCellName(colOffset+1, currentRow)
				f.SetCellValue(sheetName, midtermCell, item.MidtermScore)
				f.SetCellStyle(sheetName, midtermCell, midtermCell, dataNumberStyle)
				colOffset += 1

				// 4. Presentation Criteria Scores
				for crIdx, score := range item.CriteriaScores {
					cell, _ := excelize.CoordinatesToCellName(colOffset+crIdx+1, currentRow)
					f.SetCellValue(sheetName, cell, score)
					f.SetCellStyle(sheetName, cell, cell, dataNumberStyle)
				}
				colOffset += len(criteria)

				// 5. Raw Presentation Total
				if len(criteria) > 0 {
					rawPresCell, _ := excelize.CoordinatesToCellName(colOffset+1, currentRow)
					f.SetCellValue(sheetName, rawPresCell, item.TotalPresentationScore)
					f.SetCellStyle(sheetName, rawPresCell, rawPresCell, dataNumberStyle)
					colOffset += 1
				}

				// 6. Presentation Score 20 (แบบไม่มีทศนิยม)
				pres20Cell, _ := excelize.CoordinatesToCellName(colOffset+1, currentRow)
				f.SetCellValue(sheetName, pres20Cell, int(math.Round(item.PresentationScore20)))
				f.SetCellStyle(sheetName, pres20Cell, pres20Cell, dataIntegerStyle)
				colOffset += 1

				// 7. Grand Total Score: Work (60) + Midterm (20) + Presentation (20)
				totCell, _ := excelize.CoordinatesToCellName(colOffset+1, currentRow)
				f.SetCellFormula(sheetName, totCell, fmt.Sprintf("%s+%s+%s", accCell, midtermCell, pres20Cell))
				f.SetCellValue(sheetName, totCell, item.TotalScore)
				f.SetCellStyle(sheetName, totCell, totCell, dataTotalScoreStyle)
				colOffset += 1

				// 8. Status
				statCell, _ := excelize.CoordinatesToCellName(colOffset+1, currentRow)
				f.SetCellValue(sheetName, statCell, item.GradingStatus)
				f.SetCellStyle(sheetName, statCell, statCell, dataCenterStyle)

				currentRow++
				rowCounter++
			}
		}

		// Auto fit column widths
		cols, getColsErr := f.GetCols(sheetName)
		if getColsErr == nil {
			for i, col := range cols {
				maxLen := 0
				for rIdx, val := range col {
					if rIdx < 2 {
						continue // Ignore title & subtitle
					}
					lines := strings.Split(val, "\n")
					for _, line := range lines {
						rLen := len([]rune(line))
						if rLen > maxLen {
							maxLen = rLen
						}
					}
				}
				colName, colErr := excelize.ColumnNumberToName(i + 1)
				if colErr == nil {
					width := float64(maxLen)*1.3 + 3
					if width < 12 {
						width = 12
					}
					if width > 42 {
						width = 42
					}
					f.SetColWidth(sheetName, colName, colName, width)
				}
			}
		}
	}

	// 2. Generate Sheets
	isAllRooms := roomFilter == "" || roomFilter == "all"

	if isAllRooms {
		overviewSheet := "ภาพรวมทุกห้อง"
		existingSheetNames[strings.ToLower(overviewSheet)] = true
		f.SetSheetName("Sheet1", overviewSheet)
		renderSheet(overviewSheet, "ภาพรวมทุกห้องเรียน", dataList)

		// Subsequent sheets for each room
		for _, rm := range uniqueRooms {
			rmData := roomDataMap[rm]
			sheetName := sanitizeSheetName("ห้อง "+rm, existingSheetNames)
			f.NewSheet(sheetName)
			renderSheet(sheetName, fmt.Sprintf("ห้องเรียน %s", rm), rmData)
		}

		f.SetActiveSheet(0)
	} else {
		sheetName := sanitizeSheetName("ห้อง "+roomFilter, existingSheetNames)
		f.SetSheetName("Sheet1", sheetName)
		rmData := roomDataMap[roomFilter]
		renderSheet(sheetName, fmt.Sprintf("ห้องเรียน %s", roomFilter), rmData)
	}

	// 3. Output to client
	filename := fmt.Sprintf("CPMS_Score_Report_%s_%s_%s.xlsx",
		academicYear,
		exportType,
		time.Now().Format("20060102_1504"),
	)

	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))

	buffer, err := f.WriteToBuffer()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to generate Excel file: " + err.Error(),
		})
	}

	return c.Send(buffer.Bytes())
}

// ExportScoresCSV exports comprehensive scores to CSV with UTF-8 BOM
func (ec *ExportController) ExportScoresCSV(c *fiber.Ctx) error {
	academicYear := strings.TrimSpace(c.Query("academic_year"))
	if academicYear == "" {
		academicYear = database.GetCurrentAcademicYear(ec.db)
	}
	roomFilter := strings.TrimSpace(c.Query("room"))
	exportType := strings.ToLower(strings.TrimSpace(c.Query("type", "group")))
	if exportType != "student" {
		exportType = "group"
	}

	steps, criteria, dataList, roomDataMap, _, err := ec.loadScoreData(academicYear, roomFilter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to load score data: " + err.Error(),
		})
	}

	totalStepMaxScore := 0.0
	for _, st := range steps {
		totalStepMaxScore += st.MaxScore
	}
	totalCriteriaMaxScore := 0.0
	for _, cr := range criteria {
		totalCriteriaMaxScore += cr.MaxScore
	}
	grandTotalMaxScore := totalStepMaxScore + 20.0 + 20.0

	var items []GroupScoreExportData
	if roomFilter != "" && roomFilter != "all" {
		items = roomDataMap[roomFilter]
	} else {
		items = dataList
	}

	buf := new(bytes.Buffer)
	// UTF-8 BOM for Microsoft Excel Thai language compatibility
	buf.WriteString("\xEF\xBB\xBF")

	writer := csv.NewWriter(buf)

	// Headers
	var header []string
	if exportType == "student" {
		header = []string{
			"ลำดับ", "รหัสนักเรียน/Username", "ชื่อ-นามสกุล", "ห้องเรียน",
			"ชื่อโครงงาน (ไทย)", "บทบาท", "ชื่อโครงงาน (อังกฤษ)", "ครูที่ปรึกษา",
		}
	} else {
		header = []string{
			"ลำดับ", "ห้องเรียน", "ชื่อโครงงาน (ไทย)", "ชื่อโครงงาน (อังกฤษ)",
			"ครูที่ปรึกษา", "หัวหน้ากลุ่ม", "สมาชิกในกลุ่ม",
		}
	}

	for _, st := range steps {
		header = append(header, fmt.Sprintf("%s (เต็ม %.2f)", st.StepName, st.MaxScore))
	}
	header = append(header, fmt.Sprintf("รวมคะแนนย่อยขั้นตอน (คะแนนงาน) (เต็ม %.2f)", totalStepMaxScore))
	header = append(header, "สอบกลางภาค (ภายนอก) (เต็ม 20.00)")

	for _, cr := range criteria {
		header = append(header, fmt.Sprintf("Rubric: %s (เต็ม %.2f)", cr.Label, cr.MaxScore))
	}
	if len(criteria) > 0 {
		header = append(header, fmt.Sprintf("รวมคะแนนนำเสนอ (คะแนนดิบ) (เต็ม %.2f)", totalCriteriaMaxScore))
	}
	header = append(header, "รวมคะแนนนำเสนอ (20 คะแนน) (เต็ม 20)")
	header = append(header, fmt.Sprintf("คะแนนรวมสุทธิ (เต็ม %.2f)", grandTotalMaxScore), "สถานะการตรวจ")

	_ = writer.Write(header)

	// Rows
	rowCounter := 1
	if exportType == "student" {
		for _, item := range items {
			g := item.Group
			members := item.Members
			if len(members) == 0 && item.LeaderUser != nil {
				members = []models.GroupMember{
					{User: item.LeaderUser, IsLeader: true},
				}
			}

			for _, m := range members {
				studentID := "-"
				fullName := "-"
				if m.User != nil {
					if m.User.StudentID != nil && *m.User.StudentID != "" {
						studentID = *m.User.StudentID
					} else {
						studentID = m.User.Email
					}
					fullName = m.User.FullName
				}

				roleName := "สมาชิก"
				if m.IsLeader {
					roleName = "หัวหน้ากลุ่ม"
				}

				row := []string{
					fmt.Sprintf("%d", rowCounter),
					studentID,
					fullName,
					item.Room,
					g.ProjectNameTH,
					roleName,
					g.ProjectNameEN,
					item.AdvisorName,
				}

				for _, sc := range item.StepScores {
					row = append(row, fmt.Sprintf("%.2f", sc))
				}
				row = append(row, fmt.Sprintf("%.2f", item.AccumulatedStepScore))
				row = append(row, fmt.Sprintf("%.2f", item.MidtermScore))

				for _, sc := range item.CriteriaScores {
					row = append(row, fmt.Sprintf("%.2f", sc))
				}
				if len(criteria) > 0 {
					row = append(row, fmt.Sprintf("%.2f", item.TotalPresentationScore))
				}
				row = append(row, fmt.Sprintf("%.0f", item.PresentationScore20))

				row = append(row, fmt.Sprintf("%.2f", item.TotalScore), item.GradingStatus)
				_ = writer.Write(row)
				rowCounter++
			}
		}
	} else {
		for _, item := range items {
			g := item.Group
			row := []string{
				fmt.Sprintf("%d", rowCounter),
				item.Room,
				g.ProjectNameTH,
				g.ProjectNameEN,
				item.AdvisorName,
				item.LeaderName,
				strings.Join(item.MemberNames, ", "),
			}

			for _, sc := range item.StepScores {
				row = append(row, fmt.Sprintf("%.2f", sc))
			}
			row = append(row, fmt.Sprintf("%.2f", item.AccumulatedStepScore))
			row = append(row, fmt.Sprintf("%.2f", item.MidtermScore))

			for _, sc := range item.CriteriaScores {
				row = append(row, fmt.Sprintf("%.2f", sc))
			}
			if len(criteria) > 0 {
				row = append(row, fmt.Sprintf("%.2f", item.TotalPresentationScore))
			}
			row = append(row, fmt.Sprintf("%.0f", item.PresentationScore20))

			row = append(row, fmt.Sprintf("%.2f", item.TotalScore), item.GradingStatus)
			_ = writer.Write(row)
			rowCounter++
		}
	}

	writer.Flush()

	c.Set("Content-Type", "text/csv; charset=utf-8")
	fileName := fmt.Sprintf("CPMS_Score_Report_%s_%s", academicYear, exportType)
	if roomFilter != "" && roomFilter != "all" {
		fileName += fmt.Sprintf("_room_%s", roomFilter)
	}
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s.csv", fileName))
	return c.Send(buf.Bytes())
}

// GetScoreReportData returns structured JSON report data for frontend preview & reporting
func (ec *ExportController) GetScoreReportData(c *fiber.Ctx) error {
	academicYear := strings.TrimSpace(c.Query("academic_year"))
	if academicYear == "" {
		academicYear = database.GetCurrentAcademicYear(ec.db)
	}
	roomFilter := strings.TrimSpace(c.Query("room"))

	steps, criteria, dataList, roomDataMap, uniqueRooms, err := ec.loadScoreData(academicYear, roomFilter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to load score data: " + err.Error(),
		})
	}

	var items []GroupScoreExportData
	if roomFilter != "" && roomFilter != "all" {
		items = roomDataMap[roomFilter]
	} else {
		items = dataList
	}

	return c.JSON(fiber.Map{
		"success":       true,
		"academic_year": academicYear,
		"room":          roomFilter,
		"unique_rooms":  uniqueRooms,
		"steps":         steps,
		"criteria":      criteria,
		"rows":          items,
	})
}
