package main

import (
	"bufio"
	"bytes"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	"tunorth-cpms-backend/internal/config"
	"tunorth-cpms-backend/internal/database"
	"tunorth-cpms-backend/internal/models"

	"github.com/google/uuid"
)

type LegacyGroupInfo struct {
	ID           int
	NameTH       string
	NameEN       string
	AdvisorName  string
	Room         string
	AcademicYear string
	MemberIDs    []int
}

func main() {
	log.Println("==================================================")
	log.Println("🔧 Repairing Corrupted Thai Group Names")
	log.Println("==================================================")

	cfg := config.LoadConfig()
	db, err := database.ConnectDB(cfg)
	if err != nil {
		log.Fatalf("❌ Connect DB failed: %v", err)
	}

	sqlPath := `D:\TUNorth\apps\cpms\old_system\tunorth-cpms\backup_cpms_db.sql`
	if _, err := os.Stat(sqlPath); os.IsNotExist(err) {
		sqlPath = `../old_system/tunorth-cpms/backup_cpms_db.sql`
	}

	fileBytes, err := os.ReadFile(sqlPath)
	if err != nil {
		log.Fatalf("❌ Read SQL failed: %v", err)
	}

	// 1. Build map of user old_id to UUID
	userIdToOldMap := make(map[uuid.UUID]int)
	oldIdToUserUUID := make(map[int]uuid.UUID)

	scanner := bufio.NewScanner(bytes.NewReader(fileBytes))
	buf := make([]byte, 1024*1024)
	scanner.Buffer(buf, 10*1024*1024)

	var currentTable string
	legacyGroups := make(map[int]*LegacyGroupInfo)

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
					email := strings.ToLower(fields[3])
					var u models.User
					if err := db.Where("LOWER(email) = ?", email).First(&u).Error; err == nil {
						userIdToOldMap[u.ID] = oldId
						oldIdToUserUUID[oldId] = u.ID
					}
				}

			case "project_groups":
				if len(fields) >= 7 {
					oldGroupId, _ := strconv.Atoi(fields[0])
					legacyGroups[oldGroupId] = &LegacyGroupInfo{
						ID:           oldGroupId,
						NameTH:       fields[1],
						NameEN:       fields[2],
						AdvisorName:  fields[4],
						Room:         fields[5],
						AcademicYear: fields[7],
					}
				}

			case "group_members":
				if len(fields) >= 2 {
					oldGroupId, _ := strconv.Atoi(fields[0])
					oldUserId, _ := strconv.Atoi(fields[1])
					if g, ok := legacyGroups[oldGroupId]; ok {
						g.MemberIDs = append(g.MemberIDs, oldUserId)
					}
				}
			}
		}

		if strings.HasSuffix(line, ";") {
			currentTable = ""
		}
	}

	// 2. Query all groups from database
	var dbGroups []models.ProjectGroup
	db.Preload("Members").Find(&dbGroups)

	fixedCount := 0
	for _, g := range dbGroups {
		if !strings.Contains(g.ProjectNameTH, "?") {
			continue
		}

		// Find matching legacy group by member old_id
		var matchedLegacy *LegacyGroupInfo
		for _, m := range g.Members {
			if oldUid, ok := userIdToOldMap[m.UserID]; ok {
				for _, lg := range legacyGroups {
					for _, lMid := range lg.MemberIDs {
						if lMid == oldUid {
							matchedLegacy = lg
							break
						}
					}
					if matchedLegacy != nil {
						break
					}
				}
			}
			if matchedLegacy != nil {
				break
			}
		}

		if matchedLegacy != nil {
			fmt.Printf("✅ Fixing Group [%s]:\n   Old: %s\n   New: %s\n", g.ID, g.ProjectNameTH, matchedLegacy.NameTH)
			g.ProjectNameTH = matchedLegacy.NameTH
			g.ProjectNameEN = matchedLegacy.NameEN
			if matchedLegacy.AdvisorName != "" {
				adv := matchedLegacy.AdvisorName
				g.AdvisorName = &adv
			}
			db.Save(&g)
			fixedCount++
		}
	}

	log.Printf("🎉 Successfully fixed %d groups with clean Thai names!\n", fixedCount)
}

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
