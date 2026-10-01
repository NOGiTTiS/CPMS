package controllers

import (
	"fmt"
	"strings"
	"testing"

	"tunorth-cpms-backend/internal/models"

	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
)

func TestFullExportOutput(t *testing.T) {
	// Setup sample steps (9 steps, total 60 pts)
	steps := []models.ProjectStep{
		{ID: uuid.New(), StepName: "ขั้นตอนที่ 1", MaxScore: 10.0},
		{ID: uuid.New(), StepName: "ขั้นตอนที่ 2", MaxScore: 5.0},
		{ID: uuid.New(), StepName: "ขั้นตอนที่ 3", MaxScore: 5.0},
		{ID: uuid.New(), StepName: "ขั้นตอนที่ 4", MaxScore: 10.0},
		{ID: uuid.New(), StepName: "ขั้นตอนที่ 5", MaxScore: 5.0},
		{ID: uuid.New(), StepName: "ขั้นตอนที่ 6", MaxScore: 5.0},
		{ID: uuid.New(), StepName: "ขั้นตอนที่ 7", MaxScore: 5.0},
		{ID: uuid.New(), StepName: "ขั้นตอนที่ 8", MaxScore: 5.0},
		{ID: uuid.New(), StepName: "ขั้นตอนที่ 9", MaxScore: 10.0},
	}

	// Setup criteria (10 criteria, total 100 pts)
	criteria := []models.PresentationCriteria{
		{ID: uuid.New(), Label: "เกณฑ์ที่ 1", MaxScore: 10.0},
		{ID: uuid.New(), Label: "เกณฑ์ที่ 2", MaxScore: 10.0},
	}

	studentID1 := "66001"
	roomName := "601"
	projectName := "ระบบทดสอบอัจฉริยะ"
	projectNameEN := "Smart Test System"
	advisorName := "อ.สมชาย ใจดี"

	item := GroupScoreExportData{
		Group: models.ProjectGroup{
			ProjectNameTH: projectName,
			ProjectNameEN: projectNameEN,
			Room:          &roomName,
		},
		Room:                   roomName,
		AdvisorName:            advisorName,
		LeaderName:             "นาย ก ข",
		MemberNames:            []string{"นาย ก ข (หัวหน้า)", "นางสาว ค ง"},
		Members: []models.GroupMember{
			{
				User: &models.User{
					FullName:  "นาย ก ข",
					StudentID: &studentID1,
					Email:     "student1@test.ac.th",
				},
				IsLeader: true,
			},
		},
		StepScores:             []float64{10, 5, 5, 10, 5, 5, 5, 5, 10},
		StepGraded:             []bool{true, true, true, true, true, true, true, true, true},
		GradedStepCount:        9,
		AccumulatedStepScore:   60.0,
		MidtermScore:           0.0,
		CriteriaScores:         []float64{9.5, 9.0},
		TotalPresentationScore: 92.5, // 92.5 / 100 * 20 = 18.5 -> round to 19 or 18
		PresentationScore20:    19.0, // rounded integer
		EvaluatorCount:         2,
		TotalScore:             79.0, // 60 + 0 + 19 = 79
		GradingStatus:          "ตรวจครบแล้ว",
	}

	// 1. Test Excel generation
	f := excelize.NewFile()
	defer f.Close()

	sheetName := "ภาพรวมทุกห้อง"
	f.SetSheetName("Sheet1", sheetName)

	dataIntegerStyle, _ := f.NewStyle(&excelize.Style{
		Font:   &excelize.Font{Size: 10, Color: "1E293B"},
		NumFmt: 1, // Built-in 0
		Alignment: &excelize.Alignment{
			Horizontal: "right",
			Vertical:   "center",
		},
	})

	dataNumberStyle, _ := f.NewStyle(&excelize.Style{
		Font:         &excelize.Font{Size: 10, Color: "1E293B"},
		CustomNumFmt: &[]string{"0.00"}[0],
		Alignment: &excelize.Alignment{
			Horizontal: "right",
			Vertical:   "center",
		},
	})

	// Header row
	headerRow := 4
	var headers []string
	headers = []string{"ลำดับ", "ห้องเรียน", "ชื่อโครงงาน (ไทย)", "ชื่อโครงงาน (อังกฤษ)", "ครูที่ปรึกษา", "หัวหน้ากลุ่ม", "สมาชิกในกลุ่ม"}
	for _, st := range steps {
		headers = append(headers, fmt.Sprintf("%s\n(เต็ม %.2f)", st.StepName, st.MaxScore))
	}
	headers = append(headers, "รวมคะแนนย่อยขั้นตอน (คะแนนงาน)\n(เต็ม 60.00)")
	headers = append(headers, "สอบกลางภาค (ภายนอก)\n(เต็ม 20.00)")
	for _, cr := range criteria {
		headers = append(headers, fmt.Sprintf("Rubric: %s\n(เต็ม %.2f)", cr.Label, cr.MaxScore))
	}
	headers = append(headers, "รวมคะแนนนำเสนอ (คะแนนดิบ)\n(เต็ม 100.00)")
	headers = append(headers, "รวมคะแนนนำเสนอ (20 คะแนน)\n(เต็ม 20)")
	headers = append(headers, "คะแนนรวมสุทธิ\n(เต็ม 100.00)")
	headers = append(headers, "สถานะการตรวจ")

	for cIdx, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(cIdx+1, headerRow)
		f.SetCellValue(sheetName, cell, h)
	}

	// Data row 5
	currentRow := 5
	colOffset := 7 // after baseCols
	for sIdx, sc := range item.StepScores {
		cell, _ := excelize.CoordinatesToCellName(colOffset+sIdx+1, currentRow)
		f.SetCellValue(sheetName, cell, sc)
		f.SetCellStyle(sheetName, cell, cell, dataNumberStyle)
	}
	colOffset += len(steps)

	// Work 60
	accCell, _ := excelize.CoordinatesToCellName(colOffset+1, currentRow)
	f.SetCellValue(sheetName, accCell, item.AccumulatedStepScore)
	colOffset += 1

	// Midterm 20
	midCell, _ := excelize.CoordinatesToCellName(colOffset+1, currentRow)
	f.SetCellValue(sheetName, midCell, item.MidtermScore)
	colOffset += 1

	// Rubrics
	for crIdx, sc := range item.CriteriaScores {
		cell, _ := excelize.CoordinatesToCellName(colOffset+crIdx+1, currentRow)
		f.SetCellValue(sheetName, cell, sc)
	}
	colOffset += len(criteria)

	// Raw presentation
	rawCell, _ := excelize.CoordinatesToCellName(colOffset+1, currentRow)
	f.SetCellValue(sheetName, rawCell, item.TotalPresentationScore)
	colOffset += 1

	// Presentation 20 (testing int vs float)
	pres20Cell, _ := excelize.CoordinatesToCellName(colOffset+1, currentRow)
	f.SetCellValue(sheetName, pres20Cell, int(item.PresentationScore20))
	f.SetCellStyle(sheetName, pres20Cell, pres20Cell, dataIntegerStyle)
	colOffset += 1

	// Total net score
	totCell, _ := excelize.CoordinatesToCellName(colOffset+1, currentRow)
	f.SetCellFormula(sheetName, totCell, fmt.Sprintf("%s+%s+%s", accCell, midCell, pres20Cell))
	f.SetCellValue(sheetName, totCell, item.TotalScore)
	colOffset += 1

	buf, err := f.WriteToBuffer()
	if err != nil {
		t.Fatalf("Failed to write buffer: %v", err)
	}

	// Read back and inspect
	fRead, err := excelize.OpenReader(buf)
	if err != nil {
		t.Fatalf("Failed to open reader: %v", err)
	}
	defer fRead.Close()

	rows, _ := fRead.GetRows(sheetName)
	for rIdx, r := range rows {
		if rIdx == 3 { // Header row
			fmt.Printf("\n--- EXCEL HEADERS (Row 4) ---\n")
			for cIdx, colVal := range r {
				if strings.Contains(colVal, "นำเสนอ") || strings.Contains(colVal, "สุทธิ") {
					cellName, _ := excelize.CoordinatesToCellName(cIdx+1, rIdx+1)
					fmt.Printf("[%s]: %q\n", cellName, colVal)
				}
			}
		}
		if rIdx == 4 { // Data row
			fmt.Printf("\n--- EXCEL DATA (Row 5) ---\n")
			for cIdx, colVal := range r {
				cellName, _ := excelize.CoordinatesToCellName(cIdx+1, rIdx+1)
				headerName := ""
				if cIdx < len(rows[3]) {
					headerName = rows[3][cIdx]
				}
				if strings.Contains(headerName, "นำเสนอ") || strings.Contains(headerName, "สุทธิ") || strings.Contains(headerName, "กลางภาค") {
					fmt.Printf("[%s] (Header: %q): Value = %q\n", cellName, headerName, colVal)
				}
			}
		}
	}

	// 2. Test CSV Output
	csvHeader := "รวมคะแนนนำเสนอ (20 คะแนน) (เต็ม 20)"
	csvVal := fmt.Sprintf("%.0f", item.PresentationScore20)
	fmt.Printf("\n--- CSV OUTPUT ---\nHeader: %q\nValue: %q (No decimals!)\n", csvHeader, csvVal)
}
