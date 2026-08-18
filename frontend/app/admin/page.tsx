"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/lib/api";
import { 
  User, 
  ProjectGroup,
  GroupMember,
  ProjectStep, 
  PresentationSlot, 
  PresentationCriteria, 
  TeacherAssignment, 
  ActivityLog, 
  Role,
  AcademicYear
} from "@/types";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { 
  Users, 
  School, 
  Layers, 
  CalendarCheck, 
  Sliders, 
  History, 
  Plus, 
  Trash2, 
  Edit, 
  KeyRound, 
  UploadCloud, 
  ShieldCheck, 
  Search, 
  Bot,
  Pencil,
  Download,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  UserCheck,
  UserX,
  FolderKanban,
  Crown,
  UserPlus,
  UserMinus,
  Sparkles,
  BookOpen,
  CalendarRange,
  CheckCircle2,
  XCircle,
  Star,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight
} from "lucide-react";

export default function AdminPage() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [steps, setSteps] = useState<ProjectStep[]>([]);
  const [slots, setSlots] = useState<PresentationSlot[]>([]);
  const [criteriaList, setCriteriaList] = useState<PresentationCriteria[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // User Filter & Search & Pagination
  const [userSearch, setUserSearch] = useState("")
  const [userRoleFilter, setUserRoleFilter] = useState<string>("")
  const [userRoomFilter, setUserRoomFilter] = useState<string>("")
  const [userYearFilter, setUserYearFilter] = useState<string>("")
  const [userStatusFilter, setUserStatusFilter] = useState<string>("")
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(25)

  // Group Filter & Search & Pagination
  const [groupSearch, setGroupSearch] = useState("")
  const [groupRoomFilter, setGroupRoomFilter] = useState<string>("")
  const [groupYearFilter, setGroupYearFilter] = useState<string>("")
  const [groupCurrentPage, setGroupCurrentPage] = useState<number>(1)
  const [groupPageSize, setGroupPageSize] = useState<number>(25)

  // Modals
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showImportCSV, setShowImportCSV] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState<User | null>(null)
  const [showEditUser, setShowEditUser] = useState<User | null>(null)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showEditGroup, setShowEditGroup] = useState<ProjectGroup | null>(null)
  const [showManageMembers, setShowManageMembers] = useState<ProjectGroup | null>(null)
  const [showCreateYearModal, setShowCreateYearModal] = useState(false)
  const [showEditYearModal, setShowEditYearModal] = useState<AcademicYear | null>(null)
  const [showStepModal, setShowStepModal] = useState<ProjectStep | null | "CREATE">(null)
  const [showSlotModal, setShowSlotModal] = useState(false)
  const [showCriteriaModal, setShowCriteriaModal] = useState<PresentationCriteria | null | "CREATE">(null)

  // User Form State (Create)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [studentId, setStudentId] = useState("")
  const [userRole, setUserRole] = useState<Role>("STUDENT")
  const [userRoom, setUserRoom] = useState("")
  const [userAcademicYear, setUserAcademicYear] = useState("")
  const [isSubmittingUser, setIsSubmittingUser] = useState(false)

  // User Form State (Edit)
  const [editFullName, setEditFullName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editRole, setEditRole] = useState<Role>("STUDENT")
  const [editStudentId, setEditStudentId] = useState("")
  const [editRoom, setEditRoom] = useState("")
  const [editUserAcademicYear, setEditUserAcademicYear] = useState("")
  const [editIsActive, setEditIsActive] = useState(true)
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importAcademicYear, setImportAcademicYear] = useState("")
  const [isImportingCSV, setIsImportingCSV] = useState(false)

  // Reset Password State
  const [newResetPassword, setNewResetPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // Group Form State (Create)
  const [groupNameTH, setGroupNameTH] = useState("");
  const [groupNameEN, setGroupNameEN] = useState("");
  const [groupRoom, setGroupRoom] = useState("6.1");
  const [groupAcademicYear, setGroupAcademicYear] = useState("2568");
  const [groupAdvisorID, setGroupAdvisorID] = useState<string>("");
  const [groupAdvisorCustom, setGroupAdvisorCustom] = useState("");
  const [groupLeaderID, setGroupLeaderID] = useState<string>("");
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);

  // Group Form State (Edit)
  const [editGroupNameTH, setEditGroupNameTH] = useState("");
  const [editGroupNameEN, setEditGroupNameEN] = useState("");
  const [editGroupRoom, setEditGroupRoom] = useState("");
  const [editGroupAcademicYear, setEditGroupAcademicYear] = useState("2568");
  const [editGroupAdvisorID, setEditGroupAdvisorID] = useState<string>("");
  const [editGroupAdvisorCustom, setEditGroupAdvisorCustom] = useState("");
  const [isSubmittingEditGroup, setIsSubmittingEditGroup] = useState(false);

  // Group Member Management State
  const [availableStudents, setAvailableStudents] = useState<User[]>([]);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);
  const [studentSearchKeyword, setStudentSearchKeyword] = useState("");
  const [selectedAddStudentId, setSelectedAddStudentId] = useState("");

  // Teacher Room Assignment Form
  const [assignTeacherId, setAssignTeacherId] = useState("");
  const [assignRoom, setAssignRoom] = useState("6.1");

  // Academic Year Form State (Create)
  const [yearInput, setYearInput] = useState("2569");
  const [termInput, setTermInput] = useState("1");
  const [isCurrentInput, setIsCurrentInput] = useState(false);
  const [isActiveInput, setIsActiveInput] = useState(true);
  const [isSubmittingYear, setIsSubmittingYear] = useState(false);

  // Academic Year Form State (Edit)
  const [editYearInput, setEditYearInput] = useState("");
  const [editTermInput, setEditTermInput] = useState("1");
  const [editIsCurrentInput, setEditIsCurrentInput] = useState(false);
  const [editIsActiveInput, setEditIsActiveInput] = useState(true);
  const [isSubmittingEditYear, setIsSubmittingEditYear] = useState(false);

  // Step Form State
  const [stepName, setStepName] = useState("");
  const [stepDesc, setStepDesc] = useState("");
  const [stepOrder, setStepOrder] = useState<number>(1);
  const [stepDeadline, setStepDeadline] = useState("");
  const [stepMaxScore, setStepMaxScore] = useState<number>(10);
  const [stepFormPath, setStepFormPath] = useState("");
  const [stepExamplePath, setStepExamplePath] = useState("");

  // Slot Form State
  const [slotStartTime, setSlotStartTime] = useState("");
  const [slotEndTime, setSlotEndTime] = useState("");
  const [slotLocation, setSlotLocation] = useState("");
  const [slotMaxGroups, setSlotMaxGroups] = useState<number>(1);

  // Criteria Form State
  const [critLabel, setCritLabel] = useState("");
  const [critDesc, setCritDesc] = useState("");
  const [critMaxScore, setCritMaxScore] = useState<number>(10);
  const [critOrder, setCritOrder] = useState<number>(1);
  const [critIsActive, setCritIsActive] = useState<boolean>(true);

  // Telegram test state
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);

  const fetchAllAdminData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Users
      const usersRes = await api.get<{ data?: User[]; users?: User[] }>("/admin/users?limit=1000");
      const usersList = usersRes?.data || usersRes?.users || [];
      if (Array.isArray(usersList)) {
        setUsers(usersList);
        setTeachers(usersList.filter((u) => u.role === "TEACHER"));
      }

      // Groups
      const groupsRes = await api.get<{ data?: ProjectGroup[]; count?: number }>("/groups");
      const groupsList = groupsRes?.data || [];
      if (Array.isArray(groupsList)) {
        setGroups(groupsList);
      }

      // Academic Years
      const yearsRes = await api.get<{ data?: AcademicYear[] }>("/admin/academic-years");
      const yearsList = yearsRes?.data || [];
      if (Array.isArray(yearsList)) {
        setAcademicYears(yearsList);
      }

      // Steps
      const stepsRes = await api.get<{ data?: ProjectStep[]; steps?: ProjectStep[] }>("/steps");
      const stepsList = stepsRes?.data || stepsRes?.steps || [];
      if (Array.isArray(stepsList)) {
        setSteps(stepsList);
      }

      // Slots
      const slotsRes = await api.get<{ data?: PresentationSlot[]; slots?: PresentationSlot[] }>("/presentation/slots");
      const slotsList = slotsRes?.data || slotsRes?.slots || [];
      if (Array.isArray(slotsList)) {
        setSlots(slotsList);
      }

      // Criteria
      const critRes = await api.get<{ data?: PresentationCriteria[]; criteria?: PresentationCriteria[] }>("/presentation/criteria");
      const critList = critRes?.data || critRes?.criteria || [];
      if (Array.isArray(critList)) {
        setCriteriaList(critList);
      }

      // Settings
      const setRes = await api.get<{ data?: Record<string, string>; settings?: Record<string, string> }>("/admin/settings");
      const settingsObj = setRes?.data || setRes?.settings;
      if (settingsObj) {
        setSettings(settingsObj);
      }

      // Logs
      const logsRes = await api.get<{ data?: ActivityLog[]; logs?: ActivityLog[] }>("/admin/logs");
      const logsList = logsRes?.data || logsRes?.logs || [];
      if (Array.isArray(logsList)) {
        setLogs(logsList);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "โหลดข้อมูล Admin ไม่สำเร็จ";
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllAdminData();
  }, [fetchAllAdminData]);

  // 1. Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingUser(true)
    try {
      const res = await api.post<{ success: boolean; data?: User; user?: User }>("/admin/users", {
        full_name: fullName.trim(),
        email: email.trim(),
        password: password.trim(),
        role: userRole,
        student_id: studentId.trim() || undefined,
        room: userRoom.trim() || undefined,
        academic_year: userRole === "STUDENT" ? (userAcademicYear.trim() || undefined) : undefined,
      })

      const newUser = res?.data || res?.user
      if (newUser) {
        setUsers((prev) => [newUser, ...prev])
        if (newUser.role === "TEACHER") {
          setTeachers((prev) => [newUser, ...prev])
        }
      }

      toast.success("สร้างบัญชีผู้ใช้สำเร็จ")
      setShowCreateUser(false)
      setFullName("")
      setEmail("")
      setPassword("")
      setStudentId("")
      setUserRoom("")
      setUserAcademicYear("")
      fetchAllAdminData()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "สร้างผู้ใช้ไม่สำเร็จ"
      toast.error(errorMsg)
    } finally {
      setIsSubmittingUser(false)
    }
  }

  // 1.1 Open & Save Edit User
  const handleOpenEditUser = (u: User) => {
    setShowEditUser(u)
    setEditFullName(u.full_name || "")
    setEditEmail(u.email || "")
    setEditRole(u.role || "STUDENT")
    setEditStudentId(u.student_id || "")
    setEditRoom(u.room || "")
    setEditUserAcademicYear(u.academic_year || "")
    setEditIsActive(u.is_active !== undefined ? u.is_active : true)
  }

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showEditUser) return
    setIsSubmittingEdit(true)
    try {
      const res = await api.put<{ success: boolean; data: User; user?: User }>(`/admin/users/${showEditUser.id}`, {
        full_name: editFullName.trim(),
        email: editEmail.trim(),
        role: editRole,
        student_id: editStudentId.trim() || undefined,
        room: editRoom.trim() || undefined,
        academic_year: editRole === "STUDENT" ? (editUserAcademicYear.trim() || undefined) : undefined,
        is_active: editIsActive,
      })

      const updated = res?.data || res?.user
      if (updated) {
        setUsers((prev) => prev.map((u) => (u.id === showEditUser.id ? { ...u, ...updated } : u)))
        if (updated.role === "TEACHER") {
          setTeachers((prev) => {
            const exists = prev.some((t) => t.id === updated.id)
            return exists ? prev.map((t) => (t.id === updated.id ? updated : t)) : [updated, ...prev]
          })
        } else {
          setTeachers((prev) => prev.filter((t) => t.id !== updated.id))
        }
      }

      toast.success("อัปเดตข้อมูลผู้ใช้สำเร็จ")
      setShowEditUser(null)
      fetchAllAdminData()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "อัปเดตผู้ใช้ไม่สำเร็จ"
      toast.error(errorMsg)
    } finally {
      setIsSubmittingEdit(false)
    }
  }

  // 1.2 CSV Import Template Downloader
  const handleDownloadCSVTemplate = () => {
    const headers = "full_name,email,password,role,student_id,room,academic_year\n"
    const sampleRows = [
      "นายสมชาย ใจดี,somchai@tunorth.ac.th,Password123,STUDENT,50101,6.1,2568",
      "นางสาวสมหญิง จริงใจ,somying@tunorth.ac.th,Password123,STUDENT,50102,6.1,2568",
      "ครูสมศักดิ์ รักเรียน,somsak@tunorth.ac.th,Password123,TEACHER,,,",
      "ผู้ดูแลระบบ ทดสอบ,admin2@tunorth.ac.th,Password123,ADMIN,,,",
    ].join("\n")

    const blob = new Blob(["\ufeff" + headers + sampleRows], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "user_import_template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success("ดาวน์โหลดไฟล์แม่แบบ CSV สำหรับนำเข้าผู้ใช้สำเร็จ")
  }

  // 2. Delete User
  const handleDeleteUser = async (userId: string) => {
    if (!confirm("คุณต้องการลบบัญชีผู้ใช้นี้ใช่หรือไม่?")) return
    try {
      await api.delete(`/admin/users/${userId}`)
      toast.success("ลบผู้ใช้สำเร็จ")
      fetchAllAdminData()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "ลบผู้ใช้ไม่สำเร็จ"
      toast.error(errorMsg)
    }
  }

  // 3. Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showResetPassword) return

    setIsResetting(true)
    try {
      await api.post(`/admin/users/${showResetPassword.id}/reset-password`, {
        new_password: newResetPassword,
      })
      toast.success("รีเซ็ตรหัสผ่านสำเร็จ")
      setShowResetPassword(null)
      setNewResetPassword("")
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "รีเซ็ตรหัสผ่านไม่สำเร็จ"
      toast.error(errorMsg)
    } finally {
      setIsResetting(false)
    }
  }

  // 4. CSV Import
  const handleImportCSV = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvFile) return

    setIsImportingCSV(true)
    try {
      const formData = new FormData()
      formData.append("file", csvFile)
      if (importAcademicYear.trim()) {
        formData.append("academic_year", importAcademicYear.trim())
      }
      const res = await api.uploadFormData<{ message: string }>("/admin/users/import-csv", formData)
      toast.success(res.message || "นำเข้าข้อมูลจาก CSV สำเร็จ")
      setShowImportCSV(false)
      setCsvFile(null)
      fetchAllAdminData()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "นำเข้า CSV ไม่สำเร็จ"
      toast.error(errorMsg)
    } finally {
      setIsImportingCSV(false)
    }
  }

  // 5. Archive Old Year Students
  const handleArchiveStudents = async (y: AcademicYear) => {
    if (!confirm(`คุณต้องการปิดการใช้งานบัญชีนักเรียนปีการศึกษา ${y.year} ทั้งหมดใช่หรือไม่?\n(การกระทำนี้จะเปลี่ยนสถานะนักเรียนเป็น Inactive เพื่อไม่ให้แสดงในการค้นหาหรือปะปนกับนักเรียนปีใหม่ แต่ผลงานและข้อมูลโครงงานเดิมจะยังคงอยู่ครบถ้วน)`)) return
    try {
      const res = await api.post<{ message: string }>(`/admin/academic-years/${y.id}/archive-students`, {})
      toast.success(res.message || `ปิดการใช้งานนักเรียนปี ${y.year} สำเร็จ`)
      fetchAllAdminData()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "ปิดการใช้งานนักเรียนไม่สำเร็จ"
      toast.error(errorMsg)
    }
  }

  // ==================== GROUP CRUD HANDLERS ====================
  // Search available students (students without a group)
  const fetchAvailableStudents = async (room?: string, search?: string, academicYear?: string) => {
    setIsSearchingStudents(true)
    try {
      const qRoom = room ? `&room=${encodeURIComponent(room)}` : ""
      const qSearch = search ? `&search=${encodeURIComponent(search)}` : ""
      const qYear = academicYear ? `&academic_year=${encodeURIComponent(academicYear)}` : ""
      const res = await api.get<{ data: User[] }>(`/groups/search-students?${qRoom}${qSearch}${qYear}`)
      setAvailableStudents(res.data || [])
    } catch {
      setAvailableStudents([])
    } finally {
      setIsSearchingStudents(false)
    }
  }

  // 1. Create Group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupNameTH.trim() || !groupNameEN.trim()) {
      toast.error("กรุณาระบุชื่อโครงงานภาษาไทยและภาษาอังกฤษ");
      return;
    }
    if (!groupLeaderID) {
      toast.error("กรุณาเลือกหัวหน้ากลุ่มโครงงาน");
      return;
    }

    setIsSubmittingGroup(true);
    try {
      const body: Record<string, unknown> = {
        project_name_th: groupNameTH.trim(),
        project_name_en: groupNameEN.trim(),
        room: groupRoom.trim() || undefined,
        academic_year: groupAcademicYear.trim() || "2568",
        leader_id: groupLeaderID,
      };

      if (groupAdvisorID === "CUSTOM") {
        body.advisor_name = groupAdvisorCustom.trim();
      } else if (groupAdvisorID) {
        body.advisor_id = groupAdvisorID;
      }

      await api.post("/groups", body);
      toast.success("สร้างกลุ่มโครงงานใหม่สำเร็จ");
      setShowCreateGroup(false);
      setGroupNameTH("");
      setGroupNameEN("");
      setGroupLeaderID("");
      setGroupAdvisorID("");
      setGroupAdvisorCustom("");
      fetchAllAdminData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "สร้างกลุ่มโครงงานไม่สำเร็จ";
      toast.error(errorMsg);
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  // 2. Open Edit Group
  const handleOpenEditGroup = (g: ProjectGroup) => {
    setShowEditGroup(g);
    setEditGroupNameTH(g.project_name_th || "");
    setEditGroupNameEN(g.project_name_en || "");
    setEditGroupRoom(g.room || "");
    setEditGroupAcademicYear(g.academic_year || "2568");
    if (g.advisor_id) {
      setEditGroupAdvisorID(g.advisor_id);
      setEditGroupAdvisorCustom("");
    } else if (g.advisor_name) {
      setEditGroupAdvisorID("CUSTOM");
      setEditGroupAdvisorCustom(g.advisor_name);
    } else {
      setEditGroupAdvisorID("");
      setEditGroupAdvisorCustom("");
    }
  };

  // 3. Save Edit Group
  const handleSaveEditGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditGroup) return;

    setIsSubmittingEditGroup(true);
    try {
      const body: Record<string, unknown> = {
        project_name_th: editGroupNameTH.trim(),
        project_name_en: editGroupNameEN.trim(),
        room: editGroupRoom.trim() || undefined,
        academic_year: editGroupAcademicYear.trim() || "2568",
      };

      if (editGroupAdvisorID === "CUSTOM") {
        body.advisor_name = editGroupAdvisorCustom.trim();
        body.advisor_id = null;
      } else if (editGroupAdvisorID) {
        body.advisor_id = editGroupAdvisorID;
      } else {
        body.advisor_id = null;
        body.advisor_name = "";
      }

      await api.put(`/groups/${showEditGroup.id}`, body);
      toast.success("อัปเดตข้อมูลกลุ่มโครงงานสำเร็จ");
      setShowEditGroup(null);
      fetchAllAdminData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "อัปเดตกลุ่มโครงงานไม่สำเร็จ";
      toast.error(errorMsg);
    } finally {
      setIsSubmittingEditGroup(false);
    }
  };

  // 4. Dissolve / Delete Group
  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`คุณต้องการยุบและลบกลุ่มโครงงาน "${groupName}" ใช่หรือไม่?\n\n* ข้อมูลการส่งงาน ไฟล์แนบ และการจองนำเสนอของกลุ่มนี้จะถูกลบทั้งหมด`)) return;

    try {
      await api.delete(`/groups/${groupId}`);
      toast.success("ยุบและลบกลุ่มโครงงานสำเร็จ");
      fetchAllAdminData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "ลบกลุ่มโครงงานไม่สำเร็จ";
      toast.error(errorMsg);
    }
  };

  // 5. Open Manage Members
  const handleOpenManageMembers = (g: ProjectGroup) => {
    setShowManageMembers(g);
    setSelectedAddStudentId("");
    setStudentSearchKeyword("");
    fetchAvailableStudents(g.room || undefined);
  };

  // 6. Transfer Group Leader
  const handleSetLeader = async (groupId: string, targetUserId: string) => {
    try {
      const res = await api.post<{ success: boolean; data: ProjectGroup }>(`/groups/${groupId}/leader/${targetUserId}`);
      toast.success("เปลี่ยนหัวหน้ากลุ่มสำเร็จ");
      if (showManageMembers && showManageMembers.id === groupId) {
        setShowManageMembers(res.data);
      }
      fetchAllAdminData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "เปลี่ยนหัวหน้ากลุ่มไม่สำเร็จ";
      toast.error(errorMsg);
    }
  };

  // 7. Add Member to Group
  const handleAddMemberToGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showManageMembers || !selectedAddStudentId) return;

    try {
      const res = await api.post<{ success: boolean; data: ProjectGroup }>(`/groups/${showManageMembers.id}/members`, {
        user_id: selectedAddStudentId,
      });
      toast.success("เพิ่มสมาชิกเข้ากลุ่มสำเร็จ");
      setShowManageMembers(res.data);
      setSelectedAddStudentId("");
      fetchAvailableStudents(showManageMembers.room || undefined);
      fetchAllAdminData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "เพิ่มสมาชิกไม่สำเร็จ";
      toast.error(errorMsg);
    }
  };

  // 8. Remove Member from Group
  const handleRemoveMemberFromGroup = async (groupId: string, memberUserId: string, memberName: string) => {
    if (!confirm(`คุณต้องการลบ "${memberName}" ออกจากกลุ่มโครงงานใช่หรือไม่?`)) return;

    try {
      await api.delete(`/groups/${groupId}/members/${memberUserId}`);
      toast.success("ลบสมาชิกออกจากกลุ่มสำเร็จ");
      if (showManageMembers) {
        const gRes = await api.get<{ data: ProjectGroup }>(`/groups/${groupId}`);
        if (gRes?.data) {
          setShowManageMembers(gRes.data);
        }
        fetchAvailableStudents(showManageMembers.room || undefined);
      }
      fetchAllAdminData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "ลบสมาชิกไม่สำเร็จ";
      toast.error(errorMsg);
    }
  };

  // ==========================================
  // ACADEMIC YEAR HANDLERS
  // ==========================================

  // 1. Create Academic Year
  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearInput.trim()) {
      toast.error("กรุณาระบุปีการศึกษา");
      return;
    }

    setIsSubmittingYear(true);
    try {
      const res = await api.post<{ success: boolean; message?: string; data?: AcademicYear }>("/admin/academic-years", {
        year: yearInput.trim(),
        term: termInput.trim() || "1",
        is_current: isCurrentInput,
        is_active: isActiveInput,
      });

      toast.success(res?.message || "สร้างปีการศึกษาสำเร็จ");
      setShowCreateYearModal(false);
      setYearInput("");
      setTermInput("1");
      setIsCurrentInput(false);
      setIsActiveInput(true);
      fetchAllAdminData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "สร้างปีการศึกษาไม่สำเร็จ";
      toast.error(errorMsg);
    } finally {
      setIsSubmittingYear(false);
    }
  };

  // 2. Open Edit Year
  const handleOpenEditYear = (y: AcademicYear) => {
    setShowEditYearModal(y);
    setEditYearInput(y.year);
    setEditTermInput(y.term || "1");
    setEditIsCurrentInput(y.is_current);
    setEditIsActiveInput(y.is_active);
  };

  // 3. Save Edit Year
  const handleSaveEditYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditYearModal || !editYearInput.trim()) return;

    setIsSubmittingEditYear(true);
    try {
      const res = await api.put<{ success: boolean; message?: string }>(`/admin/academic-years/${showEditYearModal.id}`, {
        year: editYearInput.trim(),
        term: editTermInput.trim() || "1",
        is_current: editIsCurrentInput,
        is_active: editIsActiveInput,
      });

      toast.success(res?.message || "บันทึกการแก้ไขปีการศึกษาสำเร็จ");
      setShowEditYearModal(null);
      fetchAllAdminData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "แก้ไขปีการศึกษาไม่สำเร็จ";
      toast.error(errorMsg);
    } finally {
      setIsSubmittingEditYear(false);
    }
  };

  // 4. Set Current Year
  const handleSetCurrentYear = async (yearId: string, yearStr: string, termStr: string) => {
    if (!confirm(`คุณต้องการกำหนด "ปีการศึกษา ${yearStr} (ภาคเรียนที่ ${termStr})" ให้เป็นปีการศึกษาปัจจุบันของระบบใช่หรือไม่?`)) return;

    try {
      const res = await api.post<{ success: boolean; message?: string }>(`/admin/academic-years/${yearId}/set-current`, {});
      toast.success(res?.message || `ตั้งค่าปีการศึกษา ${yearStr}/${termStr} เป็นปีปัจจุบันสำเร็จ`);
      fetchAllAdminData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "ตั้งค่าปีการศึกษาปัจจุบันไม่สำเร็จ";
      toast.error(errorMsg);
    }
  };

  // 5. Delete Year
  const handleDeleteYear = async (y: AcademicYear) => {
    if (y.is_current) {
      toast.error("ไม่สามารถลบปีการศึกษาที่เป็นปีปัจจุบันได้");
      return;
    }

    if (!confirm(`คุณต้องการลบ "ปีการศึกษา ${y.year} (ภาคเรียนที่ ${y.term})" ใช่หรือไม่?`)) return;

    try {
      const res = await api.delete<{ success: boolean; message?: string }>(`/admin/academic-years/${y.id}`);
      toast.success(res?.message || "ลบปีการศึกษาสำเร็จ");
      fetchAllAdminData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "ลบปีการศึกษาไม่สำเร็จ";
      toast.error(errorMsg);
    }
  };

  // 5. Assign Room to Teacher
  const handleAssignRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTeacherId || !assignRoom) return;

    try {
      await api.post("/admin/teacher-assignments", {
        teacher_id: assignTeacherId,
        room: assignRoom,
      });
      toast.success("มอบหมายห้องเรียนสำเร็จ");
      fetchAllAdminData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "มอบหมายห้องเรียนไม่สำเร็จ";
      toast.error(errorMsg);
    }
  };

  // 6. Save Step (Create or Update)
  const handleSaveStep = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        step_name: stepName,
        description: stepDesc,
        step_order: Number(stepOrder),
        deadline: stepDeadline || undefined,
        max_score: Number(stepMaxScore),
        file_form_path: stepFormPath || undefined,
        file_example_path: stepExamplePath || undefined,
        is_active: true,
      };

      if (showStepModal === "CREATE") {
        await api.post("/steps", body);
        toast.success("สร้างขั้นตอนส่งงานสำเร็จ");
      } else if (showStepModal && typeof showStepModal === "object") {
        await api.put(`/steps/${showStepModal.id}`, body);
        toast.success("อัปเดตขั้นตอนส่งงานสำเร็จ");
      }

      setShowStepModal(null);
      fetchAllAdminData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "บันทึกขั้นตอนไม่สำเร็จ";
      toast.error(errorMsg);
    }
  };

  // 7. Create Slot
  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/presentation/slots", {
        academic_year: "2568",
        start_time: new Date(slotStartTime).toISOString(),
        end_time: new Date(slotEndTime).toISOString(),
        location: slotLocation,
        max_groups: Number(slotMaxGroups),
      });

      toast.success("สร้างรอบนำเสนอสำเร็จ");
      setShowSlotModal(false);
      fetchAllAdminData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "สร้างรอบนำเสนอไม่สำเร็จ";
      toast.error(errorMsg);
    }
  };

  // 8. Delete Slot
  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("คุณต้องการลบรอบนำเสนอนี้ใช่หรือไม่?")) return;
    try {
      await api.delete(`/presentation/slots/${slotId}`);
      toast.success("ลบรอบนำเสนอสำเร็จ");
      fetchAllAdminData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "ลบรอบนำเสนอไม่สำเร็จ";
      toast.error(errorMsg);
    }
  };

  // 9. Criteria Management (CRUD, Toggle, Reorder)
  const handleSaveCriteria = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        label: critLabel,
        description: critDesc,
        max_score: Number(critMaxScore),
        criteria_order: Number(critOrder),
        is_active: critIsActive,
      };

      if (showCriteriaModal === "CREATE") {
        await api.post("/presentation/criteria", body);
        toast.success("เพิ่มเกณฑ์ Rubric สำเร็จ");
      } else if (showCriteriaModal && typeof showCriteriaModal === "object") {
        await api.put(`/presentation/criteria/${showCriteriaModal.id}`, body);
        toast.success("อัปเดตเกณฑ์ Rubric สำเร็จ");
      }

      setShowCriteriaModal(null);
      fetchAllAdminData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "บันทึกเกณฑ์ Rubric ไม่สำเร็จ";
      toast.error(errorMsg);
    }
  };

  const handleEditCriteria = (crit: PresentationCriteria) => {
    setShowCriteriaModal(crit);
    setCritLabel(crit.label);
    setCritDesc(crit.description || "");
    setCritMaxScore(crit.max_score);
    setCritOrder(crit.criteria_order);
    setCritIsActive(crit.is_active);
  };

  const handleToggleCriteriaActive = async (crit: PresentationCriteria) => {
    try {
      await api.put(`/presentation/criteria/${crit.id}`, { is_active: !crit.is_active });
      toast.success(crit.is_active ? "ปิดใช้งานเกณฑ์เรียบร้อย" : "เปิดใช้งานเกณฑ์เรียบร้อย");
      fetchAllAdminData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "เปลี่ยนสถานะเกณฑ์ไม่สำเร็จ";
      toast.error(errorMsg);
    }
  };

  const handleMoveCriteria = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= criteriaList.length) return;

    const newCriteriaList = [...criteriaList];
    const temp = newCriteriaList[index];
    newCriteriaList[index] = newCriteriaList[targetIndex];
    newCriteriaList[targetIndex] = temp;

    const payload = newCriteriaList.map((item, idx) => ({
      id: item.id,
      criteria_order: idx + 1,
    }));

    try {
      await api.put("/presentation/criteria/reorder", payload);
      toast.success("จัดลำดับเกณฑ์เรียบร้อย");
      fetchAllAdminData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "จัดลำดับเกณฑ์ไม่สำเร็จ";
      toast.error(errorMsg);
    }
  };

  // 10. Update System Settings
  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put("/admin/settings", settings);
      toast.success("บันทึกการตั้งค่าระบบเรียบร้อย");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "บันทึกการตั้งค่าไม่สำเร็จ";
      toast.error(errorMsg);
    }
  };

  // 11. Test Telegram
  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    try {
      const res = await api.post<{ message: string }>("/admin/settings/test-telegram", {
        bot_token: settings.telegram_bot_token || "",
        chat_id: settings.telegram_chat_id || "",
      });
      toast.success(res.message || "ส่งข้อความทดสอบ Telegram สำเร็จ");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "ทดสอบ Telegram ล้มเหลว";
      toast.error(errorMsg);
    } finally {
      setIsTestingTelegram(false);
    }
  };

  // Dynamically extract available rooms from users
  const availableRooms = Array.from(
    new Set(users.map((u) => u.room).filter((r): r is string => Boolean(r)))
  ).sort((a, b) => {
    const numA = parseFloat(a)
    const numB = parseFloat(b)
    return isNaN(numA) || isNaN(numB) ? a.localeCompare(b) : numA - numB
  })

  // Dynamically extract available academic years for users
  const availableUserYears = Array.from(
    new Set([
      ...academicYears.map((y) => y.year),
      ...users.map((u) => u.academic_year),
    ].filter((y): y is string => Boolean(y)))
  ).sort((a, b) => b.localeCompare(a))

  const filteredUsers = users.filter((u) => {
    const query = userSearch.toLowerCase().trim()
    const matchSearch =
      !query ||
      u.full_name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      (u.student_id && u.student_id.toLowerCase().includes(query))
    const matchRole = userRoleFilter ? u.role === userRoleFilter : true
    const matchRoom = userRoomFilter ? u.room === userRoomFilter : true
    const matchYear = userYearFilter
      ? (u.academic_year === userYearFilter || u.role !== "STUDENT")
      : true
    const matchStatus =
      userStatusFilter === "ACTIVE"
        ? u.is_active === true
        : userStatusFilter === "INACTIVE"
        ? u.is_active === false
        : true
    return matchSearch && matchRole && matchRoom && matchYear && matchStatus
  })

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + pageSize);

  // Safe pagination change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Helper for generating page numbers around current
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  // Group Filter & Pagination Calculations
  const availableYears = Array.from(
    new Set([
      ...academicYears.map((y) => y.year),
      ...groups.map((g) => g.academic_year)
    ].filter((y): y is string => Boolean(y)))
  ).sort((a, b) => b.localeCompare(a));

  const filteredGroups = groups.filter((g) => {
    const query = groupSearch.toLowerCase().trim();
    const matchSearch =
      !query ||
      g.project_name_th?.toLowerCase().includes(query) ||
      g.project_name_en?.toLowerCase().includes(query) ||
      g.advisor_name?.toLowerCase().includes(query) ||
      g.advisor?.full_name?.toLowerCase().includes(query) ||
      g.members?.some(
        (m) =>
          m.user?.full_name?.toLowerCase().includes(query) ||
          m.user?.student_id?.toLowerCase().includes(query) ||
          m.user?.email?.toLowerCase().includes(query)
      );

    const matchRoom = groupRoomFilter ? g.room === groupRoomFilter : true;
    const matchYear = groupYearFilter ? g.academic_year === groupYearFilter : true;

    return matchSearch && matchRoom && matchYear;
  });

  const groupTotalPages = Math.max(1, Math.ceil(filteredGroups.length / groupPageSize));
  const groupStartIndex = (groupCurrentPage - 1) * groupPageSize;
  const paginatedGroups = filteredGroups.slice(groupStartIndex, groupStartIndex + groupPageSize);

  const handleGroupPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= groupTotalPages) {
      setGroupCurrentPage(newPage);
    }
  };

  const getGroupPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (groupTotalPages <= 7) {
      for (let i = 1; i <= groupTotalPages; i++) pages.push(i);
    } else {
      if (groupCurrentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", groupTotalPages);
      } else if (groupCurrentPage >= groupTotalPages - 3) {
        pages.push(1, "...", groupTotalPages - 4, groupTotalPages - 3, groupTotalPages - 2, groupTotalPages - 1, groupTotalPages);
      } else {
        pages.push(1, "...", groupCurrentPage - 1, groupCurrentPage, groupCurrentPage + 1, "...", groupTotalPages);
      }
    }
    return pages;
  };

  return (
    <DashboardLayout allowedRoles={["ADMIN"]} defaultTab="overview">
      {({ activeTab }) => {
        if (isLoading) {
          return (
            <div className="flex flex-col items-center justify-center p-12 space-y-3">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500">กำลังโหลดข้อมูลผู้ดูแลระบบ...</p>
            </div>
          );
        }

        return (
          <>
            {/* ==================== TAB 1: OVERVIEW ==================== */}
            {activeTab === "overview" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-gradient-to-r from-brand-600 to-brand-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
                  <span className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2">
                    Admin Control Panel
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold">
                    ยินดีต้อนรับสู่ระบบบริหารจัดการ TU-North CPMS
                  </h2>
                  <p className="text-brand-100 text-xs sm:text-sm mt-1">
                    ควบคุมผู้ใช้งาน, กำหนดขั้นตอนการประเมิน, จัดการรอบนำเสนอ และตรวจสอบสถานะระบบ
                  </p>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl">
                    <span className="text-xs text-slate-500">ผู้ใช้ทั้งหมด</span>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {users.length}
                    </div>
                    <span className="text-[10px] text-brand-600 font-medium">บัญชีในระบบ</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl">
                    <span className="text-xs text-slate-500">กลุ่มโครงงาน</span>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {groups.length}
                    </div>
                    <span className="text-[10px] text-blue-600 font-medium">กลุ่มทั้งหมด</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl">
                    <span className="text-xs text-slate-500">ขั้นตอนการส่งงาน</span>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {steps.length}
                    </div>
                    <span className="text-[10px] text-emerald-600 font-medium">ขั้นตอนเปิดใช้งาน</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl">
                    <span className="text-xs text-slate-500">รอบนำเสนอทั้งหมด</span>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {slots.length}
                    </div>
                    <span className="text-[10px] text-purple-600 font-medium">รอบการประเมิน</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl">
                    <span className="text-xs text-slate-500">เกณฑ์ Rubric</span>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {criteriaList.length}
                    </div>
                    <span className="text-[10px] text-amber-600 font-medium">ข้อประเมิน</span>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 2: USERS ==================== */}
            {activeTab === "users" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-brand-500" />
                      จัดการบัญชีผู้ใช้งาน (User Management)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      เพิ่ม แก้ไข รีเซ็ตรหัสผ่าน กรองข้อมูล และนำเข้ารายชื่อจากไฟล์ CSV
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleDownloadCSVTemplate}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="ดาวน์โหลดไฟล์แม่แบบ CSV สำหรับใช้เตรียมข้อมูลนำเข้า"
                    >
                      <FileDown className="w-4 h-4 text-brand-500" /> แม่แบบ CSV
                    </button>
                    <button
                      onClick={() => setShowImportCSV(true)}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <UploadCloud className="w-4 h-4 text-brand-500" /> นำเข้า CSV
                    </button>
                    <button
                      onClick={() => setShowCreateUser(true)}
                      className="bg-brand-500 hover:bg-brand-600 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> เพิ่มผู้ใช้ใหม่
                    </button>
                  </div>
                </div>

                {/* Filters & Search Toolbar */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                    {/* Search Input */}
                    <div className="relative md:col-span-2">
                      <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => {
                          setUserSearch(e.target.value)
                          setCurrentPage(1)
                        }}
                        placeholder="ค้นหาตามชื่อ, อีเมล หรือรหัสนักเรียน..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none focus:border-brand-500"
                      />
                    </div>

                    {/* Role Filter */}
                    <div>
                      <select
                        value={userRoleFilter}
                        onChange={(e) => {
                          setUserRoleFilter(e.target.value)
                          setCurrentPage(1)
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none focus:border-brand-500 text-slate-700 dark:text-slate-200"
                      >
                        <option value="">ทุกบทบาท (All Roles)</option>
                        <option value="ADMIN">ADMIN (ผู้ดูแลระบบ)</option>
                        <option value="TEACHER">TEACHER (ครูผู้สอน)</option>
                        <option value="STUDENT">STUDENT (นักเรียน)</option>
                      </select>
                    </div>

                    {/* Room Filter */}
                    <div>
                      <select
                        value={userRoomFilter}
                        onChange={(e) => {
                          setUserRoomFilter(e.target.value)
                          setCurrentPage(1)
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none focus:border-brand-500 text-slate-700 dark:text-slate-200"
                      >
                        <option value="">ทุกห้องเรียน (All Rooms)</option>
                        {availableRooms.map((rm) => (
                          <option key={rm} value={rm}>
                            ห้อง ม.{rm}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Academic Year Filter */}
                    <div>
                      <select
                        value={userYearFilter}
                        onChange={(e) => {
                          setUserYearFilter(e.target.value)
                          setCurrentPage(1)
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none focus:border-brand-500 text-slate-700 dark:text-slate-200 font-bold"
                      >
                        <option value="">ทุกปีการศึกษา (All Years)</option>
                        {availableUserYears.map((yr) => (
                          <option key={yr} value={yr}>
                            ปีการศึกษา {yr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Status filter & Page Size Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Filter className="w-3.5 h-3.5 text-brand-500" /> สถานะ:
                      </span>
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setUserStatusFilter("")
                            setCurrentPage(1)
                          }}
                          className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                            userStatusFilter === ""
                              ? "bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-bold"
                              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          ทั้งหมด ({users.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUserStatusFilter("ACTIVE")
                            setCurrentPage(1)
                          }}
                          className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                            userStatusFilter === "ACTIVE"
                              ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
                              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          เปิดใช้งาน
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUserStatusFilter("INACTIVE")
                            setCurrentPage(1)
                          }}
                          className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                            userStatusFilter === "INACTIVE"
                              ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-bold"
                              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          ระงับการใช้งาน
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span>แสดงต่อหน้า:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value))
                          setCurrentPage(1)
                        }}
                        className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none focus:border-brand-500 font-bold text-slate-700 dark:text-slate-200"
                      >
                        <option value={10}>10 รายการ</option>
                        <option value={25}>25 รายการ</option>
                        <option value={50}>50 รายการ</option>
                        <option value={100}>100 รายการ</option>
                        <option value={250}>250 รายการ</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Table */}
                {/* Table */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                        <tr>
                          <th className="p-4">ชื่อ-นามสกุล</th>
                          <th className="p-4">อีเมล / รหัสนักเรียน</th>
                          <th className="p-4">บทบาท</th>
                          <th className="p-4">ห้อง / ปีการศึกษา</th>
                          <th className="p-4 text-center">สถานะ</th>
                          <th className="p-4 text-right">การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {paginatedUsers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400">
                              ไม่พบข้อมูลผู้ใช้ที่ตรงกับเงื่อนไขการค้นหา
                            </td>
                          </tr>
                        ) : (
                          paginatedUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/50 transition-colors">
                              <td className="p-4 font-bold text-slate-900 dark:text-white">
                                <div className="flex items-center gap-2">
                                  <span>{u.full_name}</span>
                                </div>
                              </td>
                              <td className="p-4 text-slate-600 dark:text-slate-400 font-en">
                                <div>{u.email}</div>
                                {u.student_id && (
                                  <div className="text-[11px] text-slate-400 font-normal">
                                    รหัส: {u.student_id}
                                  </div>
                                )}
                              </td>
                              <td className="p-4">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                    u.role === "ADMIN"
                                      ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                                      : u.role === "TEACHER"
                                      ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                  }`}
                                >
                                  {u.role}
                                </span>
                              </td>
                              <td className="p-4 text-slate-600 dark:text-slate-400">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{u.room ? `ม.${u.room}` : "-"}</span>
                                  {u.role === "STUDENT" && u.academic_year && (
                                    <span className="text-[10px] font-bold text-brand-600 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/80 px-1.5 py-0.5 rounded-md border border-brand-200/60 dark:border-brand-800/60">
                                      ปี {u.academic_year}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                {u.is_active !== false ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                                    <UserCheck className="w-3 h-3" /> ปกติ
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md">
                                    <UserX className="w-3 h-3" /> ระงับ
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-right space-x-1">
                                <button
                                  onClick={() => handleOpenEditUser(u)}
                                  className="text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="แก้ไขข้อมูลผู้ใช้"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setShowResetPassword(u)
                                    setNewResetPassword("")
                                  }}
                                  className="text-amber-600 hover:text-amber-700 dark:text-amber-400 p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors cursor-pointer"
                                  title="รีเซ็ตรหัสผ่าน"
                                >
                                  <KeyRound className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                  title="ลบผู้ใช้"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  {filteredUsers.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-xs">
                      <div className="text-slate-500 dark:text-slate-400">
                        แสดง{" "}
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {startIndex + 1}
                        </span>{" "}
                        -{" "}
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {Math.min(startIndex + pageSize, filteredUsers.length)}
                        </span>{" "}
                        จากทั้งหมด{" "}
                        <span className="font-bold text-brand-600 dark:text-brand-400">
                          {filteredUsers.length}
                        </span>{" "}
                        รายการ {filteredUsers.length !== users.length && `(กรองจาก ${users.length} ผู้ใช้)`}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                          title="หน้าก่อนหน้า"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-1">
                          {getPageNumbers().map((pg, idx) => {
                            if (pg === "...") {
                              return (
                                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-400">
                                  ...
                                </span>
                              );
                            }
                            const isCurrent = pg === currentPage;
                            return (
                              <button
                                key={`page-${pg}`}
                                onClick={() => handlePageChange(Number(pg))}
                                className={`min-w-[32px] h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  isCurrent
                                    ? "bg-brand-500 text-white shadow-xs"
                                    : "border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900"
                                }`}
                              >
                                {pg}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                          title="หน้าถัดไป"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ==================== TAB: GROUPS ==================== */}
            {activeTab === "groups" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FolderKanban className="w-4 h-4 text-brand-500" />
                      จัดการกลุ่มโครงงาน (Project Groups Management)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      สร้าง แก้ไข มอบหมายครูที่ปรึกษา จัดการสมาชิกในกลุ่ม และยุบโครงงาน
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowCreateGroup(true);
                        setGroupNameTH("");
                        setGroupNameEN("");
                        setGroupRoom(availableRooms[0] || "6.1");
                        setGroupAcademicYear("2568");
                        setGroupAdvisorID("");
                        setGroupAdvisorCustom("");
                        setGroupLeaderID("");
                        fetchAvailableStudents(availableRooms[0] || "6.1");
                      }}
                      className="bg-brand-500 hover:bg-brand-600 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> สร้างกลุ่มโครงงานใหม่
                    </button>
                  </div>
                </div>

                {/* Filters & Search Toolbar */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Search Input */}
                    <div className="relative md:col-span-2">
                      <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={groupSearch}
                        onChange={(e) => {
                          setGroupSearch(e.target.value);
                          setGroupCurrentPage(1);
                        }}
                        placeholder="ค้นหาตามชื่อโครงงาน (ไทย/อังกฤษ), ครูที่ปรึกษา หรือชื่อ/รหัสนักเรียน..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none focus:border-brand-500"
                      />
                    </div>

                    {/* Room Filter */}
                    <div>
                      <select
                        value={groupRoomFilter}
                        onChange={(e) => {
                          setGroupRoomFilter(e.target.value);
                          setGroupCurrentPage(1);
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none focus:border-brand-500 text-slate-700 dark:text-slate-200"
                      >
                        <option value="">ทุกห้องเรียน (All Rooms)</option>
                        {availableRooms.map((rm) => (
                          <option key={rm} value={rm}>
                            ห้อง ม.{rm}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Academic Year Filter */}
                    <div>
                      <select
                        value={groupYearFilter}
                        onChange={(e) => {
                          setGroupYearFilter(e.target.value);
                          setGroupCurrentPage(1);
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none focus:border-brand-500 text-slate-700 dark:text-slate-200"
                      >
                        <option value="">ทุกปีการศึกษา</option>
                        {availableYears.map((yr) => (
                          <option key={yr} value={yr}>
                            ปีการศึกษา {yr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Footer of Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        จำนวนโครงงานที่พบ:
                      </span>
                      <span className="font-bold text-brand-600 dark:text-brand-400">
                        {filteredGroups.length} กลุ่ม
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span>แสดงต่อหน้า:</span>
                      <select
                        value={groupPageSize}
                        onChange={(e) => {
                          setGroupPageSize(Number(e.target.value));
                          setGroupCurrentPage(1);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none focus:border-brand-500 font-bold text-slate-700 dark:text-slate-200"
                      >
                        <option value={10}>10 รายการ</option>
                        <option value={25}>25 รายการ</option>
                        <option value={50}>50 รายการ</option>
                        <option value={100}>100 รายการ</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Groups Table */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                        <tr>
                          <th className="p-4 min-w-[240px]">ชื่อโครงงาน (TH / EN)</th>
                          <th className="p-4 w-28">ห้อง / ปี</th>
                          <th className="p-4 min-w-[150px]">ครูที่ปรึกษา</th>
                          <th className="p-4 min-w-[280px]">สมาชิกในกลุ่ม</th>
                          <th className="p-4 text-right min-w-[140px]">การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {paginatedGroups.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400">
                              ไม่พบข้อมูลกลุ่มโครงงานที่ตรงกับเงื่อนไขการค้นหา
                            </td>
                          </tr>
                        ) : (
                          paginatedGroups.map((g) => {
                            const advisorDisplay = g.advisor?.full_name || g.advisor_name || "ยังไม่ระบุ";
                            const members = g.members || [];
                            const leader = members.find((m) => m.is_leader);

                            return (
                              <tr key={g.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/50 transition-colors">
                                <td className="p-4">
                                  <div className="font-bold text-slate-900 dark:text-white text-xs leading-relaxed">
                                    {g.project_name_th}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-en mt-0.5">
                                    {g.project_name_en}
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="font-bold text-slate-800 dark:text-slate-200">
                                    {g.room ? `ม.${g.room}` : "-"}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    ปี {g.academic_year}
                                  </div>
                                </td>
                                <td className="p-4">
                                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                                    <School className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                                    {advisorDisplay}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <div className="flex flex-wrap gap-1.5">
                                    {members.map((m) => (
                                      <span
                                        key={m.id}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium ${
                                          m.is_leader
                                            ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold border border-amber-300/40"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                        }`}
                                        title={`${m.user?.full_name} (${m.user?.student_id || "-"})`}
                                      >
                                        {m.is_leader && <Crown className="w-3 h-3 text-amber-500" />}
                                        {m.user?.full_name?.split(" ")[0] || "สมาชิก"}
                                        {m.user?.student_id && (
                                          <span className="text-[9px] opacity-70">({m.user.student_id})</span>
                                        )}
                                      </span>
                                    ))}
                                    {members.length === 0 && (
                                      <span className="text-slate-400 text-[11px]">ไม่มีสมาชิก</span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-4 text-right space-x-1">
                                  <button
                                    onClick={() => handleOpenManageMembers(g)}
                                    className="text-brand-600 hover:text-brand-700 dark:text-brand-400 p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/50 transition-colors cursor-pointer inline-flex items-center gap-1"
                                    title="จัดการสมาชิกในกลุ่ม"
                                  >
                                    <Users className="w-4 h-4" />
                                    <span className="hidden xl:inline text-[11px] font-bold">สมาชิก</span>
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditGroup(g)}
                                    className="text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    title="แก้ไขข้อมูลโครงงาน"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteGroup(g.id, g.project_name_th)}
                                    className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                    title="ยุบและลบกลุ่มโครงงาน"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  {filteredGroups.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-xs">
                      <div className="text-slate-500 dark:text-slate-400">
                        แสดง{" "}
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {groupStartIndex + 1}
                        </span>{" "}
                        -{" "}
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {Math.min(groupStartIndex + groupPageSize, filteredGroups.length)}
                        </span>{" "}
                        จากทั้งหมด{" "}
                        <span className="font-bold text-brand-600 dark:text-brand-400">
                          {filteredGroups.length}
                        </span>{" "}
                        กลุ่ม {filteredGroups.length !== groups.length && `(กรองจาก ${groups.length} กลุ่ม)`}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleGroupPageChange(groupCurrentPage - 1)}
                          disabled={groupCurrentPage === 1}
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                          title="หน้าก่อนหน้า"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-1">
                          {getGroupPageNumbers().map((pg, idx) => {
                            if (pg === "...") {
                              return (
                                <span key={`group-ellipsis-${idx}`} className="px-2 py-1 text-slate-400">
                                  ...
                                </span>
                              );
                            }
                            const isCurrent = pg === groupCurrentPage;
                            return (
                              <button
                                key={`group-page-${pg}`}
                                onClick={() => handleGroupPageChange(Number(pg))}
                                className={`min-w-[32px] h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  isCurrent
                                    ? "bg-brand-500 text-white shadow-xs"
                                    : "border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900"
                                }`}
                              >
                                {pg}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => handleGroupPageChange(groupCurrentPage + 1)}
                          disabled={groupCurrentPage === groupTotalPages}
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                          title="หน้าถัดไป"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ==================== TAB: ACADEMIC YEARS ==================== */}
            {activeTab === "academic-years" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <CalendarRange className="w-4 h-4 text-brand-500" />
                      จัดการปีการศึกษาและภาคเรียน (Academic Years & Terms)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      กำหนดปีการศึกษาปัจจุบัน ควบคุมการเปิด-ปิดใช้งาน และตรวจสอบจำนวนโครงงานในแต่ละปี
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setYearInput("");
                      setTermInput("1");
                      setIsCurrentInput(false);
                      setIsActiveInput(true);
                      setShowCreateYearModal(true);
                    }}
                    className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 cursor-pointer w-fit"
                  >
                    <Plus className="w-4 h-4" /> เพิ่มปีการศึกษาใหม่
                  </button>
                </div>

                {/* Summary Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Card 1: Current Year */}
                  <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 dark:border-amber-900/60 rounded-3xl p-5 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                        ปีการศึกษาปัจจุบัน (Current Year)
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <Crown className="w-4 h-4" />
                      </div>
                    </div>
                    {(() => {
                      const currentYr = academicYears.find((y) => y.is_current);
                      return currentYr ? (
                        <div className="mt-2">
                          <div className="text-2xl font-bold text-slate-900 dark:text-white font-en">
                            {currentYr.year}
                          </div>
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                            ภาคเรียนที่ {currentYr.term} · ค่าเริ่มต้นทั่วทั้งระบบ
                          </p>
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-slate-400 font-medium">
                          ยังไม่ได้กำหนดปีปัจจุบัน
                        </div>
                      );
                    })()}
                  </div>

                  {/* Card 2: Total Years */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        ปีการศึกษาทั้งหมด
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950 flex items-center justify-center text-brand-600">
                        <CalendarRange className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2 font-en">
                      {academicYears.length}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      เปิดใช้งาน {academicYears.filter((y) => y.is_active).length} ภาคเรียน
                    </p>
                  </div>

                  {/* Card 3: Total Groups */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        กลุ่มโครงงานรวมทุกปี
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600">
                        <FolderKanban className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2 font-en">
                      {groups.length}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      กลุ่มโครงงานในระบบ
                    </p>
                  </div>
                </div>

                {/* Academic Years Table */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                        <tr>
                          <th className="p-4 w-32">ปีการศึกษา</th>
                          <th className="p-4 w-28">ภาคเรียน</th>
                          <th className="p-4 min-w-[160px]">สถานะ</th>
                          <th className="p-4 w-28">กลุ่มโครงงาน</th>
                          <th className="p-4 w-28">นักเรียน</th>
                          <th className="p-4 min-w-[140px]">วันที่สร้าง</th>
                          <th className="p-4 text-right min-w-[240px]">การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {academicYears.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400">
                              ไม่พบข้อมูลปีการศึกษาในระบบ กรุณากด "เพิ่มปีการศึกษาใหม่"
                            </td>
                          </tr>
                        ) : (
                          academicYears.map((y) => (
                            <tr key={y.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/50 transition-colors">
                              <td className="p-4">
                                <div className="font-bold text-slate-900 dark:text-white text-sm font-en flex items-center gap-2">
                                  <CalendarRange className="w-4 h-4 text-brand-500" />
                                  <span>{y.year}</span>
                                </div>
                              </td>
                              <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                                ภาคเรียนที่ {y.term}
                              </td>
                              <td className="p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  {y.is_current && (
                                    <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-bold px-2.5 py-1 rounded-full text-[11px] inline-flex items-center gap-1 border border-amber-300 dark:border-amber-800 shadow-xs">
                                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                      ปีปัจจุบัน (Current)
                                    </span>
                                  )}
                                  {y.is_active ? (
                                    <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-md text-[11px] inline-flex items-center gap-1 border border-emerald-200 dark:border-emerald-900">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                      เปิดใช้งาน
                                    </span>
                                  ) : (
                                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold px-2 py-0.5 rounded-md text-[11px] inline-flex items-center gap-1">
                                      <XCircle className="w-3 h-3 text-slate-400" />
                                      ปิดใช้งาน
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="font-bold text-slate-900 dark:text-white font-en">
                                  {y.group_count ?? 0}
                                </span>{" "}
                                <span className="text-slate-400 text-[11px]">กลุ่ม</span>
                              </td>
                              <td className="p-4">
                                <span className="font-bold text-brand-600 dark:text-brand-400 font-en">
                                  {y.student_count ?? 0}
                                </span>{" "}
                                <span className="text-slate-400 text-[11px]">คน</span>
                              </td>
                              <td className="p-4 text-slate-500 text-[11px]">
                                {y.created_at ? formatDate(y.created_at) : "-"}
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  {!y.is_current && (
                                    <button
                                      onClick={() => handleSetCurrentYear(y.id, y.year, y.term)}
                                      className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-amber-200/80 dark:border-amber-900/60 shadow-2xs"
                                      title="กำหนดเป็นปีการศึกษาปัจจุบันของระบบ"
                                    >
                                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                                      <span>ตั้งเป็นปีปัจจุบัน</span>
                                    </button>
                                  )}
                                  {!y.is_current && (y.student_count ?? 0) > 0 && (
                                    <button
                                      onClick={() => handleArchiveStudents(y)}
                                      className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                                      title="ปิดการใช้งานบัญชีนักเรียนปีนี้ทั้งหมด"
                                    >
                                      <UserMinus className="w-3.5 h-3.5 text-slate-500" />
                                      <span>ปิดบัญชีนักเรียน</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleOpenEditYear(y)}
                                    className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    title="แก้ไขปีการศึกษา"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  {!y.is_current && (
                                    <button
                                      onClick={() => handleDeleteYear(y)}
                                      className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                      title="ลบปีการศึกษา"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 3: ROOMS ==================== */}
            {activeTab === "rooms" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <School className="w-4 h-4 text-brand-500" />
                  มอบหมายห้องเรียนประจำสำหรับครูผู้สอน
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <form
                    onSubmit={handleAssignRoom}
                    className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm h-fit"
                  >
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      เพิ่มการมอบหมายห้องเรียน
                    </h4>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        เลือกอาจารย์ผู้สอน
                      </label>
                      <select
                        required
                        value={assignTeacherId}
                        onChange={(e) => setAssignTeacherId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none"
                      >
                        <option value="">-- เลือกครูผู้สอน --</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.full_name} ({t.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        ห้องเรียน (เช่น 6.1, 6.2, 6.3)
                      </label>
                      <input
                        type="text"
                        required
                        value={assignRoom}
                        onChange={(e) => setAssignRoom(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-2 rounded-xl text-xs shadow-md transition-all cursor-pointer"
                    >
                      บันทึกการมอบหมาย
                    </button>
                  </form>

                  <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      รายการครูประจำห้องเรียน ม.6
                    </h4>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {teachers.map((t) => (
                        <div key={t.id} className="py-3 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white text-xs">
                              {t.full_name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-en block">
                              {t.email}
                            </span>
                          </div>
                          <span className="bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-300 text-xs font-bold px-3 py-1 rounded-xl">
                            ห้อง ม.{t.room || "ทุกห้อง"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 4: STEPS ==================== */}
            {activeTab === "steps" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-brand-500" />
                      กำหนดขั้นตอนการส่งงาน (Project Steps Configuration)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      กำหนดลำดับ, กำหนดวันส่ง (Deadline), คะแนนเต็ม และไฟล์แบบฟอร์ม
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setShowStepModal("CREATE");
                      setStepName("");
                      setStepDesc("");
                      setStepOrder(steps.length + 1);
                      setStepDeadline("");
                      setStepMaxScore(10);
                      setStepFormPath("");
                      setStepExamplePath("");
                    }}
                    className="bg-brand-500 hover:bg-brand-600 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> เพิ่มขั้นตอนใหม่
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {steps.map((st) => (
                    <div
                      key={st.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-brand-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {st.step_order}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                              {st.step_name}
                            </h4>
                            <span className="text-xs font-bold text-brand-600 bg-brand-50 dark:bg-brand-950 px-2 py-0.5 rounded-md">
                              คะแนนเต็ม: {st.max_score}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {st.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setShowStepModal(st);
                            setStepName(st.step_name);
                            setStepDesc(st.description);
                            setStepOrder(st.step_order);
                            setStepDeadline(st.deadline ? st.deadline.slice(0, 16) : "");
                            setStepMaxScore(st.max_score);
                            setStepFormPath(st.file_form_path || "");
                            setStepExamplePath(st.file_example_path || "");
                          }}
                          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                          title="แก้ไขขั้นตอน"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm("คุณต้องการลบขั้นตอนนี้ใช่หรือไม่?")) {
                              await api.delete(`/steps/${st.id}`);
                              toast.success("ลบขั้นตอนสำเร็จ");
                              fetchAllAdminData();
                            }
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-xl transition-colors cursor-pointer"
                          title="ลบขั้นตอน"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ==================== TAB 5: DEFENSE & RUBRIC ==================== */}
            {activeTab === "defense" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Defense Slots */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <CalendarCheck className="w-4 h-4 text-brand-500" />
                        จัดการรอบนำเสนอโครงงาน (Presentation Defense Slots)
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowSlotModal(true)}
                      className="bg-brand-500 hover:bg-brand-600 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> เพิ่มรอบนำเสนอ
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {slots.map((slot) => (
                      <div
                        key={slot.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                              {slot.location}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {formatDate(slot.start_time)} - {formatDate(slot.end_time)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-2.5 py-1 rounded-lg inline-block">
                          จองแล้ว {slot.bookings?.length || 0} / {slot.max_groups} กลุ่ม
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rubric Criteria */}
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-brand-500" />
                        เกณฑ์การประเมิน Rubric (Rubric Criteria)
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        คะแนนเต็มรวมทั้งหมดของเกณฑ์ที่เปิดใช้งาน:{" "}
                        <span className="font-bold text-brand-600 dark:text-brand-400">
                          {criteriaList.filter((c) => c.is_active).reduce((sum, c) => sum + Number(c.max_score || 0), 0)} คะแนน
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowCriteriaModal("CREATE");
                        setCritLabel("");
                        setCritDesc("");
                        setCritMaxScore(10);
                        setCritOrder(criteriaList.length + 1);
                        setCritIsActive(true);
                      }}
                      className="bg-brand-500 hover:bg-brand-600 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> เพิ่มเกณฑ์ Rubric
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {criteriaList.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                        ยังไม่มีเกณฑ์การประเมิน Rubric ในระบบ คลิก "เพิ่มเกณฑ์ Rubric" เพื่อเริ่มต้นสร้าง
                      </div>
                    ) : (
                      criteriaList.map((crit, idx) => (
                        <div
                          key={crit.id}
                          className={`bg-white dark:bg-slate-900 border ${
                            crit.is_active ? "border-slate-200/80 dark:border-slate-800" : "border-slate-200/40 dark:border-slate-800/40 opacity-70 bg-slate-50/50 dark:bg-slate-950/40"
                          } rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all hover:shadow-sm`}
                        >
                          <div className="flex items-start gap-3 flex-1">
                            {/* Reorder Buttons */}
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveCriteria(idx, "up")}
                                title="เลื่อนขึ้น"
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === criteriaList.length - 1}
                                onClick={() => handleMoveCriteria(idx, "down")}
                                title="เลื่อนลง"
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 dark:text-white text-xs">
                                  {crit.criteria_order}. {crit.label}
                                </span>
                                <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/70 border border-brand-200/50 dark:border-brand-800/50 px-2 py-0.5 rounded-md">
                                  เต็ม {crit.max_score} คะแนน
                                </span>
                                {crit.is_active ? (
                                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/50 dark:border-emerald-800/50 px-2 py-0.5 rounded-md">
                                    เปิดใช้งาน
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                    ปิดใช้งาน
                                  </span>
                                )}
                              </div>
                              {crit.description && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{crit.description}</p>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleToggleCriteriaActive(crit)}
                              title={crit.is_active ? "คลิกเพื่อปิดใช้งาน" : "คลิกเพื่อเปิดใช้งาน"}
                              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                                crit.is_active
                                  ? "text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  : "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                              }`}
                            >
                              {crit.is_active ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-emerald-500" />}
                              <span className="text-[10px]">{crit.is_active ? "ปิด" : "เปิด"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEditCriteria(crit)}
                              title="แก้ไขเกณฑ์"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 cursor-pointer transition-all"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`ต้องการลบเกณฑ์ "${crit.label}" หรือไม่?`)) {
                                  try {
                                    await api.delete(`/presentation/criteria/${crit.id}`);
                                    toast.success("ลบเกณฑ์ Rubric สำเร็จ");
                                    fetchAllAdminData();
                                  } catch (err: unknown) {
                                    const errorMsg = err instanceof Error ? err.message : "ลบเกณฑ์ไม่สำเร็จ";
                                    toast.error(errorMsg);
                                  }
                                }
                              }}
                              title="ลบเกณฑ์"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 hover:text-red-700 cursor-pointer transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 6: SETTINGS ==================== */}
            {activeTab === "settings" && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm animate-in fade-in duration-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-brand-500" />
                      การตั้งค่าระบบ & Telegram Alert
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      ปรับแต่งการทำงานของระบบ TU-North CPMS
                    </p>
                  </div>

                  <button
                    onClick={handleTestTelegram}
                    disabled={isTestingTelegram}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Bot className="w-4 h-4" />
                    {isTestingTelegram ? "กำลังทดสอบ..." : "ทดสอบส่ง Telegram"}
                  </button>
                </div>

                <form onSubmit={handleUpdateSettings} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        ชื่อระบบ (System Name)
                      </label>
                      <input
                        type="text"
                        value={settings["system_name"] || ""}
                        onChange={(e) => setSettings({ ...settings, system_name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        จำนวนสมาชิกสูงสุดต่อกลุ่ม (Max Members per Group)
                      </label>
                      <input
                        type="number"
                        value={settings["max_members_per_group"] || "3"}
                        onChange={(e) => setSettings({ ...settings, max_members_per_group: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Telegram Bot Token
                      </label>
                      <input
                        type="password"
                        value={settings["telegram_bot_token"] || ""}
                        onChange={(e) => setSettings({ ...settings, telegram_bot_token: e.target.value })}
                        placeholder="Token จาก BotFather"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 font-en"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Telegram Chat ID (กลุ่มคุณครู / แจ้งเตือนส่งงาน)
                      </label>
                      <input
                        type="text"
                        value={settings["telegram_chat_id"] || ""}
                        onChange={(e) => setSettings({ ...settings, telegram_chat_id: e.target.value })}
                        placeholder="เช่น -100123456789"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 font-en"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer"
                    >
                      บันทึกการตั้งค่าทั้งหมด
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ==================== TAB 7: LOGS ==================== */}
            {activeTab === "logs" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-brand-500" />
                  บันทึกกิจกรรมความปลอดภัยของระบบ (Activity Audit Logs)
                </h3>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                        <tr>
                          <th className="p-4">วันเวลา</th>
                          <th className="p-4">บทบาท</th>
                          <th className="p-4">Action</th>
                          <th className="p-4">รายละเอียด</th>
                          <th className="p-4">IP Address</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-en">
                        {logs.map((lg) => (
                          <tr key={lg.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/50">
                            <td className="p-4 text-slate-500">
                              {formatDate(lg.created_at)}
                            </td>
                            <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                              {lg.user_role}
                            </td>
                            <td className="p-4 font-mono font-semibold text-brand-600 dark:text-brand-400">
                              {lg.action}
                            </td>
                            <td className="p-4 text-slate-900 dark:text-white font-sans">
                              {lg.description}
                            </td>
                            <td className="p-4 text-slate-400">
                              {lg.ip_address}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Modal: Create User */}
            <Modal
              isOpen={showCreateUser}
              onClose={() => setShowCreateUser(false)}
              title="เพิ่มบัญชีผู้ใช้ใหม่"
              icon={Users}
              maxWidth="md"
            >
              <form onSubmit={handleCreateUser} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">ชื่อ-นามสกุล *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">อีเมล (Email) *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-en"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">รหัสผ่าน *</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">บทบาท (Role)</label>
                    <select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value as Role)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      <option value="STUDENT">STUDENT</option>
                      <option value="TEACHER">TEACHER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold">ห้อง (เช่น 6.1)</label>
                    <input
                      type="text"
                      value={userRoom}
                      onChange={(e) => setUserRoom(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                    />
                  </div>
                </div>

                {userRole === "STUDENT" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">รหัสนักเรียน</label>
                      <input
                        type="text"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        placeholder="เช่น 50101"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-en"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">ปีการศึกษา</label>
                      <input
                        type="text"
                        value={userAcademicYear}
                        onChange={(e) => setUserAcademicYear(e.target.value)}
                        placeholder="เช่น 2568"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-en"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateUser(false)}
                    className="flex-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingUser}
                    className="flex-1 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    สร้างผู้ใช้
                  </button>
                </div>
              </form>
            </Modal>

            {/* Modal: Edit User */}
            <Modal
              isOpen={!!showEditUser}
              onClose={() => setShowEditUser(null)}
              title="แก้ไขข้อมูลผู้ใช้"
              description={showEditUser ? `ID: ${showEditUser.id.slice(0, 8)}...` : undefined}
              icon={Pencil}
              maxWidth="md"
            >
              {showEditUser && (
                <form onSubmit={handleSaveEditUser} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">ชื่อ-นามสกุล *</label>
                    <input
                      type="text"
                      required
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold">อีเมล (Email) *</label>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-en"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">บทบาท (Role)</label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as Role)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                      >
                        <option value="STUDENT">STUDENT</option>
                        <option value="TEACHER">TEACHER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold">ห้อง (เช่น 6.1)</label>
                      <input
                        type="text"
                        value={editRoom}
                        onChange={(e) => setEditRoom(e.target.value)}
                        placeholder="เช่น 6.1"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                      />
                    </div>
                  </div>

                  {editRole === "STUDENT" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold">รหัสนักเรียน</label>
                        <input
                          type="text"
                          value={editStudentId}
                          onChange={(e) => setEditStudentId(e.target.value)}
                          placeholder="เช่น 50101"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-en"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold">ปีการศึกษา</label>
                        <input
                          type="text"
                          value={editUserAcademicYear}
                          onChange={(e) => setEditUserAcademicYear(e.target.value)}
                          placeholder="เช่น 2568"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-en"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 pt-1">
                    <label className="text-xs font-semibold">สถานะบัญชี</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditIsActive(true)}
                        className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                          editIsActive
                            ? "bg-emerald-500 text-white shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}
                      >
                        เปิดใช้งาน (Active)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditIsActive(false)}
                        className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                          !editIsActive
                            ? "bg-rose-500 text-white shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}
                      >
                        ระงับการใช้งาน
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowEditUser(null)}
                      className="flex-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingEdit}
                      className="flex-1 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingEdit ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                    </button>
                  </div>
                </form>
              )}
            </Modal>

            {/* Modal: CSV Import */}
            <Modal
              isOpen={showImportCSV}
              onClose={() => setShowImportCSV(false)}
              title="นำเข้าข้อมูลผู้ใช้จาก CSV"
              icon={UploadCloud}
              maxWidth="md"
            >
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-brand-50/50 dark:bg-brand-950/30 border border-brand-200/60 dark:border-brand-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-700 dark:text-brand-300">
                      ยังไม่มีไฟล์แม่แบบ CSV?
                    </span>
                    <button
                      type="button"
                      onClick={handleDownloadCSVTemplate}
                      className="text-xs font-bold text-brand-600 hover:text-brand-800 dark:text-brand-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <FileDown className="w-3.5 h-3.5" /> ดาวน์โหลด Template
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Header ที่กำหนด: <code className="font-mono text-brand-600 dark:text-brand-400">full_name, email, password, role, student_id, room, academic_year</code>
                  </p>
                </div>

                <form onSubmit={handleImportCSV} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      ปีการศึกษาเป้าหมาย (สำหรับบัญชีนักเรียน)
                    </label>
                    <select
                      value={importAcademicYear}
                      onChange={(e) => setImportAcademicYear(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200"
                    >
                      <option value="">ใช้ปีการศึกษาปัจจุบันของระบบ</option>
                      {availableYears.map((yr) => (
                        <option key={yr} value={yr}>
                          ปีการศึกษา {yr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      เลือกไฟล์ .csv ที่เตรียมไว้
                    </label>
                    <input
                      type="file"
                      accept=".csv"
                      required
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-500 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-brand-50 dark:file:bg-brand-950 file:text-brand-700 dark:file:text-brand-300 file:font-semibold cursor-pointer"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowImportCSV(false)}
                      className="flex-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={isImportingCSV}
                      className="flex-1 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                    >
                      {isImportingCSV ? "กำลังนำเข้า..." : "เริ่มนำเข้าข้อมูล"}
                    </button>
                  </div>
                </form>
              </div>
            </Modal>

            {/* Modal: Reset Password */}
            <Modal
              isOpen={!!showResetPassword}
              onClose={() => setShowResetPassword(null)}
              title={showResetPassword ? `รีเซ็ตรหัสผ่าน: ${showResetPassword.full_name}` : undefined}
              maxWidth="md"
            >
              {showResetPassword && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">รหัสผ่านใหม่</label>
                    <input
                      type="password"
                      required
                      value={newResetPassword}
                      onChange={(e) => setNewResetPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(null)}
                      className="flex-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={isResetting}
                      className="flex-1 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold cursor-pointer"
                    >
                      ยืนยันรีเซ็ต
                    </button>
                  </div>
                </form>
              )}
            </Modal>

            {/* Modal: Step Edit / Create */}
            <Modal
              isOpen={!!showStepModal}
              onClose={() => setShowStepModal(null)}
              title={showStepModal === "CREATE" ? "เพิ่มขั้นตอนส่งงาน" : "แก้ไขขั้นตอนส่งงาน"}
              maxWidth="lg"
            >
              <form onSubmit={handleSaveStep} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">ชื่อขั้นตอน *</label>
                  <input
                    type="text"
                    required
                    value={stepName}
                    onChange={(e) => setStepName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">คำอธิบาย</label>
                  <textarea
                    rows={2}
                    value={stepDesc}
                    onChange={(e) => setStepDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">ลำดับ</label>
                    <input
                      type="number"
                      required
                      value={stepOrder}
                      onChange={(e) => setStepOrder(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">คะแนนเต็ม</label>
                    <input
                      type="number"
                      required
                      value={stepMaxScore}
                      onChange={(e) => setStepMaxScore(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">กำหนดส่ง</label>
                    <input
                      type="datetime-local"
                      value={stepDeadline}
                      onChange={(e) => setStepDeadline(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">ลิงก์แบบฟอร์ม / Template</label>
                  <input
                    type="text"
                    value={stepFormPath}
                    onChange={(e) => setStepFormPath(e.target.value)}
                    placeholder="https://... หรือ uploads/..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-en"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">ลิงก์ตัวอย่างเอกสาร</label>
                  <input
                    type="text"
                    value={stepExamplePath}
                    onChange={(e) => setStepExamplePath(e.target.value)}
                    placeholder="https://... หรือ uploads/..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-en"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowStepModal(null)}
                    className="flex-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    บันทึก
                  </button>
                </div>
              </form>
            </Modal>

            {/* Modal: Slot Create */}
            <Modal
              isOpen={showSlotModal}
              onClose={() => setShowSlotModal(false)}
              title="เพิ่มรอบนำเสนอโครงงาน"
              maxWidth="md"
            >
              <form onSubmit={handleCreateSlot} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">สถานที่ / ห้องสอบ *</label>
                  <input
                    type="text"
                    required
                    value={slotLocation}
                    onChange={(e) => setSlotLocation(e.target.value)}
                    placeholder="เช่น ห้องคอมพิวเตอร์ 1"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">เวลาเริ่มต้น *</label>
                  <input
                    type="datetime-local"
                    required
                    value={slotStartTime}
                    onChange={(e) => setSlotStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">เวลาสิ้นสุด *</label>
                  <input
                    type="datetime-local"
                    required
                    value={slotEndTime}
                    onChange={(e) => setSlotEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">จำนวนกลุ่มสูงสุด</label>
                  <input
                    type="number"
                    required
                    value={slotMaxGroups}
                    onChange={(e) => setSlotMaxGroups(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSlotModal(false)}
                    className="flex-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    สร้างรอบ
                  </button>
                </div>
              </form>
            </Modal>

            {/* Modal: Create Group */}
            <Modal
              isOpen={showCreateGroup}
              onClose={() => setShowCreateGroup(false)}
              title="สร้างกลุ่มโครงงานใหม่"
              icon={FolderKanban}
              maxWidth="lg"
            >
              <form onSubmit={handleCreateGroup} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">ชื่อโครงงาน (ภาษาไทย) *</label>
                  <input
                    type="text"
                    required
                    value={groupNameTH}
                    onChange={(e) => setGroupNameTH(e.target.value)}
                    placeholder="เช่น ระบบรดน้ำต้นไม้อัตโนมัติด้วย IoT"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">ชื่อโครงงาน (ภาษาอังกฤษ) *</label>
                  <input
                    type="text"
                    required
                    value={groupNameEN}
                    onChange={(e) => setGroupNameEN(e.target.value)}
                    placeholder="เช่น Smart Watering System using IoT"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-en text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">ห้องเรียน *</label>
                    <select
                      value={groupRoom}
                      onChange={(e) => {
                        setGroupRoom(e.target.value);
                        fetchAvailableStudents(e.target.value);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                    >
                      {availableRooms.map((rm) => (
                        <option key={rm} value={rm}>
                          ห้อง ม.{rm}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold">ปีการศึกษา *</label>
                    {availableYears.length > 0 ? (
                      <select
                        value={groupAcademicYear}
                        onChange={(e) => setGroupAcademicYear(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                      >
                        {availableYears.map((yr) => (
                          <option key={yr} value={yr}>
                            ปีการศึกษา {yr}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        value={groupAcademicYear}
                        onChange={(e) => setGroupAcademicYear(e.target.value)}
                        placeholder="2568"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">ครูที่ปรึกษา</label>
                  <select
                    value={groupAdvisorID}
                    onChange={(e) => setGroupAdvisorID(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">-- ยังไม่ระบุครูที่ปรึกษา --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} ({t.email})
                      </option>
                    ))}
                    <option value="CUSTOM">ระบุชื่อครูที่ปรึกษาเอง (Custom)</option>
                  </select>
                </div>

                {groupAdvisorID === "CUSTOM" && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">ชื่อครูที่ปรึกษา (พิมพ์เอง)</label>
                    <input
                      type="text"
                      required
                      value={groupAdvisorCustom}
                      onChange={(e) => setGroupAdvisorCustom(e.target.value)}
                      placeholder="เช่น คุณครูสมศักดิ์ รักเรียน"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold flex items-center justify-between">
                    <span>เลือกหัวหน้ากลุ่ม (จากนักเรียนที่ยังไม่มีกลุ่ม) *</span>
                    {isSearchingStudents && <span className="text-[10px] text-slate-400">กำลังโหลด...</span>}
                  </label>
                  <select
                    required
                    value={groupLeaderID}
                    onChange={(e) => setGroupLeaderID(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">-- เลือกนักเรียนเป็นหัวหน้ากลุ่ม --</option>
                    {availableStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} {s.student_id ? `(${s.student_id})` : ""} - ม.{s.room || groupRoom}
                      </option>
                    ))}
                  </select>
                  {availableStudents.length === 0 && !isSearchingStudents && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                      ⚠️ ไม่พบนักเรียนที่ยังไม่มีกลุ่มในห้องนี้ (นักเรียนทุกคนมีกลุ่มครบแล้ว)
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateGroup(false)}
                    className="flex-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingGroup || !groupLeaderID}
                    className="flex-1 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingGroup ? "กำลังสร้าง..." : "สร้างกลุ่มโครงงาน"}
                  </button>
                </div>
              </form>
            </Modal>

            {/* Modal: Edit Group */}
            <Modal
              isOpen={!!showEditGroup}
              onClose={() => setShowEditGroup(null)}
              title="แก้ไขข้อมูลกลุ่มโครงงาน"
              description={showEditGroup ? `ID: ${showEditGroup.id.slice(0, 8)}...` : undefined}
              icon={Pencil}
              maxWidth="lg"
            >
              {showEditGroup && (
                <form onSubmit={handleSaveEditGroup} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">ชื่อโครงงาน (ภาษาไทย) *</label>
                    <input
                      type="text"
                      required
                      value={editGroupNameTH}
                      onChange={(e) => setEditGroupNameTH(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold">ชื่อโครงงาน (ภาษาอังกฤษ) *</label>
                    <input
                      type="text"
                      required
                      value={editGroupNameEN}
                      onChange={(e) => setEditGroupNameEN(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-en text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">ห้องเรียน</label>
                      <select
                        value={editGroupRoom}
                        onChange={(e) => setEditGroupRoom(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                      >
                        {availableRooms.map((rm) => (
                          <option key={rm} value={rm}>
                            ห้อง ม.{rm}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold">ปีการศึกษา</label>
                      {availableYears.length > 0 ? (
                        <select
                          value={editGroupAcademicYear}
                          onChange={(e) => setEditGroupAcademicYear(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                        >
                          {availableYears.map((yr) => (
                            <option key={yr} value={yr}>
                              ปีการศึกษา {yr}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          required
                          value={editGroupAcademicYear}
                          onChange={(e) => setEditGroupAcademicYear(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold">ครูที่ปรึกษา</label>
                    <select
                      value={editGroupAdvisorID}
                      onChange={(e) => setEditGroupAdvisorID(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="">-- ยังไม่ระบุครูที่ปรึกษา --</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.full_name} ({t.email})
                        </option>
                      ))}
                      <option value="CUSTOM">ระบุชื่อครูที่ปรึกษาเอง (Custom)</option>
                    </select>
                  </div>

                  {editGroupAdvisorID === "CUSTOM" && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">ชื่อครูที่ปรึกษา (พิมพ์เอง)</label>
                      <input
                        type="text"
                        required
                        value={editGroupAdvisorCustom}
                        onChange={(e) => setEditGroupAdvisorCustom(e.target.value)}
                        placeholder="เช่น คุณครูสมศักดิ์ รักเรียน"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  )}

                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowEditGroup(null)}
                      className="flex-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingEditGroup}
                      className="flex-1 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingEditGroup ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                    </button>
                  </div>
                </form>
              )}
            </Modal>

            {/* Modal: Manage Members */}
            <Modal
              isOpen={!!showManageMembers}
              onClose={() => setShowManageMembers(null)}
              title="จัดการสมาชิกกลุ่มโครงงาน"
              description={showManageMembers ? `${showManageMembers.project_name_th} (ห้อง ม.${showManageMembers.room || "-"})` : undefined}
              icon={Users}
              maxWidth="xl"
            >
              {showManageMembers && (
                <div className="space-y-5">
                  {/* Member List */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      รายชื่อสมาชิกปัจจุบัน ({showManageMembers.members?.length || 0} คน)
                    </label>

                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                      {showManageMembers.members?.map((m) => (
                        <div key={m.id} className="p-3.5 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/50">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              m.is_leader ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            }`}>
                              {m.is_leader ? <Crown className="w-4 h-4 text-amber-500" /> : <Users className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                                <span>{m.user?.full_name}</span>
                                {m.is_leader && (
                                  <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded font-bold">
                                    หัวหน้ากลุ่ม
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-en truncate">
                                {m.user?.email} {m.user?.student_id ? `· รหัส ${m.user.student_id}` : ""}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {!m.is_leader && (
                              <button
                                onClick={() => handleSetLeader(showManageMembers.id, m.user_id)}
                                className="text-[11px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                title="ตั้งเป็นหัวหน้ากลุ่ม"
                              >
                                <Crown className="w-3 h-3" /> แต่งตั้งหัวหน้า
                              </button>
                            )}
                            {!m.is_leader && (
                              <button
                                onClick={() => handleRemoveMemberFromGroup(showManageMembers.id, m.user_id, m.user?.full_name || "สมาชิก")}
                                className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                title="ลบออกจากกลุ่ม"
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add Member Form */}
                  <form onSubmit={handleAddMemberToGroup} className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-brand-500" />
                      เพิ่มสมาชิกใหม่เข้ากลุ่ม
                    </label>

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={selectedAddStudentId}
                          onChange={(e) => setSelectedAddStudentId(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-brand-500"
                        >
                          <option value="">-- เลือกนักเรียนที่ยังไม่มีกลุ่ม --</option>
                          {availableStudents.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.full_name} {s.student_id ? `(${s.student_id})` : ""} - ม.{s.room || showManageMembers.room}
                            </option>
                          ))}
                        </select>

                        <button
                          type="submit"
                          disabled={!selectedAddStudentId}
                          className="bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" /> เพิ่ม
                        </button>
                      </div>

                      {availableStudents.length === 0 && (
                        <p className="text-[11px] text-slate-400">
                          ℹ️ ไม่พบนักเรียนที่ยังไม่มีกลุ่มในห้อง ม.{showManageMembers.room}
                        </p>
                      )}
                    </div>
                  </form>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowManageMembers(null)}
                      className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                    >
                      ปิดหน้าต่าง
                    </button>
                  </div>
                </div>
              )}
            </Modal>

            {/* Modal: Criteria Create / Edit */}
            <Modal
              isOpen={!!showCriteriaModal}
              onClose={() => setShowCriteriaModal(null)}
              title={showCriteriaModal === "CREATE" ? "เพิ่มเกณฑ์ Rubric" : "แก้ไขเกณฑ์ Rubric"}
              maxWidth="md"
            >
              <form onSubmit={handleSaveCriteria} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    หัวข้อเกณฑ์การประเมิน <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={critLabel}
                    onChange={(e) => setCritLabel(e.target.value)}
                    placeholder="เช่น ความคิดสร้างสรรค์และคุณค่าของโครงงาน"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    คำอธิบายเกณฑ์และแนวทางการให้คะแนน
                  </label>
                  <textarea
                    rows={3}
                    value={critDesc}
                    onChange={(e) => setCritDesc(e.target.value)}
                    placeholder="ระบุแนวทางการให้คะแนน เช่น ความแปลกใหม่ ประโยชน์ที่ได้รับ และการประยุกต์ใช้เทคโนโลยี"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-colors leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      คะแนนเต็ม <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={0.5}
                      step={0.5}
                      value={critMaxScore}
                      onChange={(e) => setCritMaxScore(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      ลำดับการแสดงผล <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={critOrder}
                      onChange={(e) => setCritOrder(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Active Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <label className="relative inline-flex items-center cursor-pointer gap-2.5">
                    <input
                      type="checkbox"
                      checked={critIsActive}
                      onChange={(e) => setCritIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-brand-500 focus:ring-brand-400 dark:focus:ring-brand-500 dark:bg-slate-950 border-slate-300 dark:border-slate-700"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      เปิดใช้งานเกณฑ์นี้ในการประเมิน (Active)
                    </span>
                  </label>
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCriteriaModal(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-sm cursor-pointer transition-colors"
                  >
                    บันทึกข้อมูล
                  </button>
                </div>
              </form>
            </Modal>

            {/* Modal: Create Academic Year */}
            <Modal
              isOpen={showCreateYearModal}
              onClose={() => setShowCreateYearModal(false)}
              title="เพิ่มปีการศึกษาใหม่"
              description="กำหนดปีการศึกษาและภาคเรียนสำหรับการดำเนินงานโครงงาน"
              icon={CalendarRange}
              maxWidth="md"
            >
              <form onSubmit={handleCreateYear} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    ปีการศึกษา (พ.ศ.) *
                  </label>
                  <input
                    type="text"
                    required
                    value={yearInput}
                    onChange={(e) => setYearInput(e.target.value)}
                    placeholder="เช่น 2569"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-en text-slate-900 dark:text-white outline-none focus:border-brand-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    ระบุเป็นตัวเลขปี พ.ศ. เช่น 2568, 2569
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    ภาคเรียน (Term) *
                  </label>
                  <select
                    value={termInput}
                    onChange={(e) => setTermInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-brand-500"
                  >
                    <option value="1">ภาคเรียนที่ 1</option>
                    <option value="2">ภาคเรียนที่ 2</option>
                    <option value="3">ภาคเรียนฤดูร้อน (Summer)</option>
                  </select>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActiveInput}
                      onChange={(e) => setIsActiveInput(e.target.checked)}
                      className="w-4 h-4 rounded text-brand-500 focus:ring-brand-400 border-slate-300"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        เปิดใช้งานปีการศึกษานี้ (Active)
                      </span>
                      <p className="text-[11px] text-slate-400">
                        อนุญาตให้เลือกปีการศึกษานี้ในการลงทะเบียนและตัวกรอง
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer bg-amber-50/50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200/50 dark:border-amber-900/30">
                    <input
                      type="checkbox"
                      checked={isCurrentInput}
                      onChange={(e) => setIsCurrentInput(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300"
                    />
                    <div>
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                        <Crown className="w-3.5 h-3.5 text-amber-500" />
                        กำหนดให้เป็นปีการศึกษาปัจจุบันทันที (Set as Current)
                      </span>
                      <p className="text-[11px] text-amber-700/70 dark:text-amber-400/70">
                        ระบบจะใช้ปีนี้เป็นค่าเริ่มต้นสำหรับการส่งงานและสร้างกลุ่มใหม่
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateYearModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingYear || !yearInput.trim()}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingYear ? "กำลังบันทึก..." : "สร้างปีการศึกษา"}
                  </button>
                </div>
              </form>
            </Modal>

            {/* Modal: Edit Academic Year */}
            <Modal
              isOpen={!!showEditYearModal}
              onClose={() => setShowEditYearModal(null)}
              title="แก้ไขข้อมูลปีการศึกษา"
              description={showEditYearModal ? `ปีการศึกษา ${showEditYearModal.year} (ภาคเรียนที่ ${showEditYearModal.term})` : undefined}
              icon={Pencil}
              maxWidth="md"
            >
              {showEditYearModal && (
                <form onSubmit={handleSaveEditYear} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      ปีการศึกษา (พ.ศ.) *
                    </label>
                    <input
                      type="text"
                      required
                      value={editYearInput}
                      onChange={(e) => setEditYearInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-en text-slate-900 dark:text-white outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      ภาคเรียน (Term) *
                    </label>
                    <select
                      value={editTermInput}
                      onChange={(e) => setEditTermInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-brand-500"
                    >
                      <option value="1">ภาคเรียนที่ 1</option>
                      <option value="2">ภาคเรียนที่ 2</option>
                      <option value="3">ภาคเรียนฤดูร้อน (Summer)</option>
                    </select>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editIsActiveInput}
                        onChange={(e) => setEditIsActiveInput(e.target.checked)}
                        className="w-4 h-4 rounded text-brand-500 focus:ring-brand-400 border-slate-300"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          เปิดใช้งานปีการศึกษานี้ (Active)
                        </span>
                        <p className="text-[11px] text-slate-400">
                          เมื่อปิดใช้งาน จะไม่แสดงปีนี้ในรายการเลือกของระบบ
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer bg-amber-50/50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200/50 dark:border-amber-900/30">
                      <input
                        type="checkbox"
                        checked={editIsCurrentInput}
                        onChange={(e) => setEditIsCurrentInput(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300"
                      />
                      <div>
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                          กำหนดให้เป็นปีการศึกษาปัจจุบัน (Current Academic Year)
                        </span>
                        <p className="text-[11px] text-amber-700/70 dark:text-amber-400/70">
                          เปลี่ยนปีการศึกษาหลักของระบบทันที
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowEditYearModal(null)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingEditYear || !editYearInput.trim()}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingEditYear ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                    </button>
                  </div>
                </form>
              )}
            </Modal>
          </>
        );
      }}
    </DashboardLayout>
  );
}
