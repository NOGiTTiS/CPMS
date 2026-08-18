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
import { formatDate, compareRooms } from "@/lib/utils"
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
  Check, 
  X, 
  Copy, 
  CopyCheck,
  Calendar,
  Clock,
  MapPin,
  Globe,
  Image as ImageIcon,
  ListOrdered,
  Shuffle,
  Bell,
  BellOff,
  Info,
  Save,
  CheckCircle,
  AlertCircle,
  Wifi,
  Cloud,
  Server,
  Activity,
  Terminal,
  ExternalLink
} from "lucide-react"

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
  const [assignTeacherId, setAssignTeacherId] = useState("")
  const [selectedAssignRooms, setSelectedAssignRooms] = useState<string[]>([])
  const [customRoomInput, setCustomRoomInput] = useState("")
  const [isAssigningRooms, setIsAssigningRooms] = useState(false)
  const [teacherSearchFilter, setTeacherSearchFilter] = useState("")
  const [selectedAssignmentYear, setSelectedAssignmentYear] = useState<string>("")
  const [showCloneModal, setShowCloneModal] = useState(false)
  const [cloneFromYear, setCloneFromYear] = useState("")
  const [cloneToYear, setCloneToYear] = useState("")
  const [isCloning, setIsCloning] = useState(false)

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
  const [slotStartTime, setSlotStartTime] = useState("")
  const [slotEndTime, setSlotEndTime] = useState("")
  const [slotLocation, setSlotLocation] = useState("")
  const [slotMaxGroups, setSlotMaxGroups] = useState<number>(1)

  // Week navigation state for Defense Slots Timetable
  const [slotWeekStart, setSlotWeekStart] = useState<Date>(() => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const mon = new Date(d)
    mon.setDate(diff)
    mon.setHours(0, 0, 0, 0)
    return mon
  })

  // Batch Slot Form State
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchDates, setBatchDates] = useState<string[]>([])
  const [batchPeriods, setBatchPeriods] = useState<number[]>([1, 2, 3, 4, 6, 7, 8, 9])
  const [batchLocation, setBatchLocation] = useState("Meeting Room")
  const [batchMaxGroups, setBatchMaxGroups] = useState<number>(1)
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false)

  // Criteria Form State
  const [critLabel, setCritLabel] = useState("");
  const [critDesc, setCritDesc] = useState("");
  const [critMaxScore, setCritMaxScore] = useState<number>(10);
  const [critOrder, setCritOrder] = useState<number>(1);
  const [critIsActive, setCritIsActive] = useState<boolean>(true);

  // System Settings states
  const [isTestingTelegram, setIsTestingTelegram] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [showBotToken, setShowBotToken] = useState(false)

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
      const yearsRes = await api.get<{ data?: AcademicYear[] }>("/admin/academic-years")
      const yearsList = yearsRes?.data || []
      if (Array.isArray(yearsList)) {
        setAcademicYears(yearsList)
        const currYear = yearsList.find((y) => y.is_current)?.year || yearsList[0]?.year || "2568"
        setSelectedAssignmentYear((prev) => prev || currYear)
        setUserYearFilter((prev) => prev || currYear)
        setGroupYearFilter((prev) => prev || currYear)
        setGroupAcademicYear((prev) => (prev === "2568" ? currYear : prev))
        setUserAcademicYear((prev) => (!prev ? currYear : prev))
        setImportAcademicYear((prev) => (!prev ? currYear : prev))
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

  // 5. Assign Rooms to Teacher (Multi-Select Batch Sync by Academic Year)
  const activeCurrentYear = academicYears.find((y) => y.is_current)?.year || "2568"
  const currentAssignedYear = selectedAssignmentYear || activeCurrentYear

  const handleSelectTeacherForAssignment = (teacherId: string, targetYear?: string) => {
    setAssignTeacherId(teacherId)
    if (!teacherId) {
      setSelectedAssignRooms([])
      return
    }
    const yearToUse = targetYear || currentAssignedYear
    const t = teachers.find((u) => u.id === teacherId)
    if (t && t.teacher_assignments && t.teacher_assignments.length > 0) {
      const yearAssignments = t.teacher_assignments.filter(
        (a) => (a.academic_year || "2568") === yearToUse
      )
      setSelectedAssignRooms(yearAssignments.map((a) => a.room))
    } else {
      setSelectedAssignRooms([])
    }
  }

  const toggleRoomSelection = (room: string) => {
    setSelectedAssignRooms((prev) =>
      prev.includes(room) ? prev.filter((r) => r !== room) : [...prev, room]
    )
  }

  const handleSelectAllRooms = (roomsList: string[]) => {
    setSelectedAssignRooms(roomsList)
  }

  const handleClearAllRooms = () => {
    setSelectedAssignRooms([])
  }

  const handleSelectOddRooms = (roomsList: string[]) => {
    const odd = roomsList.filter((r) => {
      const parts = r.split(".")
      const num = parseInt(parts[parts.length - 1], 10)
      return !isNaN(num) && num % 2 !== 0
    })
    setSelectedAssignRooms(odd)
  }

  const handleSelectEvenRooms = (roomsList: string[]) => {
    const even = roomsList.filter((r) => {
      const parts = r.split(".")
      const num = parseInt(parts[parts.length - 1], 10)
      return !isNaN(num) && num % 2 === 0
    })
    setSelectedAssignRooms(even)
  }

  const handleAddCustomRoom = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = customRoomInput.trim()
    if (!trimmed) return
    if (!selectedAssignRooms.includes(trimmed)) {
      setSelectedAssignRooms((prev) => [...prev, trimmed])
    }
    setCustomRoomInput("")
  }

  const handleAssignRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignTeacherId) {
      toast.error("กรุณาเลือกครูผู้สอน")
      return
    }
    const yearToUse = currentAssignedYear

    try {
      setIsAssigningRooms(true)
      await api.post("/admin/teacher-assignments", {
        teacher_id: assignTeacherId,
        rooms: selectedAssignRooms,
        academic_year: yearToUse
      })
      toast.success(
        selectedAssignRooms.length > 0
          ? `บันทึกการมอบหมาย ${selectedAssignRooms.length} ห้องเรียน (ปีการศึกษา ${yearToUse}) สำเร็จ`
          : `ยกเลิกการมอบหมายห้องทั้งหมดของครูในปี ${yearToUse} สำเร็จ`
      )
      await fetchAllAdminData()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "มอบหมายห้องเรียนไม่สำเร็จ"
      toast.error(errorMsg)
    } finally {
      setIsAssigningRooms(false)
    }
  }

  const handleRemoveTeacherAssignment = async (assignmentId: string, room: string, teacherName: string) => {
    if (!confirm(`ยืนยันยกเลิกการมอบหมายห้อง ม.${room} สำหรับ ${teacherName}?`)) return

    try {
      await api.delete(`/admin/teacher-assignments/${assignmentId}`)
      toast.success(`ยกเลิกห้อง ม.${room} สำเร็จ`)
      await fetchAllAdminData()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "ยกเลิกการมอบหมายไม่สำเร็จ"
      toast.error(errorMsg)
    }
  }

  const handleCloneAssignments = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cloneFromYear || !cloneToYear) {
      toast.error("กรุณาเลือกปีต้นทางและปีปลายทาง")
      return
    }
    if (cloneFromYear === cloneToYear) {
      toast.error("ปีต้นทางและปีปลายทางต้องไม่เหมือนกัน")
      return
    }

    try {
      setIsCloning(true)
      const res = await api.post<{ success: boolean; message: string; cloned_count: number }>(
        "/admin/teacher-assignments/clone",
        {
          from_year: cloneFromYear,
          to_year: cloneToYear
        }
      )
      toast.success(res?.message || "คัดลอกข้อมูลสำเร็จ")
      setShowCloneModal(false)
      setSelectedAssignmentYear(cloneToYear)
      await fetchAllAdminData()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "คัดลอกการมอบหมายไม่สำเร็จ"
      toast.error(errorMsg)
    } finally {
      setIsCloning(false)
    }
  }

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

  // Period constants & Timetable helpers
  const PERIODS = [
    { id: 1, name: "คาบ 1", time: "08:30 - 09:20", startH: 8, startM: 30, endH: 9, endM: 20 },
    { id: 2, name: "คาบ 2", time: "09:20 - 10:10", startH: 9, startM: 20, endH: 10, endM: 10 },
    { id: 3, name: "คาบ 3", time: "10:10 - 11:00", startH: 10, startM: 10, endH: 11, endM: 0 },
    { id: 4, name: "คาบ 4", time: "11:00 - 11:50", startH: 11, startM: 0, endH: 11, endM: 50 },
    { id: 6, name: "คาบ 6", time: "12:40 - 13:30", startH: 12, startM: 40, endH: 13, endM: 30 },
    { id: 7, name: "คาบ 7", time: "13:30 - 14:20", startH: 13, startM: 30, endH: 14, endM: 20 },
    { id: 8, name: "คาบ 8", time: "14:20 - 15:10", startH: 14, startM: 20, endH: 15, endM: 10 },
    { id: 9, name: "คาบ 9", time: "15:10 - 16:00", startH: 15, startM: 10, endH: 16, endM: 0 },
  ]

  const getWeekDates = (startDate: Date) => {
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + i)
      return d
    })
  }

  const formatDayName = (date: Date) => {
    const days = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"]
    return days[date.getDay()] || ""
  }

  const formatShortDate = (date: Date) => {
    const dd = String(date.getDate()).padStart(2, "0")
    const mm = String(date.getMonth() + 1).padStart(2, "0")
    return `${dd}/${mm}`
  }

  const formatWeekRange = (startDate: Date) => {
    const friday = new Date(startDate)
    friday.setDate(startDate.getDate() + 4)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const startStr = `${startDate.getDate()} ${months[startDate.getMonth()]}`
    const endStr = `${friday.getDate()} ${months[friday.getMonth()]} ${friday.getFullYear()}`
    return `${startStr} - ${endStr}`
  }

  const handlePrevWeek = () => {
    setSlotWeekStart((prev) => {
      const next = new Date(prev)
      next.setDate(prev.getDate() - 7)
      return next
    })
  }

  const handleNextWeek = () => {
    setSlotWeekStart((prev) => {
      const next = new Date(prev)
      next.setDate(prev.getDate() + 7)
      return next
    })
  }

  const handleTodayWeek = () => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const mon = new Date(d)
    mon.setDate(diff)
    mon.setHours(0, 0, 0, 0)
    setSlotWeekStart(mon)
  }

  const getSlotsForCell = (date: Date, periodId: number) => {
    const dYear = date.getFullYear()
    const dMonth = date.getMonth()
    const dDate = date.getDate()
    const period = PERIODS.find((p) => p.id === periodId)
    if (!period) return []

    return slots.filter((slot) => {
      const slotDate = new Date(slot.start_time)
      if (
        slotDate.getFullYear() !== dYear ||
        slotDate.getMonth() !== dMonth ||
        slotDate.getDate() !== dDate
      ) {
        return false
      }
      const sH = slotDate.getHours()
      const sM = slotDate.getMinutes()
      return sH === period.startH && Math.abs(sM - period.startM) <= 10
    })
  }

  const handleQuickAddSlot = (date: Date, period: (typeof PERIODS)[0]) => {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, "0")
    const dd = String(date.getDate()).padStart(2, "0")
    const dStr = `${yyyy}-${mm}-${dd}`
    const startStr = `${dStr}T${String(period.startH).padStart(2, "0")}:${String(period.startM).padStart(2, "0")}`
    const endStr = `${dStr}T${String(period.endH).padStart(2, "0")}:${String(period.endM).padStart(2, "0")}`
    setSlotStartTime(startStr)
    setSlotEndTime(endStr)
    setSlotLocation("Meeting Room")
    setSlotMaxGroups(1)
    setShowSlotModal(true)
  }

  // 7. Create Slot
  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post("/presentation/slots", {
        academic_year: activeCurrentYear || "2568",
        start_time: new Date(slotStartTime).toISOString(),
        end_time: new Date(slotEndTime).toISOString(),
        location: slotLocation,
        max_groups: Number(slotMaxGroups),
      })

      toast.success("สร้างรอบนำเสนอสำเร็จ")
      setShowSlotModal(false)
      fetchAllAdminData()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "สร้างรอบนำเสนอไม่สำเร็จ"
      toast.error(errorMsg)
    }
  }

  // 7.1 Batch Create Slots
  const handleBatchCreateSlots = async (e: React.FormEvent) => {
    e.preventDefault()
    if (batchDates.length === 0) {
      toast.error("กรุณาเลือกวันที่อย่างน้อย 1 วัน")
      return
    }
    if (batchPeriods.length === 0) {
      toast.error("กรุณาเลือกคาบอย่างน้อย 1 คาบ")
      return
    }
    setIsSubmittingBatch(true)
    try {
      const res = await api.post<{ success: boolean; message: string; created_count: number }>("/presentation/slots/batch", {
        dates: batchDates,
        periods: batchPeriods,
        location: batchLocation || "Meeting Room",
        max_groups: Number(batchMaxGroups) || 1,
        academic_year: activeCurrentYear || "2568",
      })
      toast.success(res?.message || `สร้างรอบนำเสนอสำเร็จ ${res?.created_count || 0} รอบ`)
      setShowBatchModal(false)
      fetchAllAdminData()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "สร้างรอบแบบชุดไม่สำเร็จ"
      toast.error(errorMsg)
    } finally {
      setIsSubmittingBatch(false)
    }
  }

  // 8. Delete Slot
  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("คุณต้องการลบรอบนำเสนอนี้ใช่หรือไม่?")) return
    try {
      await api.delete(`/presentation/slots/${slotId}`)
      toast.success("ลบรอบนำเสนอสำเร็จ")
      fetchAllAdminData()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "ลบรอบนำเสนอไม่สำเร็จ"
      toast.error(errorMsg)
    }
  }

  // Helper to validate real classroom name format
  const isValidRoom = (r?: string | null): r is string => {
    if (!r) return false
    const trimmed = r.trim().toLowerCase()
    if (trimmed.includes("`") || trimmed === "room" || trimmed === "null" || trimmed === "undefined") {
      return false
    }
    return true
  }

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
  const handleUpdateSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setIsSavingSettings(true)
    try {
      const payload = {
        ...settings,
        system_name: settings.system_name || "TU-North CPMS",
        institute_name: settings.institute_name || "โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ",
        system_description: settings.system_description || "ระบบจัดการโครงงานคอมพิวเตอร์ โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ",
        max_members_per_group: settings.max_members_per_group || "3",
        site_copyright: settings.site_copyright || "© 2026 TU-North Computer Department",
        submission_mode: settings.submission_mode || "sequential",
        show_scores_to_students: settings.show_scores_to_students !== undefined ? settings.show_scores_to_students : "true",
        telegram_bot_enabled: settings.telegram_bot_enabled !== undefined ? settings.telegram_bot_enabled : "false",
        telegram_bot_token: settings.telegram_bot_token || "",
        telegram_chat_id: settings.telegram_chat_id || ""
      }
      await api.put("/admin/settings", payload)
      setSettings(payload)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("branding-updated"))
      }
      toast.success("บันทึกการตั้งค่าระบบเรียบร้อยแล้ว")
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "บันทึกการตั้งค่าไม่สำเร็จ"
      toast.error(errorMsg)
    } finally {
      setIsSavingSettings(false)
    }
  }

  // 10.1 Upload Branding Logo / Favicon
  const handleUploadBranding = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "favicon") => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error("ขนาดไฟล์รูปภาพต้องไม่เกิน 5 MB")
      return
    }

    const isLogo = type === "logo"
    if (isLogo) setIsUploadingLogo(true)
    else setIsUploadingFavicon(true)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("type", type)

    try {
      const res = await api.uploadFormData<{ success: boolean; file_path: string; url: string; message?: string }>("/admin/settings/upload-image", formData)
      if (res.url) {
        const key = isLogo ? "site_logo" : "site_favicon"
        const updated = { ...settings, [key]: res.url }
        setSettings(updated)
        // Auto save setting to DB
        await api.put("/admin/settings", { [key]: res.url })
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("branding-updated"))
        }
        toast.success(isLogo ? "อัปโหลดโลโก้ระบบสำเร็จ" : "อัปโหลด Favicon สำเร็จ")
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "อัปโหลดรูปภาพไม่สำเร็จ"
      toast.error(errorMsg)
    } finally {
      if (isLogo) setIsUploadingLogo(false)
      else setIsUploadingFavicon(false)
      e.target.value = ""
    }
  }

  // 11. Test Telegram
  const handleTestTelegram = async () => {
    setIsTestingTelegram(true)
    try {
      const res = await api.post<{ message: string }>("/admin/settings/test-telegram", {
        bot_token: settings.telegram_bot_token || "",
        chat_id: settings.telegram_chat_id || ""
      })
      toast.success(res.message || "ส่งข้อความทดสอบ Telegram สำเร็จ")
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "ทดสอบ Telegram ล้มเหลว"
      toast.error(errorMsg)
    } finally {
      setIsTestingTelegram(false)
    }
  }

  // Dynamically extract available rooms from users and groups
  const availableRooms = Array.from(
    new Set([
      ...users.map((u) => u.room),
      ...groups.map((g) => g.room)
    ].filter(isValidRoom))
  ).sort(compareRooms)

  // Standard rooms (M.6) and dynamic rooms for teacher assignment
  const standardAssignmentRooms = [
    "6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "6.8", "6.9", "6.10", "6.11", "6.12", "6.13", "6.14", "6.15"
  ]
  const allAssignableRooms = Array.from(
    new Set([
      ...standardAssignmentRooms,
      ...availableRooms,
      ...teachers.flatMap((t) => (t.teacher_assignments || []).map((a) => a.room)),
      ...selectedAssignRooms
    ].filter(isValidRoom))
  ).sort(compareRooms)

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
                    <span className="text-xs text-slate-500">นักเรียนปี {activeCurrentYear}</span>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {users.filter((u) => u.role === "STUDENT" && u.academic_year === activeCurrentYear).length}
                    </div>
                    <span className="text-[10px] text-brand-600 font-medium">รวมทั้งหมด {users.filter((u) => u.role === "STUDENT").length} คน</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl">
                    <span className="text-xs text-slate-500">กลุ่มโครงงานปี {activeCurrentYear}</span>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {groups.filter((g) => g.academic_year === activeCurrentYear).length}
                    </div>
                    <span className="text-[10px] text-blue-600 font-medium">รวมทุกปี {groups.length} กลุ่ม</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl">
                    <span className="text-xs text-slate-500">ขั้นตอนการส่งงาน</span>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {steps.length}
                    </div>
                    <span className="text-[10px] text-emerald-600 font-medium">ขั้นตอนเปิดใช้งาน</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl">
                    <span className="text-xs text-slate-500">รอบนำเสนอปี {activeCurrentYear}</span>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {slots.filter((s) => s.academic_year === activeCurrentYear).length}
                    </div>
                    <span className="text-[10px] text-purple-600 font-medium">รวมทุกปี {slots.length} รอบ</span>
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
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <School className="w-5 h-5 text-brand-500" />
                      มอบหมายห้องเรียนประจำสำหรับครูผู้สอน
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      กำหนดห้องเรียน ม.6 ที่ครูแต่ละท่านรับผิดชอบในการติดตามความคืบหน้าและตรวจงานโครงงาน
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Year Selector */}
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">ปีการศึกษา:</span>
                      <select
                        value={currentAssignedYear}
                        onChange={(e) => {
                          const newYr = e.target.value
                          setSelectedAssignmentYear(newYr)
                          if (assignTeacherId) {
                            handleSelectTeacherForAssignment(assignTeacherId, newYr)
                          }
                        }}
                        className="bg-transparent text-xs font-bold text-brand-600 dark:text-brand-400 outline-none cursor-pointer"
                      >
                        {academicYears.map((y) => (
                          <option key={y.id} value={y.year}>
                            {y.year} {y.is_current ? "(ปัจจุบัน)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Clone Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setCloneToYear(currentAssignedYear)
                        const otherYear = academicYears.find((y) => y.year !== currentAssignedYear)?.year || "2568"
                        setCloneFromYear(otherYear)
                        setShowCloneModal(true)
                      }}
                      className="px-3.5 py-2 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 text-brand-600 dark:text-brand-300 border border-brand-200 dark:border-brand-800 rounded-2xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>คัดลอกห้องจากปีอื่น</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Multi-select Form */}
                  <form
                    onSubmit={handleAssignRoom}
                    className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 space-y-5 shadow-sm h-fit"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                          <Users className="w-4 h-4 text-brand-500" />
                          กำหนดห้องเรียนครู
                        </h4>
                        <span className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold block mt-0.5">
                          ปีการศึกษา: {currentAssignedYear}
                        </span>
                      </div>
                      {assignTeacherId && (
                        <span className="text-[11px] font-bold text-brand-600 bg-brand-50 dark:bg-brand-950/60 px-2.5 py-1 rounded-full">
                          เลือกแล้ว {selectedAssignRooms.length} ห้อง
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        เลือกอาจารย์ผู้สอน <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={assignTeacherId}
                        onChange={(e) => handleSelectTeacherForAssignment(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium outline-none focus:border-brand-500 transition-colors"
                      >
                        <option value="">-- กรุณาเลือกครูผู้สอน --</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.full_name} ({t.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    {assignTeacherId ? (
                      <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            เลือกห้องเรียนประจำ (ปี {currentAssignedYear})
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSelectAllRooms(allAssignableRooms)}
                              className="text-[11px] text-brand-600 hover:text-brand-700 dark:text-brand-400 font-semibold px-2 py-0.5 rounded hover:bg-brand-50 dark:hover:bg-brand-950/50 transition-colors cursor-pointer"
                            >
                              ทั้งหมด
                            </button>
                            <span className="text-slate-300 dark:text-slate-700 text-xs">|</span>
                            <button
                              type="button"
                              onClick={() => handleSelectOddRooms(allAssignableRooms)}
                              className="text-[11px] text-slate-600 hover:text-slate-800 dark:text-slate-400 font-semibold px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              ห้องคี่
                            </button>
                            <span className="text-slate-300 dark:text-slate-700 text-xs">|</span>
                            <button
                              type="button"
                              onClick={() => handleSelectEvenRooms(allAssignableRooms)}
                              className="text-[11px] text-slate-600 hover:text-slate-800 dark:text-slate-400 font-semibold px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              ห้องคู่
                            </button>
                            <span className="text-slate-300 dark:text-slate-700 text-xs">|</span>
                            <button
                              type="button"
                              onClick={handleClearAllRooms}
                              className="text-[11px] text-rose-500 hover:text-rose-600 font-semibold px-2 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            >
                              ล้าง
                            </button>
                          </div>
                        </div>

                        {/* Room Chips Grid */}
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                          {allAssignableRooms.map((rm) => {
                            const isSelected = selectedAssignRooms.includes(rm)
                            return (
                              <button
                                key={rm}
                                type="button"
                                onClick={() => toggleRoomSelection(rm)}
                                className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                                  isSelected
                                    ? "bg-brand-500 text-white border-brand-500 shadow-sm ring-2 ring-brand-500/20 scale-[1.02]"
                                    : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" />}
                                <span>{rm}</span>
                              </button>
                            )
                          })}
                        </div>

                        {/* Custom Room Input */}
                        <div className="pt-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="ห้องอื่น ๆ เช่น 6.16"
                              value={customRoomInput}
                              onChange={(e) => setCustomRoomInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  handleAddCustomRoom(e)
                                }
                              }}
                              className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none focus:border-brand-500 transition-colors"
                            />
                            <button
                              type="button"
                              onClick={handleAddCustomRoom}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                              + เพิ่ม
                            </button>
                          </div>
                        </div>

                        {/* Summary of Selected Rooms */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                            ห้องที่เลือกทั้งหมด ({selectedAssignRooms.length} ห้อง ในปี {currentAssignedYear}):
                          </span>
                          {selectedAssignRooms.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                              {[...selectedAssignRooms].sort(compareRooms).map((rm) => (
                                <span
                                  key={rm}
                                  className="inline-flex items-center gap-1 bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 text-[11px] font-bold px-2 py-0.5 rounded-lg border border-brand-200 dark:border-brand-800"
                                >
                                  ม.{rm}
                                  <button
                                    type="button"
                                    onClick={() => toggleRoomSelection(rm)}
                                    className="hover:text-rose-500 transition-colors cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">ยังไม่ได้เลือกห้อง (ครูจะไม่มีห้องประจำในปีนี้)</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                        <p className="text-xs text-slate-400">
                          👆 เลือกครูผู้สอนเพื่อเริ่มกำหนดห้องเรียนประจำในปี {currentAssignedYear}
                        </p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!assignTeacherId || isAssigningRooms}
                      className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isAssigningRooms ? (
                        <span>กำลังบันทึก...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>บันทึกการมอบหมาย ({selectedAssignRooms.length} ห้อง ในปี {currentAssignedYear})</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Right Column: Teacher Cards List */}
                  <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          รายการครูประจำห้องเรียน ม.6
                        </h4>
                        <span className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold">
                          ปีการศึกษา: {currentAssignedYear} ({teachers.length} ท่าน)
                        </span>
                      </div>

                      {/* Search Filter for Teachers */}
                      <div className="relative w-full sm:w-48">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="ค้นหาชื่อ / อีเมล / ห้อง"
                          value={teacherSearchFilter}
                          onChange={(e) => setTeacherSearchFilter(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none focus:border-brand-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[600px] overflow-y-auto pr-1">
                      {teachers
                        .filter((t) => {
                          const q = teacherSearchFilter.toLowerCase().trim()
                          if (!q) return true
                          const matchName = t.full_name.toLowerCase().includes(q)
                          const matchEmail = t.email.toLowerCase().includes(q)
                          const matchRooms = (t.teacher_assignments || []).some(
                            (a) =>
                              (a.academic_year || "2568") === currentAssignedYear &&
                              a.room.toLowerCase().includes(q)
                          )
                          return matchName || matchEmail || matchRooms
                        })
                        .map((t) => {
                          const assignments = [...(t.teacher_assignments || [])]
                            .filter((a) => (a.academic_year || "2568") === currentAssignedYear)
                            .sort((a, b) => compareRooms(a.room, b.room))
                          const isSelected = assignTeacherId === t.id

                          return (
                            <div
                              key={t.id}
                              className={`py-4 transition-all ${
                                isSelected ? "bg-brand-50/40 dark:bg-brand-950/20 -mx-2 px-2 rounded-2xl" : ""
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                                      {t.full_name}
                                    </span>
                                    {isSelected && (
                                      <span className="text-[10px] bg-brand-500 text-white font-bold px-2 py-0.2 rounded-full">
                                        กำลังแก้ไข
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-400 font-en block">
                                    {t.email}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleSelectTeacherForAssignment(t.id, currentAssignedYear)}
                                  className="shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/50 px-2.5 py-1 rounded-xl transition-colors cursor-pointer flex items-center gap-1 border border-brand-200 dark:border-brand-800"
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>จัดการห้อง</span>
                                </button>
                              </div>

                              {/* Badges of Assigned Rooms for currentAssignedYear */}
                              <div className="mt-2.5">
                                {assignments.length > 0 ? (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mr-1">
                                      ห้อง ({assignments.length}):
                                    </span>
                                    {assignments.map((a) => (
                                      <span
                                        key={a.id}
                                        className="inline-flex items-center gap-1 bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 text-xs font-bold px-2.5 py-1 rounded-xl border border-brand-200/80 dark:border-brand-800/80 group"
                                      >
                                        ม.{a.room}
                                        <button
                                          type="button"
                                          title={`ลบห้อง ม.${a.room}`}
                                          onClick={() =>
                                            handleRemoveTeacherAssignment(a.id, a.room, t.full_name)
                                          }
                                          className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer ml-0.5"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="inline-block text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-lg border border-amber-200/60 dark:border-amber-900/60">
                                    ยังไม่ได้มอบหมายห้องในปี {currentAssignedYear}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
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
                {/* Defense Slots Timetable */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <CalendarCheck className="w-5 h-5 text-brand-500" />
                          จัดการตารางนำเสนอ (Presentation Defense Schedule)
                        </h3>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-200/60 dark:border-brand-900/60">
                          ปีการศึกษา {activeCurrentYear || "2568"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        คลิกที่ช่องว่าง (+) เพื่อเพิ่มรอบ หรือคลิกที่ไอคอนเพื่อดูรายละเอียด / ลบรอบ
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          const weekDays = getWeekDates(slotWeekStart).map(d => {
                            const y = d.getFullYear()
                            const m = String(d.getMonth() + 1).padStart(2, "0")
                            const day = String(d.getDate()).padStart(2, "0")
                            return `${y}-${m}-${day}`
                          })
                          setBatchDates(weekDays.slice(0, 3))
                          setShowBatchModal(true)
                        }}
                        className="bg-brand-500 hover:bg-brand-600 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> สร้างหลายรอบ (Batch)
                      </button>

                      <button
                        onClick={() => {
                          const exportUrl = api.getExportUrl(`/presentation/scores/export?academic_year=${encodeURIComponent(activeCurrentYear || "2568")}`)
                          window.open(exportUrl, "_blank")
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Export Scores
                      </button>
                    </div>
                  </div>

                  {/* Week Navigator */}
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl px-4 py-2.5 shadow-xs">
                    <button
                      onClick={handlePrevWeek}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium"
                    >
                      <ChevronLeft className="w-4 h-4" /> สัปดาห์ก่อนหน้า
                    </button>

                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-brand-500" />
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100 font-en">
                        {formatWeekRange(slotWeekStart)}
                      </span>
                      <button
                        onClick={handleTodayWeek}
                        className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-2 py-0.5 rounded-md hover:bg-brand-100 dark:hover:bg-brand-900 transition-colors ml-2 cursor-pointer"
                      >
                        สัปดาห์นี้
                      </button>
                    </div>

                    <button
                      onClick={handleNextWeek}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium"
                    >
                      สัปดาห์ถัดไป <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Timetable Table Grid */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-center border-collapse min-w-[720px]">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                            <th className="py-3 px-3 w-28 text-left border-r border-slate-200/60 dark:border-slate-800">คาบ / เวลา</th>
                            {getWeekDates(slotWeekStart).map((date, idx) => (
                              <th key={idx} className="py-3 px-2 border-r last:border-r-0 border-slate-200/60 dark:border-slate-800">
                                <div className="text-slate-900 dark:text-white font-bold">{formatDayName(date)}</div>
                                <div className="text-[11px] text-slate-400 font-normal font-en">{formatShortDate(date)}</div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                          {/* Periods 1-4 */}
                          {PERIODS.slice(0, 4).map((period) => (
                            <tr key={period.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20">
                              <td className="py-3 px-3 text-left border-r border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                                <div className="font-bold text-slate-900 dark:text-white">{period.name}</div>
                                <div className="text-[10px] text-slate-400 font-en">{period.time}</div>
                              </td>
                              {getWeekDates(slotWeekStart).map((date, dayIdx) => {
                                const cellSlots = getSlotsForCell(date, period.id)
                                return (
                                  <td key={dayIdx} className="p-2 border-r last:border-r-0 border-slate-200/40 dark:border-slate-800/60 align-middle">
                                    {cellSlots.length === 0 ? (
                                      <button
                                        onClick={() => handleQuickAddSlot(date, period)}
                                        className="w-full h-12 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-950/30 flex items-center justify-center text-slate-300 dark:text-slate-700 hover:text-brand-600 dark:hover:text-brand-400 transition-all cursor-pointer group"
                                        title={`เพิ่มรอบ ${formatDayName(date)} ${period.name}`}
                                      >
                                        <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                      </button>
                                    ) : (
                                      <div className="space-y-1.5">
                                        {cellSlots.map((slot) => {
                                          const bookedCount = slot.bookings?.length || 0
                                          const isFull = bookedCount >= slot.max_groups
                                          return (
                                            <div
                                              key={slot.id}
                                              className={`rounded-xl p-2 border text-left text-xs transition-all relative group ${
                                                isFull
                                                  ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/50"
                                                  : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 shadow-xs"
                                              }`}
                                            >
                                              <div className="flex items-start justify-between gap-1">
                                                <div className="min-w-0 flex-1">
                                                  <div className="font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1 text-[11px]">
                                                    <MapPin className="w-3 h-3 text-brand-500 shrink-0" />
                                                    <span className="truncate">{slot.location}</span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span
                                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                        isFull
                                                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                                          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                                      }`}
                                                    >
                                                      {bookedCount}/{slot.max_groups} กลุ่ม
                                                    </span>
                                                    {isFull && <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">เต็ม</span>}
                                                  </div>
                                                  {bookedCount > 0 && slot.bookings && slot.bookings[0]?.group && (
                                                    <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate mt-1 bg-slate-50 dark:bg-slate-800/80 px-1 py-0.5 rounded">
                                                      📌 {slot.bookings[0].group.project_name_th}
                                                    </div>
                                                  )}
                                                </div>

                                                <button
                                                  onClick={() => handleDeleteSlot(slot.id)}
                                                  disabled={bookedCount > 0}
                                                  className="opacity-0 group-hover:opacity-100 disabled:opacity-20 text-red-500 hover:text-red-700 p-0.5 rounded transition-opacity cursor-pointer disabled:cursor-not-allowed shrink-0"
                                                  title={bookedCount > 0 ? "มีกลุ่มจองแล้ว ไม่สามารถลบได้" : "ลบรอบนี้"}
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </div>
                                          )
                                        })}
                                        <button
                                          onClick={() => handleQuickAddSlot(date, period)}
                                          className="w-full py-0.5 rounded border border-dashed border-slate-200 hover:border-brand-400 text-slate-300 hover:text-brand-500 text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                          title="เพิ่มรอบอีกห้อง"
                                        >
                                          <Plus className="w-3 h-3" /> เพิ่มรอบ
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}

                          {/* Lunch Divider */}
                          <tr className="bg-amber-50/60 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 font-medium text-[11px] border-y border-amber-200/50 dark:border-amber-900/40">
                            <td colSpan={6} className="py-1.5 px-4 tracking-wide text-center">
                              พักเที่ยง (11:50 - 12:40 น.)
                            </td>
                          </tr>

                          {/* Periods 6-9 */}
                          {PERIODS.slice(4).map((period) => (
                            <tr key={period.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20">
                              <td className="py-3 px-3 text-left border-r border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                                <div className="font-bold text-slate-900 dark:text-white">{period.name}</div>
                                <div className="text-[10px] text-slate-400 font-en">{period.time}</div>
                              </td>
                              {getWeekDates(slotWeekStart).map((date, dayIdx) => {
                                const cellSlots = getSlotsForCell(date, period.id)
                                return (
                                  <td key={dayIdx} className="p-2 border-r last:border-r-0 border-slate-200/40 dark:border-slate-800/60 align-middle">
                                    {cellSlots.length === 0 ? (
                                      <button
                                        onClick={() => handleQuickAddSlot(date, period)}
                                        className="w-full h-12 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-950/30 flex items-center justify-center text-slate-300 dark:text-slate-700 hover:text-brand-600 dark:hover:text-brand-400 transition-all cursor-pointer group"
                                        title={`เพิ่มรอบ ${formatDayName(date)} ${period.name}`}
                                      >
                                        <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                      </button>
                                    ) : (
                                      <div className="space-y-1.5">
                                        {cellSlots.map((slot) => {
                                          const bookedCount = slot.bookings?.length || 0
                                          const isFull = bookedCount >= slot.max_groups
                                          return (
                                            <div
                                              key={slot.id}
                                              className={`rounded-xl p-2 border text-left text-xs transition-all relative group ${
                                                isFull
                                                  ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/50"
                                                  : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 shadow-xs"
                                              }`}
                                            >
                                              <div className="flex items-start justify-between gap-1">
                                                <div className="min-w-0 flex-1">
                                                  <div className="font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1 text-[11px]">
                                                    <MapPin className="w-3 h-3 text-brand-500 shrink-0" />
                                                    <span className="truncate">{slot.location}</span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span
                                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                        isFull
                                                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                                          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                                      }`}
                                                    >
                                                      {bookedCount}/{slot.max_groups} กลุ่ม
                                                    </span>
                                                    {isFull && <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">เต็ม</span>}
                                                  </div>
                                                  {bookedCount > 0 && slot.bookings && slot.bookings[0]?.group && (
                                                    <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate mt-1 bg-slate-50 dark:bg-slate-800/80 px-1 py-0.5 rounded">
                                                      📌 {slot.bookings[0].group.project_name_th}
                                                    </div>
                                                  )}
                                                </div>

                                                <button
                                                  onClick={() => handleDeleteSlot(slot.id)}
                                                  disabled={bookedCount > 0}
                                                  className="opacity-0 group-hover:opacity-100 disabled:opacity-20 text-red-500 hover:text-red-700 p-0.5 rounded transition-opacity cursor-pointer disabled:cursor-not-allowed shrink-0"
                                                  title={bookedCount > 0 ? "มีกลุ่มจองแล้ว ไม่สามารถลบได้" : "ลบรอบนี้"}
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </div>
                                          )
                                        })}
                                        <button
                                          onClick={() => handleQuickAddSlot(date, period)}
                                          className="w-full py-0.5 rounded border border-dashed border-slate-200 hover:border-brand-400 text-slate-300 hover:text-brand-500 text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                          title="เพิ่มรอบอีกห้อง"
                                        >
                                          <Plus className="w-3 h-3" /> เพิ่มรอบ
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Header Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-brand-500" />
                      การตั้งค่าระบบส่วนกลาง (Admin System Settings)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      กำหนดค่าการทำงานพื้นฐาน อัตลักษณ์ รูปแบบการส่งงาน การแสดงคะแนน และการแจ้งเตือน
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleUpdateSettings()}
                      disabled={isSavingSettings}
                      className="bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-brand-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {isSavingSettings ? "กำลังบันทึก..." : "บันทึกการตั้งค่าทั้งหมด"}
                    </button>
                  </div>
                </div>

                {/* TU-North CPMS v1.0 & LAN/Cloudflare Deployment Status Banner */}
                <div className="relative overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-indigo-700 text-white rounded-3xl p-6 sm:p-7 shadow-lg shadow-brand-500/20 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold font-en tracking-wide uppercase shadow-xs">
                          {settings["system_version"] || "TU-North CPMS v1.0"}
                        </span>
                        <span className="inline-flex items-center gap-1.5 bg-emerald-400/20 text-emerald-100 border border-emerald-300/30 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          {settings["deployment_status"] || "พร้อมใช้งานบน LAN และ Cloudflare"}
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                        {settings["system_name"] || "TU-North CPMS"}
                      </h3>
                      <p className="text-xs text-white/80 max-w-xl">
                        {settings["system_description"] || "ระบบจัดการโครงงานคอมพิวเตอร์ โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      <a
                        href={settings["lan_url"] || "http://cpms.local"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 bg-white text-slate-900 hover:bg-slate-100 font-bold px-3.5 py-2 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <Wifi className="w-3.5 h-3.5 text-brand-600" />
                        <span>เปิด LAN ({settings["lan_url"] ? settings["lan_url"].replace(/^https?:\/\//, "") : "cpms.local"})</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                      <a
                        href={settings["cloudflare_url"] || "https://cpms.tn.ac.th"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 bg-brand-900/40 hover:bg-brand-900/60 border border-white/20 text-white font-bold px-3.5 py-2 rounded-xl text-xs backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                      >
                        <Cloud className="w-3.5 h-3.5 text-amber-300" />
                        <span>Cloudflare Tunnel</span>
                        <ExternalLink className="w-3 h-3 text-white/70" />
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/10 text-xs text-white/90">
                    <div className="flex items-center gap-2">
                      <Server className="w-3.5 h-3.5 text-white/60 shrink-0" />
                      <span>Backend: <b className="font-en">Go Fiber 2.52</b></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-white/60 shrink-0" />
                      <span>Database: <b className="font-en">PostgreSQL 17</b></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-white/60 shrink-0" />
                      <span>Frontend: <b className="font-en">Next.js 16</b></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-white/60 shrink-0" />
                      <span>Deployment: <b className="font-en">Docker & Nginx</b></span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleUpdateSettings} className="space-y-6">
                  {/* SECTION 1: ข้อมูลทั่วไป (General) */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/60 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          1. ข้อมูลทั่วไปของระบบ (General Information)
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          กำหนดชื่อระบบ สถาบัน คำอธิบาย และข้อกำหนดกลุ่มโครงงาน
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          ชื่อระบบ (System Name)
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={settings["system_name"] ?? "TU-North CPMS"}
                          onChange={(e) => setSettings({ ...settings, system_name: e.target.value })}
                          placeholder="TU-North CPMS"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          ชื่อสถานศึกษา / สถาบัน (Institute Name)
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={settings["institute_name"] ?? "โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ"}
                          onChange={(e) => setSettings({ ...settings, institute_name: e.target.value })}
                          placeholder="โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          คำอธิบายระบบ (System Description)
                        </label>
                        <input
                          type="text"
                          value={settings["system_description"] ?? "ระบบจัดการโครงงานคอมพิวเตอร์ โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ"}
                          onChange={(e) => setSettings({ ...settings, system_description: e.target.value })}
                          placeholder="คำอธิบายสั้นๆ เกี่ยวกับระบบ"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          จำนวนสมาชิกสูงสุดต่อกลุ่ม (Max Members per Group)
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          required
                          value={settings["max_members_per_group"] ?? "3"}
                          onChange={(e) => setSettings({ ...settings, max_members_per_group: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-en"
                        />
                        <p className="text-[10px] text-slate-400">
                          จำกัดจำนวนนักเรียนที่สามารถเข้าร่วมกลุ่มโครงงานเดียวกัน (ค่ามาตรฐานคือ 3 คน)
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          ข้อความท้ายเว็บ / ลิขสิทธิ์ (Site Copyright)
                        </label>
                        <input
                          type="text"
                          value={settings["site_copyright"] ?? "© 2026 TU-North Computer Department"}
                          onChange={(e) => setSettings({ ...settings, site_copyright: e.target.value })}
                          placeholder="© 2026 TU-North Computer Department"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-en"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: รูปภาพและอัตลักษณ์ (Images & Branding) */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          2. รูปภาพและสัญลักษณ์ของระบบ (Images & Branding)
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          ปรับแต่งโลโก้หลักและไอคอน Favicon ที่แสดงบนแถบเบราว์เซอร์และ Navbar
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Site Logo */}
                      <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-950/50 space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                            โลโก้ระบบ (Site Logo)
                          </label>
                          {settings["site_logo"] && (
                            <button
                              type="button"
                              onClick={() => setSettings({ ...settings, site_logo: "" })}
                              className="text-[10px] text-red-500 hover:text-red-600 font-semibold cursor-pointer"
                            >
                              รีเซ็ตเป็นค่าเริ่มต้น
                            </button>
                          )}
                        </div>

                        {/* Logo Preview */}
                        <div className="h-24 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center p-3 relative overflow-hidden">
                          {settings["site_logo"] ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={api.getFileUrl(settings["site_logo"])}
                              alt="Site Logo Preview"
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none"
                              }}
                            />
                          ) : (
                            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                              <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
                                CPMS
                              </div>
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                โลโก้เริ่มต้น (Default Badge)
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Upload / URL Controls */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <label className="flex-1">
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                                onChange={(e) => handleUploadBranding(e, "logo")}
                                disabled={isUploadingLogo}
                                className="hidden"
                              />
                              <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs">
                                <UploadCloud className="w-3.5 h-3.5 text-brand-500" />
                                {isUploadingLogo ? "กำลังอัปโหลด..." : "อัปโหลดไฟล์รูปภาพ (PNG/SVG/JPG)"}
                              </div>
                            </label>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400">หรือระบุ URL รูปภาพโดยตรง:</span>
                            <input
                              type="text"
                              value={settings["site_logo"] || ""}
                              onChange={(e) => setSettings({ ...settings, site_logo: e.target.value })}
                              placeholder="https://... หรือ /api/files/download?path=..."
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-[11px] outline-none focus:border-brand-500 font-en"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Site Favicon */}
                      <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-950/50 space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-blue-500" />
                            ไอคอนเว็บไซต์ (Site Favicon)
                          </label>
                          {settings["site_favicon"] && (
                            <button
                              type="button"
                              onClick={() => setSettings({ ...settings, site_favicon: "" })}
                              className="text-[10px] text-red-500 hover:text-red-600 font-semibold cursor-pointer"
                            >
                              รีเซ็ตเป็นค่าเริ่มต้น
                            </button>
                          )}
                        </div>

                        {/* Favicon Preview */}
                        <div className="h-24 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center p-3 relative overflow-hidden">
                          <div className="flex items-center gap-2.5 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            {settings["site_favicon"] ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={api.getFileUrl(settings["site_favicon"])}
                                alt="Favicon Preview"
                                className="w-4 h-4 object-contain"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-xs bg-brand-500 text-white font-bold text-[8px] flex items-center justify-center">
                                C
                              </div>
                            )}
                            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                              {settings["system_name"] || "TU-North CPMS"} — Tab Preview
                            </span>
                          </div>
                        </div>

                        {/* Upload / URL Controls */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <label className="flex-1">
                              <input
                                type="file"
                                accept="image/x-icon,image/png,image/svg+xml,image/ico"
                                onChange={(e) => handleUploadBranding(e, "favicon")}
                                disabled={isUploadingFavicon}
                                className="hidden"
                              />
                              <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs">
                                <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
                                {isUploadingFavicon ? "กำลังอัปโหลด..." : "อัปโหลดไฟล์ไอคอน (ICO/PNG/SVG)"}
                              </div>
                            </label>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400">หรือระบุ URL ไอคอนโดยตรง:</span>
                            <input
                              type="text"
                              value={settings["site_favicon"] || ""}
                              onChange={(e) => setSettings({ ...settings, site_favicon: e.target.value })}
                              placeholder="https://... หรือ /favicon.ico"
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-[11px] outline-none focus:border-brand-500 font-en"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: รูปแบบการส่งงาน (Submission Mode) */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                        <ListOrdered className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          3. รูปแบบการส่งงานของนักเรียน (Submission Mode)
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          กำหนดลำดับขั้นและความเข้มงวดในการส่งชิ้นงานของกลุ่มนักเรียน
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Sequential Mode Card */}
                      <div
                        onClick={() => setSettings({ ...settings, submission_mode: "sequential" })}
                        className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                          (settings["submission_mode"] || "sequential") === "sequential"
                            ? "border-brand-500 bg-brand-50/40 dark:bg-brand-950/30 ring-4 ring-brand-500/10"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950/40"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              (settings["submission_mode"] || "sequential") === "sequential"
                                ? "bg-brand-500 text-white shadow-md shadow-brand-500/30"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            }`}>
                              <ListOrdered className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                                  ตามลำดับขั้นตอน (Sequential)
                                </h5>
                                <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  แนะนำ
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                ต้องผ่านงานก่อนหน้า จึงจะส่งงานถัดไปได้
                              </p>
                            </div>
                          </div>

                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            (settings["submission_mode"] || "sequential") === "sequential"
                              ? "border-brand-500 bg-brand-500 text-white"
                              : "border-slate-300 dark:border-slate-700"
                          }`}>
                            {(settings["submission_mode"] || "sequential") === "sequential" && (
                              <Check className="w-3 h-3 stroke-[3]" />
                            )}
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 leading-relaxed">
                          🔒 นักเรียนจะสามารถส่งงานในขั้นตอนที่ N ได้ก็ต่อเมื่อขั้นตอนที่ N-1 ได้รับการประเมินสถานะ <span className="font-semibold text-emerald-600 dark:text-emerald-400">“อนุมัติ (APPROVED)”</span> จากครูผู้สอนแล้วเท่านั้น
                        </p>
                      </div>

                      {/* Open Mode Card */}
                      <div
                        onClick={() => setSettings({ ...settings, submission_mode: "open" })}
                        className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                          settings["submission_mode"] === "open"
                            ? "border-brand-500 bg-brand-50/40 dark:bg-brand-950/30 ring-4 ring-brand-500/10"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950/40"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              settings["submission_mode"] === "open"
                                ? "bg-brand-500 text-white shadow-md shadow-brand-500/30"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            }`}>
                              <Shuffle className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                                  อิสระ (Open Submission)
                                </h5>
                                <span className="bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  ยืดหยุ่น
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                ส่งงานขั้นตอนใดก็ได้ ไม่ต้องเรียงลำดับ
                              </p>
                            </div>
                          </div>

                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            settings["submission_mode"] === "open"
                              ? "border-brand-500 bg-brand-500 text-white"
                              : "border-slate-300 dark:border-slate-700"
                          }`}>
                            {settings["submission_mode"] === "open" && (
                              <Check className="w-3 h-3 stroke-[3]" />
                            )}
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 leading-relaxed">
                          🔓 นักเรียนสามารถส่งงานขั้นตอนใดก่อนก็ได้โดยไม่ต้องรอขั้นตอนก่อนหน้า เหมาะสำหรับช่วงส่งงานรอบแก้ไข หรือส่งเอกสารหลายส่วนพร้อมกัน
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 4: การให้คะแนนและการแสดงผล (Grading & Score Visibility) */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-sm">
                        <Eye className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          4. การให้คะแนนและการมองเห็นคะแนน (Grading & Score Visibility)
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          ควบคุมการอนุญาตให้นักเรียนมองเห็นคะแนนการตรวจงานและคะแนน Rubric นำเสนอ
                        </p>
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            แสดงคะแนนให้นักเรียนเห็น (Show Scores to Students)
                          </span>
                          {(settings["show_scores_to_students"] !== "false" && settings["show_scores_to_students"] !== "0") ? (
                            <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Eye className="w-3 h-3" /> เปิด (ON)
                            </span>
                          ) : (
                            <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                              <EyeOff className="w-3 h-3" /> ปิด (OFF)
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                          เมื่อเปิด (ON) นักเรียนจะเห็นคะแนนของแต่ละขั้นตอนและคะแนนเกณฑ์ Rubric จากกรรมการ / เมื่อปิด (OFF) ระบบจะซ่อนตัวเลขคะแนนทั้งหมดในหน้าจอนักเรียนจนกว่าจะพร้อมประกาศ
                        </p>
                      </div>

                      {/* Switch Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          const currentVal = settings["show_scores_to_students"] !== "false" && settings["show_scores_to_students"] !== "0"
                          setSettings({
                            ...settings,
                            show_scores_to_students: currentVal ? "false" : "true"
                          })
                        }}
                        className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          (settings["show_scores_to_students"] !== "false" && settings["show_scores_to_students"] !== "0")
                            ? "bg-brand-500"
                            : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            (settings["show_scores_to_students"] !== "false" && settings["show_scores_to_students"] !== "0")
                              ? "translate-x-7"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* SECTION 5: การแจ้งเตือน (Notifications & Telegram) */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            5. การแจ้งเตือนและการเชื่อมต่อ (Notifications & Telegram Bot)
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            ส่งการแจ้งเตือนอัตโนมัติเมื่อมีการสร้างกลุ่ม ส่งงาน ตรวจงาน และจองรอบนำเสนอ
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleTestTelegram}
                        disabled={isTestingTelegram || !(settings["telegram_bot_token"] || settings["telegram_chat_id"])}
                        className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
                      >
                        <Bot className="w-4 h-4" />
                        {isTestingTelegram ? "กำลังทดสอบ..." : "ทดสอบส่ง Telegram"}
                      </button>
                    </div>

                    {/* Master Notification Toggle */}
                    <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            เปิดใช้งานระบบแจ้งเตือน (Enable Notifications)
                          </span>
                          {(settings["telegram_bot_enabled"] === "true" || settings["telegram_bot_enabled"] === "1") ? (
                            <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Bell className="w-3 h-3" /> เปิดใช้งาน (ON)
                            </span>
                          ) : (
                            <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                              <BellOff className="w-3 h-3" /> ปิดการแจ้งเตือน (OFF)
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          สลับเปิด/ปิดการยิงข้อความแจ้งเตือนทั้งหมดในระบบ
                        </p>
                      </div>

                      {/* Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => {
                          const currentVal = settings["telegram_bot_enabled"] === "true" || settings["telegram_bot_enabled"] === "1"
                          setSettings({
                            ...settings,
                            telegram_bot_enabled: currentVal ? "false" : "true"
                          })
                        }}
                        className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          (settings["telegram_bot_enabled"] === "true" || settings["telegram_bot_enabled"] === "1")
                            ? "bg-blue-600"
                            : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            (settings["telegram_bot_enabled"] === "true" || settings["telegram_bot_enabled"] === "1")
                              ? "translate-x-7"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5 pt-2">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Bot className="w-3.5 h-3.5 text-blue-500" />
                            Telegram Bot Token
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowBotToken(!showBotToken)}
                            className="text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                          >
                            {showBotToken ? "ซ่อน Token" : "แสดง Token"}
                          </button>
                        </div>
                        <input
                          type={showBotToken ? "text" : "password"}
                          value={settings["telegram_bot_token"] || ""}
                          onChange={(e) => setSettings({ ...settings, telegram_bot_token: e.target.value })}
                          placeholder="Token ที่ได้จาก @BotFather (เช่น 123456789:ABCdef...)"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-en"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          Telegram Chat ID (กลุ่มครู / แจ้งเตือน)
                        </label>
                        <input
                          type="text"
                          value={settings["telegram_chat_id"] || ""}
                          onChange={(e) => setSettings({ ...settings, telegram_chat_id: e.target.value })}
                          placeholder="เช่น -100123456789 หรือ Chat ID ส่วนตัว"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-en"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 6: ข้อมูลเวอร์ชันและการเชื่อมต่อเครือข่าย (System Version & Network Deployment) */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold text-sm">
                        <Server className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          6. ข้อมูลเวอร์ชันและการเชื่อมต่อเครือข่าย (System Version & Network Deployment)
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          กำหนดเวอร์ชันระบบ ข้อความสถานะ และที่อยู่ URL สำหรับการเข้าใช้งานผ่าน LAN และ Cloudflare
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          เวอร์ชันระบบ (System Version)
                        </label>
                        <input
                          type="text"
                          value={settings["system_version"] ?? "v1.0"}
                          onChange={(e) => setSettings({ ...settings, system_version: e.target.value })}
                          placeholder="v1.0"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-en"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          สถานะการทำงาน (Deployment Status)
                        </label>
                        <input
                          type="text"
                          value={settings["deployment_status"] ?? "พร้อมใช้งานบน LAN และ Cloudflare"}
                          onChange={(e) => setSettings({ ...settings, deployment_status: e.target.value })}
                          placeholder="พร้อมใช้งานบน LAN และ Cloudflare"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Wifi className="w-3.5 h-3.5 text-brand-500" />
                          ที่อยู่เครือข่ายภายในโรงเรียน (LAN URL)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={settings["lan_url"] ?? "http://cpms.local"}
                            onChange={(e) => setSettings({ ...settings, lan_url: e.target.value })}
                            placeholder="http://cpms.local หรือ http://192.168.1.xxx:8009"
                            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-en"
                          />
                          <a
                            href={settings["lan_url"] || "http://cpms.local"}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors cursor-pointer"
                            title="เปิดลิงก์ LAN"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Cloud className="w-3.5 h-3.5 text-blue-500" />
                          ที่อยู่ออนไลน์ภายนอก (Cloudflare Public URL)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={settings["cloudflare_url"] ?? "https://cpms.tn.ac.th"}
                            onChange={(e) => setSettings({ ...settings, cloudflare_url: e.target.value })}
                            placeholder="https://cpms.tn.ac.th"
                            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-en"
                          />
                          <a
                            href={settings["cloudflare_url"] || "https://cpms.tn.ac.th"}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors cursor-pointer"
                            title="เปิดลิงก์ Cloudflare"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Submit Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold px-8 py-3 rounded-2xl text-xs shadow-lg shadow-brand-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {isSavingSettings ? "กำลังบันทึกข้อมูล..." : "บันทึกการตั้งค่าทั้งหมด"}
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

            {/* Modal: Batch Slot Create */}
            <Modal
              isOpen={showBatchModal}
              onClose={() => setShowBatchModal(false)}
              title="สร้างรอบแบบ Batch"
              maxWidth="md"
            >
              <form onSubmit={handleBatchCreateSlots} className="space-y-4">
                {/* 1. Select Dates */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      เลือกวันที่ (ได้หลายวัน) *
                    </label>
                    <span className="text-[11px] text-brand-600 font-medium">
                      เลือกแล้ว {batchDates.length} วัน
                    </span>
                  </div>

                  {/* Quick Select Days from Current Week */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {getWeekDates(slotWeekStart).map((d, i) => {
                      const y = d.getFullYear()
                      const m = String(d.getMonth() + 1).padStart(2, "0")
                      const day = String(d.getDate()).padStart(2, "0")
                      const dStr = `${y}-${m}-${day}`
                      const isSelected = batchDates.includes(dStr)
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setBatchDates((prev) =>
                              isSelected ? prev.filter((x) => x !== dStr) : [...prev, dStr]
                            )
                          }}
                          className={`py-1.5 px-1 rounded-xl text-center border text-[11px] font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-brand-500 border-brand-500 text-white shadow-xs"
                              : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-brand-300"
                          }`}
                        >
                          <div>{formatDayName(d)}</div>
                          <div className="text-[10px] font-normal opacity-80 font-en">{formatShortDate(d)}</div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Custom Date Input Add */}
                  <div className="flex gap-2 items-center pt-1">
                    <input
                      type="date"
                      onChange={(e) => {
                        const val = e.target.value
                        if (val && !batchDates.includes(val)) {
                          setBatchDates((prev) => [...prev, val].sort())
                        }
                        e.target.value = ""
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs flex-1"
                    />
                    <span className="text-[11px] text-slate-400">เลือกวันเพิ่ม</span>
                  </div>

                  {/* Selected Dates Chips */}
                  {batchDates.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/60 dark:border-slate-800 max-h-24 overflow-y-auto">
                      {batchDates.map((dateStr) => (
                        <span
                          key={dateStr}
                          className="inline-flex items-center gap-1 bg-brand-50 dark:bg-brand-950 border border-brand-200/80 dark:border-brand-900/60 text-brand-700 dark:text-brand-300 text-[11px] font-medium px-2 py-0.5 rounded-lg"
                        >
                          {dateStr}
                          <button
                            type="button"
                            onClick={() => setBatchDates((prev) => prev.filter((d) => d !== dateStr))}
                            className="hover:text-red-500 cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Select Periods */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      เลือกคาบที่ต้องการสร้าง *
                    </label>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setBatchPeriods([1, 2, 3, 4, 6, 7, 8, 9])}
                        className="text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                      >
                        เลือกทั้งหมด
                      </button>
                      <span>|</span>
                      <button
                        type="button"
                        onClick={() => setBatchPeriods([])}
                        className="text-slate-400 hover:underline cursor-pointer"
                      >
                        ล้าง
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {PERIODS.map((period) => {
                      const isSelected = batchPeriods.includes(period.id)
                      return (
                        <button
                          key={period.id}
                          type="button"
                          onClick={() => {
                            setBatchPeriods((prev) =>
                              isSelected ? prev.filter((p) => p !== period.id) : [...prev, period.id].sort((a, b) => a - b)
                            )
                          }}
                          className={`p-2 rounded-xl text-center border text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-brand-500 border-brand-500 text-white shadow-xs"
                              : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-brand-300 dark:hover:border-brand-700"
                          }`}
                        >
                          <div>{period.name}</div>
                          <div className="text-[10px] font-normal opacity-80 font-en">{period.time}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 3. Location */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">สถานที่ *</label>
                  <input
                    type="text"
                    required
                    value={batchLocation}
                    onChange={(e) => setBatchLocation(e.target.value)}
                    placeholder="เช่น Meeting Room, ห้องคอมพิวเตอร์ 1"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                  />
                </div>

                {/* 4. Max Groups */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">จำนวนกลุ่มต่อรอบ</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={batchMaxGroups}
                    onChange={(e) => setBatchMaxGroups(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBatchModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingBatch || batchDates.length === 0 || batchPeriods.length === 0}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    {isSubmittingBatch ? "กำลังสร้างรอบ..." : `สร้างรอบ (${batchDates.length * batchPeriods.length} รอบ)`}
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

            {/* Modal: Clone Teacher Room Assignments */}
            <Modal
              isOpen={showCloneModal}
              onClose={() => setShowCloneModal(false)}
              title="คัดลอกการมอบหมายห้องเรียนข้ามปีการศึกษา"
              description="คัดลอกรายชื่อห้องประจำของครูผู้สอนทุกคนจากปีการศึกษาต้นทาง มายังปีการศึกษาปลายทาง"
              icon={Copy}
              maxWidth="md"
            >
              <form onSubmit={handleCloneAssignments} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      คัดลอกจากปีการศึกษา (ต้นทาง) *
                    </label>
                    <select
                      required
                      value={cloneFromYear}
                      onChange={(e) => setCloneFromYear(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium outline-none"
                    >
                      <option value="">-- เลือกปีต้นทาง --</option>
                      {academicYears.map((y) => (
                        <option key={y.id} value={y.year}>
                          {y.year} {y.is_current ? "(ปัจจุบัน)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      ไปยังปีการศึกษา (ปลายทาง) *
                    </label>
                    <select
                      required
                      value={cloneToYear}
                      onChange={(e) => setCloneToYear(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium outline-none"
                    >
                      <option value="">-- เลือกปีปลายทาง --</option>
                      {academicYears.map((y) => (
                        <option key={y.id} value={y.year}>
                          {y.year} {y.is_current ? "(ปัจจุบัน)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> หมายเหตุ:
                  </p>
                  <p>
                    ระบบจะคัดลอกเฉพาะห้องที่ยังไม่ได้มอบหมายในปีปลายทาง และจะไม่ลบข้อมูลเดิมที่มีอยู่แล้ว
                  </p>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCloneModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isCloning || !cloneFromYear || !cloneToYear}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isCloning ? (
                      <span>กำลังคัดลอก...</span>
                    ) : (
                      <>
                        <CopyCheck className="w-3.5 h-3.5" />
                        <span>ยืนยันการคัดลอก</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </Modal>
          </>
        )
      }}
    </DashboardLayout>
  )
}
