package controllers

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"tunorth-cpms-backend/internal/config"
	"tunorth-cpms-backend/internal/models"
	"tunorth-cpms-backend/internal/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type GroupController struct {
	db       *gorm.DB
	cfg      *config.Config
	telegram *services.TelegramService
}

func NewGroupController(db *gorm.DB, cfg *config.Config, tg *services.TelegramService) *GroupController {
	return &GroupController{db: db, cfg: cfg, telegram: tg}
}

type CreateGroupRequest struct {
	ProjectNameTH string     `json:"project_name_th"`
	ProjectNameEN string     `json:"project_name_en"`
	AdvisorID     *uuid.UUID `json:"advisor_id"`
	AdvisorName   *string    `json:"advisor_name"`
	LeaderID      *uuid.UUID `json:"leader_id"`
	Room          *string    `json:"room"`
	AcademicYear  string     `json:"academic_year"`
}

func (gc *GroupController) CreateGroup(c *fiber.Ctx) error {
	currentUserID, ok := c.Locals("userID").(uuid.UUID)
	currentUserRole, _ := c.Locals("userRole").(models.UserRole)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "Unauthorized"})
	}

	var req CreateGroupRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	targetLeaderID := currentUserID
	if currentUserRole == models.RoleAdmin && req.LeaderID != nil && *req.LeaderID != uuid.Nil {
		targetLeaderID = *req.LeaderID
	}

	// Check if target leader already belongs to any group
	var existingMember models.GroupMember
	if err := gc.db.Where("user_id = ?", targetLeaderID).First(&existingMember).Error; err == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "User is already a member of another project group. Leave or dissolve the current group first.",
		})
	}

	req.ProjectNameTH = strings.TrimSpace(req.ProjectNameTH)
	req.ProjectNameEN = strings.TrimSpace(req.ProjectNameEN)
	if req.ProjectNameTH == "" || req.ProjectNameEN == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Thai and English project names are required",
		})
	}

	var leaderUser models.User
	if err := gc.db.Where("id = ?", targetLeaderID).First(&leaderUser).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "Leader user not found"})
	}

	academicYear := req.AcademicYear
	if academicYear == "" {
		var yearSetting models.SystemSetting
		if err := gc.db.Where("key = ?", "academic_year").First(&yearSetting).Error; err == nil && yearSetting.Value != "" {
			academicYear = yearSetting.Value
		} else {
			academicYear = "2568"
		}
	}

	var advisorName *string
	if req.AdvisorID != nil {
		var advisor models.User
		if err := gc.db.Where("id = ? AND (role = 'TEACHER' OR role = 'ADMIN')", *req.AdvisorID).First(&advisor).Error; err == nil {
			name := advisor.FullName
			advisorName = &name
		}
	} else if req.AdvisorName != nil && strings.TrimSpace(*req.AdvisorName) != "" {
		name := strings.TrimSpace(*req.AdvisorName)
		advisorName = &name
	}

	groupRoom := leaderUser.Room
	if req.Room != nil && strings.TrimSpace(*req.Room) != "" {
		r := strings.TrimSpace(*req.Room)
		groupRoom = &r
	}

	group := models.ProjectGroup{
		ProjectNameTH: req.ProjectNameTH,
		ProjectNameEN: req.ProjectNameEN,
		AdvisorID:     req.AdvisorID,
		AdvisorName:   advisorName,
		AcademicYear:  academicYear,
		Room:          groupRoom,
	}

	tx := gc.db.Begin()
	if err := tx.Create(&group).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to create group"})
	}

	// Add leader member
	member := models.GroupMember{
		GroupID:  group.ID,
		UserID:   targetLeaderID,
		IsLeader: true,
	}
	if err := tx.Create(&member).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to assign group leader"})
	}

	tx.Commit()

	// Load complete group with relations
	var createdGroup models.ProjectGroup
	gc.db.Preload("Advisor").Preload("Members.User").Where("id = ?", group.ID).First(&createdGroup)

	// Telegram notification
	ip := c.IP()
	services.LogActivity(gc.db, &currentUserID, string(currentUserRole), "CREATE_GROUP", fmt.Sprintf("Created project group '%s'", group.ProjectNameTH), ip)

	advisorText := "ยังไม่ระบุ"
	if advisorName != nil {
		advisorText = *advisorName
	}
	gc.telegram.SendAsync(fmt.Sprintf(
		"📁 <b>กลุ่มโครงงานใหม่ถูกสร้างขึ้น</b>\n\n📌 <b>ชื่อโครงงาน:</b> %s (%s)\n👤 <b>หัวหน้ากลุ่ม:</b> %s (ห้อง %s)\n👨‍🏫 <b>ที่ปรึกษา:</b> %s\n📅 <b>ปีการศึกษา:</b> %s",
		group.ProjectNameTH, group.ProjectNameEN, leaderUser.FullName, func() string {
			if leaderUser.Room != nil {
				return *leaderUser.Room
			}
			return "-"
		}(), advisorText, group.AcademicYear,
	))

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "Project group created successfully",
		"data":    createdGroup,
	})
}

func (gc *GroupController) GetMyGroup(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "Unauthorized"})
	}

	var member models.GroupMember
	if err := gc.db.Where("user_id = ?", userID).First(&member).Error; err != nil {
		return c.JSON(fiber.Map{
			"success": true,
			"data":    nil,
			"message": "User is not in any group",
		})
	}

	var group models.ProjectGroup
	if err := gc.db.Preload("Advisor").
		Preload("Members", func(db *gorm.DB) *gorm.DB {
			return db.Order("is_leader DESC, joined_at ASC")
		}).
		Preload("Members.User").
		Preload("Submissions.Step").
		Preload("Submissions.Submitter").
		Preload("Booking.Slot").
		Preload("Booking.Scores.Scorer").
		Where("id = ?", member.GroupID).First(&group).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "Group not found"})
	}

	var maxMembersSetting models.SystemSetting
	maxMembers := 3
	if err := gc.db.Where("key = ?", "max_members_per_group").First(&maxMembersSetting).Error; err == nil {
		if val, err := strconv.Atoi(maxMembersSetting.Value); err == nil && val > 0 {
			maxMembers = val
		}
	}

	return c.JSON(fiber.Map{
		"success":     true,
		"is_leader":   member.IsLeader,
		"max_members": maxMembers,
		"data":        group,
	})
}

func (gc *GroupController) GetGroupByID(c *fiber.Ctx) error {
	idParam := c.Params("id")
	groupID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid group ID"})
	}

	var group models.ProjectGroup
	if err := gc.db.Preload("Advisor").
		Preload("Members.User").
		Preload("Submissions.Step").
		Preload("Submissions.Submitter").
		Preload("Booking.Slot").
		Preload("Booking.Scores.Scorer").
		Where("id = ?", groupID).First(&group).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "Group not found"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    group,
	})
}

func (gc *GroupController) ListGroups(c *fiber.Ctx) error {
	room := c.Query("room")
	academicYear := c.Query("academic_year")
	advisorID := c.Query("advisor_id")
	search := c.Query("search")

	query := gc.db.Model(&models.ProjectGroup{}).
		Preload("Advisor").
		Preload("Members.User").
		Preload("Booking.Slot").
		Order("room ASC, project_name_th ASC")

	if room != "" {
		query = query.Where("room = ?", room)
	}
	if academicYear != "" {
		query = query.Where("academic_year = ?", academicYear)
	}
	if advisorID != "" {
		if advUUID, err := uuid.Parse(advisorID); err == nil {
			query = query.Where("advisor_id = ?", advUUID)
		}
	}
	if search != "" {
		pattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(project_name_th) LIKE ? OR LOWER(project_name_en) LIKE ? OR LOWER(advisor_name) LIKE ?", pattern, pattern, pattern)
	}

	var groups []models.ProjectGroup
	if err := query.Find(&groups).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to fetch groups"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"count":   len(groups),
		"data":    groups,
	})
}

type UpdateGroupRequest struct {
	ProjectNameTH string     `json:"project_name_th"`
	ProjectNameEN string     `json:"project_name_en"`
	AdvisorID     *uuid.UUID `json:"advisor_id"`
	AdvisorName   *string    `json:"advisor_name"`
	Room          *string    `json:"room"`
	AcademicYear  *string    `json:"academic_year"`
}

func (gc *GroupController) UpdateGroup(c *fiber.Ctx) error {
	idParam := c.Params("id")
	groupID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid group ID"})
	}

	userID, _ := c.Locals("userID").(uuid.UUID)
	userRole, _ := c.Locals("userRole").(models.UserRole)

	var group models.ProjectGroup
	if err := gc.db.Where("id = ?", groupID).First(&group).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "Group not found"})
	}

	// Verify permissions: only Admin, Teacher, or Group Leader can update
	if userRole != models.RoleAdmin && userRole != models.RoleTeacher {
		var leaderMember models.GroupMember
		if err := gc.db.Where("group_id = ? AND user_id = ? AND is_leader = true", groupID, userID).First(&leaderMember).Error; err != nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"message": "Only the group leader, teacher, or admin can update group info",
			})
		}
	}

	var req UpdateGroupRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	updates := map[string]interface{}{}
	if strings.TrimSpace(req.ProjectNameTH) != "" {
		updates["project_name_th"] = strings.TrimSpace(req.ProjectNameTH)
	}
	if strings.TrimSpace(req.ProjectNameEN) != "" {
		updates["project_name_en"] = strings.TrimSpace(req.ProjectNameEN)
	}
	if req.Room != nil {
		updates["room"] = *req.Room
	}
	if req.AcademicYear != nil && *req.AcademicYear != "" {
		updates["academic_year"] = *req.AcademicYear
	}
	if req.AdvisorID != nil {
		var advisor models.User
		if err := gc.db.Where("id = ?", *req.AdvisorID).First(&advisor).Error; err == nil {
			updates["advisor_id"] = req.AdvisorID
			updates["advisor_name"] = advisor.FullName
		}
	} else if req.AdvisorName != nil {
		updates["advisor_name"] = *req.AdvisorName
	}

	if len(updates) > 0 {
		if err := gc.db.Model(&group).Updates(updates).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to update group"})
		}
	}

	var updated models.ProjectGroup
	gc.db.Preload("Advisor").Preload("Members.User").Where("id = ?", groupID).First(&updated)

	services.LogActivity(gc.db, &userID, string(userRole), "UPDATE_GROUP", fmt.Sprintf("Updated project group '%s'", updated.ProjectNameTH), c.IP())

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Group updated successfully",
		"data":    updated,
	})
}

func (gc *GroupController) SearchAvailableStudents(c *fiber.Ctx) error {
	search := strings.TrimSpace(c.Query("search"))
	room := strings.TrimSpace(c.Query("room"))

	// Find user_ids that already have a group
	var groupedUserIDs []uuid.UUID
	gc.db.Model(&models.GroupMember{}).Pluck("user_id", &groupedUserIDs)

	query := gc.db.Model(&models.User{}).
		Where("role = ? AND is_active = true", models.RoleStudent)

	if len(groupedUserIDs) > 0 {
		query = query.Where("id NOT IN (?)", groupedUserIDs)
	}

	if room != "" {
		query = query.Where("room = ?", room)
	}

	if search != "" {
		pattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(full_name) LIKE ? OR student_id LIKE ? OR LOWER(email) LIKE ?", pattern, pattern, pattern)
	}

	var students []models.User
	if err := query.Order("room ASC, student_id ASC, full_name ASC").Limit(300).Find(&students).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to search students"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"count":   len(students),
		"data":    students,
	})
}

func (gc *GroupController) ListTeachers(c *fiber.Ctx) error {
	var teachers []models.User
	if err := gc.db.Where("role = ? AND is_active = true", models.RoleTeacher).
		Order("full_name ASC").
		Find(&teachers).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to fetch teachers"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"count":   len(teachers),
		"data":    teachers,
	})
}

type AddMemberRequest struct {
	UserID  uuid.UUID   `json:"user_id"`
	UserIDs []uuid.UUID `json:"user_ids"`
}

func (gc *GroupController) AddMember(c *fiber.Ctx) error {
	idParam := c.Params("id")
	groupID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid group ID"})
	}

	currentUserID, _ := c.Locals("userID").(uuid.UUID)
	currentUserRole, _ := c.Locals("userRole").(models.UserRole)

	// Check permission: leader or admin
	if currentUserRole != models.RoleAdmin {
		var leaderMember models.GroupMember
		if err := gc.db.Where("group_id = ? AND user_id = ? AND is_leader = true", groupID, currentUserID).First(&leaderMember).Error; err != nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"message": "Only the group leader or admin can add members",
			})
		}
	}

	var req AddMemberRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	// Normalize user IDs list
	targetUserIDs := req.UserIDs
	if len(targetUserIDs) == 0 && req.UserID != uuid.Nil {
		targetUserIDs = []uuid.UUID{req.UserID}
	}

	// Deduplicate IDs
	uniqueMap := make(map[uuid.UUID]bool)
	var finalUserIDs []uuid.UUID
	for _, uid := range targetUserIDs {
		if uid != uuid.Nil && !uniqueMap[uid] {
			uniqueMap[uid] = true
			finalUserIDs = append(finalUserIDs, uid)
		}
	}

	if len(finalUserIDs) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "At least one valid user_id is required"})
	}

	// Verify all target users exist and are active students
	var targetUsers []models.User
	if err := gc.db.Where("id IN (?) AND role = ? AND is_active = true", finalUserIDs, models.RoleStudent).Find(&targetUsers).Error; err != nil || len(targetUsers) != len(finalUserIDs) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Some selected students were not found or inactive"})
	}

	// Check if any target user already belongs to any group
	var existingMemberCount int64
	gc.db.Model(&models.GroupMember{}).Where("user_id IN (?)", finalUserIDs).Count(&existingMemberCount)
	if existingMemberCount > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "One or more selected students already belong to a group"})
	}

	// Check max members per group limit
	var maxMembersSetting models.SystemSetting
	maxMembers := 3
	if err := gc.db.Where("key = ?", "max_members_per_group").First(&maxMembersSetting).Error; err == nil {
		if val, err := strconv.Atoi(maxMembersSetting.Value); err == nil && val > 0 {
			maxMembers = val
		}
	}

	var currentMemberCount int64
	gc.db.Model(&models.GroupMember{}).Where("group_id = ?", groupID).Count(&currentMemberCount)
	if int(currentMemberCount)+len(finalUserIDs) > maxMembers {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": fmt.Sprintf("Cannot add %d members: maximum group size (%d members) would be exceeded (current: %d)", len(finalUserIDs), maxMembers, currentMemberCount),
		})
	}

	// Insert members in transaction
	tx := gc.db.Begin()
	for _, uid := range finalUserIDs {
		newMember := models.GroupMember{
			GroupID:  groupID,
			UserID:   uid,
			IsLeader: false,
		}
		if err := tx.Create(&newMember).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to add members"})
		}
	}
	tx.Commit()

	var group models.ProjectGroup
	gc.db.Preload("Members.User").Where("id = ?", groupID).First(&group)

	var names []string
	for _, u := range targetUsers {
		names = append(names, u.FullName)
	}
	services.LogActivity(gc.db, &currentUserID, string(currentUserRole), "ADD_GROUP_MEMBER", fmt.Sprintf("Added %d student(s) (%s) to group %s", len(targetUsers), strings.Join(names, ", "), group.ProjectNameTH), c.IP())

	return c.JSON(fiber.Map{
		"success": true,
		"message": fmt.Sprintf("Added %d member(s) successfully", len(finalUserIDs)),
		"data":    group,
	})
}

func (gc *GroupController) RemoveMember(c *fiber.Ctx) error {
	idParam := c.Params("id")
	groupID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid group ID"})
	}

	targetUserIDParam := c.Params("userId")
	targetUserID, err := uuid.Parse(targetUserIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid user ID"})
	}

	currentUserID, _ := c.Locals("userID").(uuid.UUID)
	currentUserRole, _ := c.Locals("userRole").(models.UserRole)

	// Target member record
	var member models.GroupMember
	if err := gc.db.Preload("User").Where("group_id = ? AND user_id = ?", groupID, targetUserID).First(&member).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "Member not found in this group"})
	}

	// If removing someone else, must be leader or admin
	if targetUserID != currentUserID && currentUserRole != models.RoleAdmin {
		var leaderMember models.GroupMember
		if err := gc.db.Where("group_id = ? AND user_id = ? AND is_leader = true", groupID, currentUserID).First(&leaderMember).Error; err != nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"message": "Only the group leader or admin can remove other members",
			})
		}
	}

	// Cannot remove the leader unless dissolving the group
	if member.IsLeader {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "The group leader cannot be removed. To remove the leader, dissolve the group or transfer leadership.",
		})
	}

	if err := gc.db.Delete(&member).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to remove member"})
	}

	services.LogActivity(gc.db, &currentUserID, string(currentUserRole), "REMOVE_GROUP_MEMBER", fmt.Sprintf("Removed member %s from group %s", member.User.FullName, groupID), c.IP())

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Member removed successfully",
	})
}

func (gc *GroupController) DissolveGroup(c *fiber.Ctx) error {
	idParam := c.Params("id")
	groupID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid group ID"})
	}

	currentUserID, _ := c.Locals("userID").(uuid.UUID)
	currentUserRole, _ := c.Locals("userRole").(models.UserRole)

	var group models.ProjectGroup
	if err := gc.db.Preload("Submissions").Where("id = ?", groupID).First(&group).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "Group not found"})
	}

	// Verify permission: only leader or admin can dissolve
	if currentUserRole != models.RoleAdmin {
		var leaderMember models.GroupMember
		if err := gc.db.Where("group_id = ? AND user_id = ? AND is_leader = true", groupID, currentUserID).First(&leaderMember).Error; err != nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"message": "Only the group leader or admin can dissolve the group",
			})
		}
	}

	// Delete all uploaded files associated with group submissions to free disk space
	for _, sub := range group.Submissions {
		if sub.SubmissionType == models.SubmissionTypeFile && sub.FilePath != "" && !strings.HasPrefix(sub.FilePath, "http") {
			fullPath := filepath.Join(gc.cfg.UploadDir, sub.FilePath)
			_ = os.Remove(fullPath)
		}
	}

	// Delete group (Cascade will delete members, submissions, bookings, scores)
	if err := gc.db.Delete(&group).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to dissolve group"})
	}

	services.LogActivity(gc.db, &currentUserID, string(currentUserRole), "DISSOLVE_GROUP", fmt.Sprintf("Dissolved group '%s' and cleaned up storage", group.ProjectNameTH), c.IP())

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Project group dissolved and files cleaned successfully",
	})
}

func (gc *GroupController) SetGroupLeader(c *fiber.Ctx) error {
	idParam := c.Params("id")
	groupID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid group ID"})
	}

	targetUserIDParam := c.Params("userId")
	targetUserID, err := uuid.Parse(targetUserIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "Invalid user ID"})
	}

	currentUserID, _ := c.Locals("userID").(uuid.UUID)
	currentUserRole, _ := c.Locals("userRole").(models.UserRole)

	// Check permission: leader or admin
	if currentUserRole != models.RoleAdmin {
		var currentLeader models.GroupMember
		if err := gc.db.Where("group_id = ? AND user_id = ? AND is_leader = true", groupID, currentUserID).First(&currentLeader).Error; err != nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"message": "Only the current group leader or admin can transfer leadership",
			})
		}
	}

	// Verify target member is in group
	var targetMember models.GroupMember
	if err := gc.db.Preload("User").Where("group_id = ? AND user_id = ?", groupID, targetUserID).First(&targetMember).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "Member not found in this group"})
	}

	tx := gc.db.Begin()
	// Set all members to false
	if err := tx.Model(&models.GroupMember{}).Where("group_id = ?", groupID).Update("is_leader", false).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to update leaders"})
	}

	// Set target to true
	if err := tx.Model(&models.GroupMember{}).Where("group_id = ? AND user_id = ?", groupID, targetUserID).Update("is_leader", true).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "Failed to assign leader"})
	}

	tx.Commit()

	var updatedGroup models.ProjectGroup
	gc.db.Preload("Advisor").Preload("Members.User").Where("id = ?", groupID).First(&updatedGroup)

	services.LogActivity(gc.db, &currentUserID, string(currentUserRole), "SET_GROUP_LEADER", fmt.Sprintf("Transferred group leadership to %s", targetMember.User.FullName), c.IP())

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Group leader updated successfully",
		"data":    updatedGroup,
	})
}
