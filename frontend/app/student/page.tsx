"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/lib/api";
import { 
  ProjectGroup, 
  ProjectStep, 
  Submission, 
  PresentationSlot, 
  User, 
  PresentationCriteria,
  AcademicYear 
} from "@/types";
import { formatDate, formatScore } from "@/lib/utils";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { 
  Users, 
  Plus, 
  Trash2, 
  UserPlus, 
  FileText, 
  Link as LinkIcon, 
  UploadCloud, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Calendar, 
  MapPin, 
  Sparkles, 
  Award, 
  Download, 
  ExternalLink,
  MessageSquare,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Crown,
  LogOut,
  UserMinus,
  School,
  Edit,
  CalendarRange,
  Check,
  CheckSquare,
  Square,
  Search,
  Filter,
  UserCheck,
  RefreshCw
} from "lucide-react";

export default function StudentPage() {
  const { user } = useAuthStore();
  const [group, setGroup] = useState<ProjectGroup | null>(null);
  const [steps, setSteps] = useState<ProjectStep[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [slots, setSlots] = useState<PresentationSlot[]>([])
  const [rubricCriteria, setRubricCriteria] = useState<PresentationCriteria[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "steps" | "defense">("overview")

  // Week navigation state for Student Timetable
  const [slotWeekStart, setSlotWeekStart] = useState<Date>(() => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const mon = new Date(d)
    mon.setDate(diff)
    mon.setHours(0, 0, 0, 0)
    return mon
  })

  // Modals
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showSubmitWork, setShowSubmitWork] = useState<ProjectStep | null>(null);
  const [showBookDefense, setShowBookDefense] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);

  // Create Group Form
  const [projectNameTh, setProjectNameTh] = useState("");
  const [projectNameEn, setProjectNameEn] = useState("");
  const [advisorId, setAdvisorId] = useState("");
  const [advisorCustom, setAdvisorCustom] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [teachers, setTeachers] = useState<User[]>([]);
  const [activeYears, setActiveYears] = useState<AcademicYear[]>([]);
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);

  // Edit Group Form
  const [editProjectNameTh, setEditProjectNameTh] = useState("");
  const [editProjectNameEn, setEditProjectNameEn] = useState("");
  const [editAdvisorId, setEditAdvisorId] = useState("");
  const [editAdvisorCustom, setEditAdvisorCustom] = useState("");
  const [isSubmittingEditGroup, setIsSubmittingEditGroup] = useState(false);

  // Multi-Select Add Members
  const [maxMembersLimit, setMaxMembersLimit] = useState<number>(3);
  const [availableStudents, setAvailableStudents] = useState<User[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [filterRoom, setFilterRoom] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [isLoadingAvailableStudents, setIsLoadingAvailableStudents] = useState(false);
  const [isSubmittingAddMembers, setIsSubmittingAddMembers] = useState(false);

  // Submit Work Form
  const [submissionType, setSubmissionType] = useState<"file" | "link">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submissionLink, setSubmissionLink] = useState("");
  const [isUploadingWork, setIsUploadingWork] = useState(false);

  const isLeader = group?.members?.some((m) => m.user_id === user?.id && m.is_leader);

  const fetchStudentData = useCallback(async () => {
    try {
      setIsLoading(true);
      // 1. Get my group
      let loadedGroup: ProjectGroup | null = null
      try {
        const groupRes = await api.get<{ data?: ProjectGroup; group?: ProjectGroup; max_members?: number }>("/groups/my-group")
        loadedGroup = groupRes?.data || groupRes?.group || null
        if (typeof groupRes?.max_members === "number" && groupRes.max_members > 0) {
          setMaxMembersLimit(groupRes.max_members)
        }
        if (loadedGroup) {
          setGroup(loadedGroup)
          // Fetch submissions for this group
          const subsRes = await api.get<{ data?: Submission[]; submissions?: Submission[] }>(`/submissions/group/${loadedGroup.id}`)
          const subsList = subsRes?.data || subsRes?.submissions || []
          setSubmissions(subsList)
        } else {
          setGroup(null)
        }
      } catch {
        setGroup(null)
      }

      // Also get public settings to ensure maxMembersLimit is populated
      try {
        const setRes = await api.get<{ data?: Record<string, string> }>("/settings/public")
        const maxMem = parseInt(setRes?.data?.["max_members_per_group"] || "", 10)
        if (!isNaN(maxMem) && maxMem > 0) {
          setMaxMembersLimit(maxMem)
        }
      } catch {
        // Fallback
      }

      // 2. Get steps
      const stepsRes = await api.get<{ data?: ProjectStep[]; steps?: ProjectStep[] }>("/steps")
      const stepsList = stepsRes?.data || stepsRes?.steps || []
      if (Array.isArray(stepsList)) {
        setSteps(stepsList.filter((s) => s.is_active))
      }

      // 3. Get active academic years first
      let currentYearVal = "2568"
      try {
        const yearsRes = await api.get<{ data?: AcademicYear[] }>("/academic-years/active")
        const yearsList = yearsRes?.data || []
        if (Array.isArray(yearsList) && yearsList.length > 0) {
          setActiveYears(yearsList)
          const curr = yearsList.find((y) => y.is_current)
          if (curr) {
            currentYearVal = curr.year
            setAcademicYear(curr.year)
          } else {
            currentYearVal = yearsList[0].year
            setAcademicYear(yearsList[0].year)
          }
        }
      } catch {
        // Fallback default
      }

      // 4. Get presentation slots for student's year
      const targetYear = loadedGroup?.academic_year || user?.academic_year || currentYearVal
      const slotsRes = await api.get<{ data?: PresentationSlot[]; slots?: PresentationSlot[] }>("/presentation/slots", {
        academic_year: targetYear
      })
      const slotsList = slotsRes?.data || slotsRes?.slots || []
      if (Array.isArray(slotsList)) {
        setSlots(slotsList)
      }

      // 5. Get teachers list
      try {
        const teachRes = await api.get<{ data?: User[] }>("/groups/teachers")
        if (Array.isArray(teachRes?.data)) {
          setTeachers(teachRes.data)
        }
      } catch {
        // Fallback
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "โหลดข้อมูลล้มเหลว";
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  // Load teacher list & available classmates when creating group
  const handleOpenCreateGroup = async () => {
    setShowCreateGroup(true);
    try {
      const [teachRes, yearsRes] = await Promise.all([
        api.get<{ data?: User[] }>("/groups/teachers"),
        api.get<{ data?: AcademicYear[] }>("/academic-years/active")
      ]);
      if (Array.isArray(teachRes?.data)) {
        setTeachers(teachRes.data);
      }
      if (Array.isArray(yearsRes?.data) && yearsRes.data.length > 0) {
        setActiveYears(yearsRes.data);
        const curr = yearsRes.data.find((y) => y.is_current);
        if (curr) {
          setAcademicYear(curr.year);
        }
      }
    } catch {
      // Fallback
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectNameTh.trim() || !projectNameEn.trim()) {
      toast.error("กรุณากรอกชื่อโครงงานภาษาไทยและภาษาอังกฤษ");
      return;
    }

    setIsSubmittingGroup(true);
    try {
      const body: Record<string, unknown> = {
        project_name_th: projectNameTh.trim(),
        project_name_en: projectNameEn.trim(),
        academic_year: academicYear,
      };

      if (advisorId === "CUSTOM") {
        body.advisor_name = advisorCustom.trim();
      } else if (advisorId) {
        body.advisor_id = advisorId;
      }

      await api.post<{ group: ProjectGroup }>("/groups", body);

      toast.success("สร้างกลุ่มโครงงานเรียบร้อยแล้ว");
      setShowCreateGroup(false);
      fetchStudentData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "สร้างกลุ่มไม่สำเร็จ";
      toast.error(errorMsg);
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  // Open Edit Group modal
  const handleOpenEditGroup = () => {
    if (!group) return;
    setEditProjectNameTh(group.project_name_th || "");
    setEditProjectNameEn(group.project_name_en || "");
    if (group.advisor_id) {
      setEditAdvisorId(group.advisor_id);
      setEditAdvisorCustom("");
    } else if (group.advisor_name) {
      setEditAdvisorId("CUSTOM");
      setEditAdvisorCustom(group.advisor_name);
    } else {
      setEditAdvisorId("");
      setEditAdvisorCustom("");
    }
    setShowEditGroup(true);
  };

  // Save Edit Group
  const handleSaveEditGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;
    if (!editProjectNameTh.trim() || !editProjectNameEn.trim()) {
      toast.error("กรุณากรอกชื่อโครงงานภาษาไทยและภาษาอังกฤษ");
      return;
    }

    setIsSubmittingEditGroup(true);
    try {
      const body: Record<string, unknown> = {
        project_name_th: editProjectNameTh.trim(),
        project_name_en: editProjectNameEn.trim(),
      };

      if (editAdvisorId === "CUSTOM") {
        body.advisor_name = editAdvisorCustom.trim();
        body.advisor_id = null;
      } else if (editAdvisorId) {
        body.advisor_id = editAdvisorId;
      } else {
        body.advisor_id = null;
        body.advisor_name = "";
      }

      await api.put(`/groups/${group.id}`, body);
      toast.success("บันทึกการแก้ไขข้อมูลโครงงานสำเร็จ");
      setShowEditGroup(false);
      fetchStudentData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "แก้ไขข้อมูลโครงงานไม่สำเร็จ";
      toast.error(errorMsg);
    } finally {
      setIsSubmittingEditGroup(false);
    }
  };

  // Transfer Leader
  const handleSetLeader = async (targetUserId: string, targetName: string) => {
    if (!group) return;
    if (!confirm(`คุณต้องการแต่งตั้ง "${targetName}" ให้เป็นหัวหน้ากลุ่มคนใหม่ใช่หรือไม่?`)) return;

    try {
      await api.post(`/groups/${group.id}/leader/${targetUserId}`);
      toast.success(`แต่งตั้ง ${targetName} เป็นหัวหน้ากลุ่มเรียบร้อยแล้ว`);
      fetchStudentData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "เปลี่ยนหัวหน้ากลุ่มไม่สำเร็จ";
      toast.error(errorMsg);
    }
  };

  // Leave Group (for regular members)
  const handleLeaveGroup = async () => {
    if (!group || !user) return;
    if (!confirm("คุณต้องการออกจากกลุ่มโครงงานนี้ใช่หรือไม่?")) return;

    try {
      await api.delete(`/groups/${group.id}/members/${user.id}`);
      toast.success("ออกจากกลุ่มโครงงานเรียบร้อยแล้ว");
      fetchStudentData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "ออกจากกลุ่มไม่สำเร็จ";
      toast.error(errorMsg);
    }
  };

  // Fetch available students by room & academic year
  const fetchAvailableStudentsForRoom = async (room: string) => {
    setIsLoadingAvailableStudents(true)
    try {
      const year = group?.academic_year || user?.academic_year || academicYear || "2568"
      const params = new URLSearchParams()
      if (room && room !== "ALL") params.append("room", room)
      if (year) params.append("academic_year", year)

      const queryString = params.toString() ? `?${params.toString()}` : ""
      const res = await api.get<{ data: User[] }>(`/groups/search-students${queryString}`)
      setAvailableStudents(res.data || [])
    } catch {
      setAvailableStudents([])
    } finally {
      setIsLoadingAvailableStudents(false)
    }
  }

  // Open Add Member Modal
  const handleOpenAddMember = async () => {
    setShowAddMember(true)
    setSelectedStudentIds([])
    setFilterSearch("")
    const defaultRoom = group?.room || user?.room || ""
    setFilterRoom(defaultRoom)
    await fetchAvailableStudentsForRoom(defaultRoom)
  }

  const handleRoomFilterChange = async (room: string) => {
    setFilterRoom(room)
    await fetchAvailableStudentsForRoom(room)
  }

  const handleToggleSelectStudent = (studentId: string, maxSlots: number) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter((id) => id !== studentId))
    } else {
      if (selectedStudentIds.length >= maxSlots) {
        toast.warning(`กลุ่มนี้สามารถเลือกสมาชิกเพิ่มได้อีกไม่เกิน ${maxSlots} คน`)
        return
      }
      setSelectedStudentIds([...selectedStudentIds, studentId])
    }
  }

  const handleSelectAllInView = (studentsInView: User[], maxSlots: number) => {
    const idsInView = studentsInView.map((s) => s.id)
    const isAllSelected = idsInView.length > 0 && idsInView.every((id) => selectedStudentIds.includes(id))
    
    if (isAllSelected) {
      // Deselect those in view
      setSelectedStudentIds(selectedStudentIds.filter((id) => !idsInView.includes(id)))
    } else {
      // Select up to maxSlots
      const newSelection = Array.from(new Set([...selectedStudentIds, ...idsInView])).slice(0, maxSlots)
      if (newSelection.length === selectedStudentIds.length && idsInView.length > 0) {
        toast.warning(`กลุ่มนี้สามารถเลือกสมาชิกเพิ่มได้อีกไม่เกิน ${maxSlots} คน`)
      }
      setSelectedStudentIds(newSelection)
    }
  }

  const handleAddSelectedMembers = async () => {
    if (!group || selectedStudentIds.length === 0) return
    setIsSubmittingAddMembers(true)
    try {
      await api.post(`/groups/${group.id}/members`, {
        user_ids: selectedStudentIds,
      })
      toast.success(`เพิ่มเพื่อนร่วมกลุ่ม (${selectedStudentIds.length} คน) เรียบร้อยแล้ว`)
      setShowAddMember(false)
      setSelectedStudentIds([])
      setFilterSearch("")
      fetchStudentData()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "เพิ่มสมาชิกไม่สำเร็จ"
      toast.error(errorMsg)
    } finally {
      setIsSubmittingAddMembers(false)
    }
  }

  const handleDissolveGroup = async () => {
    if (!group) return
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการยุบกลุ่มโครงงานนี้? ข้อมูลการส่งงานและไฟล์ทั้งหมดจะถูกลบ")) {
      return
    }

    try {
      await api.delete(`/groups/${group.id}`)
      toast.success("ยุบกลุ่มโครงงานสำเร็จ")
      fetchStudentData()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "ยุบกลุ่มไม่สำเร็จ"
      toast.error(errorMsg)
    }
  }

  const handleRemoveMember = async (memberUserId: string) => {
    if (!group) return;
    if (!confirm("คุณต้องการลบสมาชิกท่านนี้ออกจากกลุ่มหรือไม่?")) return;

    try {
      await api.delete(`/groups/${group.id}/members/${memberUserId}`);
      toast.success("ลบสมาชิกออกจากกลุ่มเรียบร้อย");
      fetchStudentData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "ลบสมาชิกไม่สำเร็จ";
      toast.error(errorMsg);
    }
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || !showSubmitWork) return;

    if (submissionType === "file" && !selectedFile) {
      toast.error("กรุณาเลือกไฟล์ที่ต้องการส่ง");
      return;
    }
    if (submissionType === "link" && !submissionLink.trim()) {
      toast.error("กรุณากรอกลิงก์ผลงาน");
      return;
    }

    setIsUploadingWork(true);
    try {
      const formData = new FormData();
      formData.append("group_id", group.id);
      formData.append("step_id", showSubmitWork.id);
      formData.append("submission_type", submissionType);

      if (submissionType === "file" && selectedFile) {
        formData.append("file", selectedFile);
      } else {
        formData.append("file_path", submissionLink.trim());
      }

      await api.uploadFormData("/submissions", formData);
      toast.success("ส่งงานสำเร็จเรียบร้อยแล้ว");
      setShowSubmitWork(null);
      setSelectedFile(null);
      setSubmissionLink("");
      fetchStudentData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "ส่งงานไม่สำเร็จ";
      toast.error(errorMsg);
    } finally {
      setIsUploadingWork(false);
    }
  };

  const handleBookSlot = async (slotId: string) => {
    if (!group) {
      toast.error("กรุณาสร้างกลุ่มก่อนจองรอบนำเสนอ")
      return
    }

    try {
      await api.post("/presentation/bookings", {
        slot_id: slotId,
        group_id: group.id,
      })
      toast.success("จองรอบนำเสนอโครงงานสำเร็จ")
      fetchStudentData()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "จองรอบนำเสนอไม่สำเร็จ"
      toast.error(errorMsg)
    }
  }

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("คุณต้องการยกเลิกการจองรอบนำเสนอนี้ใช่หรือไม่?")) return

    try {
      await api.delete(`/presentation/bookings/${bookingId}`)
      toast.success("ยกเลิกการจองสำเร็จ")
      fetchStudentData()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "ยกเลิกไม่สำเร็จ"
      toast.error(errorMsg)
    }
  }

  // Period constants & Timetable helpers for Student
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

  const formatThaiDate = (dateStr?: string | Date) => {
    if (!dateStr) return "-"
    const d = new Date(dateStr)
    const monthsThai = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ]
    const day = d.getDate()
    const month = monthsThai[d.getMonth()]
    const year = d.getFullYear() + 543
    return `${day} ${month} ${year}`
  }

  const formatSlotTimeRange = (start?: string | Date, end?: string | Date) => {
    if (!start || !end) return "-"
    const s = new Date(start)
    const e = new Date(end)
    const sH = String(s.getHours()).padStart(2, "0")
    const sM = String(s.getMinutes()).padStart(2, "0")
    const eH = String(e.getHours()).padStart(2, "0")
    const eM = String(e.getMinutes()).padStart(2, "0")
    return `${sH}:${sM} - ${eH}:${eM} น.`
  }

  // Helper to find latest submission of a step
  const getStepSubmission = (stepId: string): Submission | undefined => {
    return submissions.find((s) => s.step_id === stepId);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-xl">
            <CheckCircle2 className="w-3.5 h-3.5" /> ผ่านการอนุมัติ (Approved)
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-xs font-bold px-2.5 py-1 rounded-xl">
            <XCircle className="w-3.5 h-3.5" /> ต้องแก้ไข (Rejected)
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 text-xs font-bold px-2.5 py-1 rounded-xl">
            <Clock className="w-3.5 h-3.5" /> รอการตรวจ (Pending)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-medium px-2.5 py-1 rounded-xl">
            ยังไม่ส่งงาน
          </span>
        );
    }
  };

  return (
    <DashboardLayout allowedRoles={["STUDENT"]} defaultTab="group">
      {({ activeTab, setActiveTab }) => {
        if (isLoading) {
          return (
            <div className="flex flex-col items-center justify-center p-12 space-y-3">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500">กำลังโหลดข้อมูลโครงงาน...</p>
            </div>
          );
        }

        return (
          <>
            {/* ==================== TAB 1: GROUP ==================== */}
            {activeTab === "group" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Group Banner */}
                <div className="bg-gradient-to-r from-brand-500 via-brand-600 to-brand-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                      <span className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase mb-2">
                        {group ? `กลุ่มโครงงาน ห้อง ${group.room || user?.room || "-"}` : "สถานะ: ยังไม่มีกลุ่ม"}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-bold">
                        {group ? group.project_name_th : "ยังไม่ได้เข้าร่วมกลุ่มโครงงาน"}
                      </h2>
                      <p className="text-brand-100 text-xs sm:text-sm mt-1 font-en">
                        {group ? group.project_name_en : "สามารถสร้างกลุ่มใหม่หรือขอให้หัวหน้ากลุ่มเพิ่มคุณเข้ากลุ่ม"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {!group && (
                        <button
                          onClick={handleOpenCreateGroup}
                          className="bg-white text-brand-600 hover:bg-brand-50 px-5 py-2.5 rounded-2xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" /> สร้างกลุ่มโครงงานใหม่
                        </button>
                      )}

                      {group && (
                        <button
                          onClick={handleOpenEditGroup}
                          className="bg-white text-brand-700 hover:bg-brand-50 px-4 py-2 rounded-2xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" /> แก้ไขข้อมูลโครงงาน
                        </button>
                      )}

                      {group && isLeader && (
                        <button
                          onClick={handleDissolveGroup}
                          className="bg-rose-500/20 hover:bg-rose-500/30 text-white border border-white/20 px-4 py-2 rounded-2xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> ขอยุบกลุ่ม
                        </button>
                      )}

                      {group && !isLeader && (
                        <button
                          onClick={handleLeaveGroup}
                          className="bg-rose-500/20 hover:bg-rose-500/30 text-white border border-white/20 px-4 py-2 rounded-2xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" /> ออกจากกลุ่ม
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Group Details */}
                {group ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Members List */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                              สมาชิกในกลุ่ม ({group.members?.length || 0}/{maxMembersLimit} คน)
                            </h3>
                            <p className="text-[11px] text-slate-400">
                              สูงสุด {maxMembersLimit} คนต่อกลุ่ม
                            </p>
                          </div>
                        </div>

                        {(group.members?.length || 0) < maxMembersLimit && (
                          <button
                            onClick={handleOpenAddMember}
                            className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> เพิ่มเพื่อนเข้ากลุ่ม
                          </button>
                        )}
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {group.members?.map((m) => (
                          <div key={m.id} className="py-3.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                m.is_leader
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400"
                              }`}>
                                {m.is_leader ? <Crown className="w-4 h-4 text-amber-500" /> : (m.user?.full_name?.charAt(0) || "U")}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 truncate">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {m.user?.full_name}
                                  </span>
                                  {m.is_leader ? (
                                    <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0">
                                      👑 หัวหน้ากลุ่ม
                                    </span>
                                  ) : (
                                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded-md shrink-0">
                                      สมาชิก
                                    </span>
                                  )}
                                  {m.user_id === user?.id && (
                                    <span className="text-[10px] text-brand-600 dark:text-brand-400 font-bold">
                                      (คุณ)
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-en truncate">
                                  {m.user?.email} {m.user?.student_id ? `· รหัส ${m.user.student_id}` : ""} · ห้อง {m.user?.room ? `ม.${m.user.room}` : "-"}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isLeader && !m.is_leader && (
                                <button
                                  onClick={() => handleSetLeader(m.user_id, m.user?.full_name || "สมาชิก")}
                                  className="text-[10px] font-bold text-amber-700 hover:text-amber-800 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                  title="มอบหมายให้เป็นหัวหน้ากลุ่ม"
                                >
                                  <Crown className="w-3 h-3 text-amber-500" /> มอบหมายหัวหน้า
                                </button>
                              )}
                              {isLeader && !m.is_leader && (
                                <button
                                  onClick={() => handleRemoveMember(m.user_id)}
                                  className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors cursor-pointer"
                                  title="ลบออกจากกลุ่ม"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Advisor & Summary Card */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                            <Award className="w-4 h-4" />
                          </div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            ข้อมูลที่ปรึกษา & โครงงาน
                          </h3>
                        </div>

                        <button
                          onClick={handleOpenEditGroup}
                          className="text-brand-600 hover:text-brand-700 dark:text-brand-400 text-xs font-bold flex items-center gap-1 p-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950 transition-colors cursor-pointer"
                          title="แก้ไขข้อมูลโครงงาน"
                        >
                          <Pencil className="w-3.5 h-3.5" /> แก้ไข
                        </button>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 space-y-1">
                          <span className="text-[11px] text-slate-400">ครูที่ปรึกษาโครงงาน</span>
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
                            <School className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                            <span>{group.advisor?.full_name || group.advisor_name || "ยังไม่ได้ระบุ"}</span>
                          </div>
                          {group.advisor?.email && (
                            <span className="text-[10px] text-slate-500 font-en">{group.advisor.email}</span>
                          )}
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 flex justify-between items-center">
                          <span className="text-[11px] text-slate-400">ปีการศึกษา</span>
                          <span className="font-bold text-brand-600 dark:text-brand-400 font-en">
                            {group.academic_year || "2568"}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 flex justify-between items-center">
                          <span className="text-[11px] text-slate-400">ห้องเรียน</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {group.room ? `ม.${group.room}` : "-"}
                          </span>
                        </div>

                        <div className="pt-2">
                          <button
                            onClick={() => setActiveTab("milestones")}
                            className="w-full bg-brand-50 hover:bg-brand-100 dark:bg-brand-950 dark:hover:bg-brand-900 text-brand-700 dark:text-brand-300 font-bold py-2.5 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <span>ไปยังขั้นตอนการส่งงาน</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-500 mx-auto flex items-center justify-center">
                      <Users className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">ยังไม่มีกลุ่มโครงงาน</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                      คลิกปุ่ม &quot;สร้างกลุ่มโครงงานใหม่&quot; ด้านบนเพื่อเป็นหัวหน้ากลุ่ม หรือรอให้เพื่อนร่วมชั้นเรียนเพิ่มชื่อคุณเข้ากลุ่ม
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ==================== TAB 2: MILESTONES ==================== */}
            {activeTab === "milestones" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">ขั้นตอนส่งงานตามเกณฑ์ (Milestones)</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ส่งงานตามขั้นตอนและตรวจสอบผลการตรวจจากครูผู้สอน
                  </p>
                </div>

                {!group && (
                  <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 p-4 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-200 text-xs">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>คุณต้องสร้างกลุ่มหรือเข้าร่วมกลุ่มโครงงานก่อน จึงจะสามารถส่งงานในแต่ละขั้นตอนได้</span>
                  </div>
                )}

                <div className="space-y-4">
                  {steps.map((step, idx) => {
                    const sub = getStepSubmission(step.id);

                    return (
                      <div
                        key={step.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm hover:border-brand-500/30 transition-all space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start sm:items-center gap-3">
                            <span className="w-8 h-8 rounded-xl bg-brand-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                  {step.step_name}
                                </h3>
                                <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-2 py-0.5 rounded-md">
                                  คะแนนเต็ม: {step.max_score} คะแนน
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {step.description || "ไม่มีคำอธิบายเพิ่มเติม"}
                              </p>
                            </div>
                          </div>

                          <div>{getStatusBadge(sub?.status)}</div>
                        </div>

                        {/* Download Form / Example */}
                        {(step.file_form_path || step.file_example_path || step.deadline) && (
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                            {step.deadline && (
                              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 mr-2">
                                <Clock className="w-3.5 h-3.5 text-brand-500" />
                                กำหนดส่ง: {formatDate(step.deadline)}
                              </span>
                            )}

                            {step.file_form_path && (
                              <a
                                href={step.file_form_path.startsWith("http") ? step.file_form_path : api.getDownloadUrl(step.file_form_path)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" /> ดาวน์โหลดแบบฟอร์ม
                              </a>
                            )}

                            {step.file_example_path && (
                              <a
                                href={step.file_example_path.startsWith("http") ? step.file_example_path : api.getDownloadUrl(step.file_example_path)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> ดูเอกสารตัวอย่าง
                              </a>
                            )}
                          </div>
                        )}

                        {/* Submission History / Feedback */}
                        {sub && (
                          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/60 dark:border-slate-800 space-y-2 text-xs">
                            <div className="flex flex-wrap justify-between items-center gap-2">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                ส่งงานรอบที่ {sub.revision_number} · เมื่อ {formatDate(sub.submitted_at)}
                              </span>
                              <div className="flex items-center gap-3">
                                {sub.score !== null && sub.score !== undefined && (
                                  <span className="font-bold text-brand-600 dark:text-brand-400">
                                    คะแนนที่ได้: {sub.score} / {step.max_score}
                                  </span>
                                )}
                                {sub.file_path && (
                                  <a
                                    href={sub.file_path.startsWith("http") ? sub.file_path : api.getDownloadUrl(sub.file_path)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-medium"
                                  >
                                    {sub.submission_type === "link" ? <LinkIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                    เปิดดูงานที่ส่ง
                                  </a>
                                )}
                              </div>
                            </div>

                            {sub.comment && (
                              <div className="flex items-start gap-2 pt-1 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/40 dark:border-slate-800">
                                <MessageSquare className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">ข้อเสนอแนะจากครู: </span>
                                  <span>{sub.comment}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Button */}
                        {group && (
                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => {
                                setShowSubmitWork(step);
                                setSubmissionType("file");
                                setSelectedFile(null);
                                setSubmissionLink("");
                              }}
                              className="bg-brand-500 hover:bg-brand-600 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-brand-500/20"
                            >
                              <UploadCloud className="w-4 h-4" />
                              {sub ? "ส่งงานแก้ไขใหม่ (Resubmit)" : "ส่งงานในขั้นตอนนี้"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ==================== TAB 3: DEFENSE ==================== */}
            {activeTab === "defense" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* 1. Booked Slot Confirmation Card (if already booked) */}
                {group?.booking && (
                  <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 rounded-3xl overflow-hidden shadow-sm">
                    {/* Top Green Banner */}
                    <div className="bg-emerald-500 text-white py-3 px-6 text-center font-bold text-sm flex items-center justify-center gap-2 shadow-xs">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>กลุ่มของคุณจองเวลาเรียบร้อยแล้ว</span>
                    </div>

                    <div className="p-6 sm:p-8 text-center space-y-4">
                      {/* Big Thai Date */}
                      <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                        {formatThaiDate(group.booking.slot?.start_time)}
                      </h3>

                      {/* Time */}
                      <div className="text-lg font-bold text-brand-600 dark:text-brand-400 font-en">
                        {formatSlotTimeRange(group.booking.slot?.start_time, group.booking.slot?.end_time)}
                      </div>

                      {/* Location */}
                      <div className="flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-300 text-sm font-medium">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{group.booking.slot?.location || "ห้องสอบโครงงาน"}</span>
                      </div>

                      {/* Cancel Button */}
                      <div className="pt-2">
                        <button
                          onClick={() => handleCancelBooking(group.booking!.id)}
                          className="border border-rose-500 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-bold px-8 py-2 rounded-xl text-xs transition-all cursor-pointer"
                        >
                          ยกเลิกการจอง
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Timetable Grid View */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        ตารางการนำเสนอ (Presentation Timetable)
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {group?.booking
                          ? "คุณสามารถเปลี่ยนรอบนำเสนอได้โดยการคลิกปุ่ม 'จอง' ในรอบใหม่ที่ต้องการ"
                          : "เลือกรอบนำเสนอและช่วงเวลาที่สะดวกสำหรับกลุ่มของคุณ"}
                      </p>
                    </div>

                    <div className="text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-3 py-1.5 rounded-xl border border-brand-200/60 dark:border-brand-900/60 self-start sm:self-auto">
                      ปีการศึกษา {academicYear || "2568"}
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

                  {/* Table Grid */}
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
                                if (cellSlots.length === 0) {
                                  return (
                                    <td key={dayIdx} className="p-3 border-r last:border-r-0 border-slate-200/40 dark:border-slate-800/60 text-slate-300 dark:text-slate-700 align-middle">
                                      -
                                    </td>
                                  )
                                }
                                return (
                                  <td key={dayIdx} className="p-2 border-r last:border-r-0 border-slate-200/40 dark:border-slate-800/60 align-middle">
                                    <div className="space-y-1.5">
                                      {cellSlots.map((slot) => {
                                        const isBookedByMe = group?.booking?.slot_id === slot.id
                                        const bookedCount = slot.bookings?.length || 0
                                        const isFull = bookedCount >= slot.max_groups

                                        return (
                                          <div
                                            key={slot.id}
                                            className={`rounded-xl p-2.5 border text-center text-xs space-y-1.5 transition-all ${
                                              isBookedByMe
                                                ? "bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 shadow-xs"
                                                : isFull
                                                ? "bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/60 opacity-80"
                                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 shadow-xs"
                                            }`}
                                          >
                                            <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                                              {slot.location}
                                            </div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-en">
                                              {bookedCount}/{slot.max_groups}
                                            </div>

                                            {isBookedByMe ? (
                                              <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] py-1 px-2 rounded-lg block border border-emerald-200/80 dark:border-emerald-900/60">
                                                ✓ รอบของคุณ
                                              </span>
                                            ) : isFull ? (
                                              <span className="bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-semibold text-[11px] py-1 px-2 rounded-lg block">
                                                เต็ม
                                              </span>
                                            ) : (
                                              <button
                                                onClick={() => handleBookSlot(slot.id)}
                                                className="w-full bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-bold text-[11px] py-1.5 px-3 rounded-lg shadow-xs transition-all cursor-pointer"
                                              >
                                                จอง
                                              </button>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
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
                                if (cellSlots.length === 0) {
                                  return (
                                    <td key={dayIdx} className="p-3 border-r last:border-r-0 border-slate-200/40 dark:border-slate-800/60 text-slate-300 dark:text-slate-700 align-middle">
                                      -
                                    </td>
                                  )
                                }
                                return (
                                  <td key={dayIdx} className="p-2 border-r last:border-r-0 border-slate-200/40 dark:border-slate-800/60 align-middle">
                                    <div className="space-y-1.5">
                                      {cellSlots.map((slot) => {
                                        const isBookedByMe = group?.booking?.slot_id === slot.id
                                        const bookedCount = slot.bookings?.length || 0
                                        const isFull = bookedCount >= slot.max_groups

                                        return (
                                          <div
                                            key={slot.id}
                                            className={`rounded-xl p-2.5 border text-center text-xs space-y-1.5 transition-all ${
                                              isBookedByMe
                                                ? "bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 shadow-xs"
                                                : isFull
                                                ? "bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/60 opacity-80"
                                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 shadow-xs"
                                            }`}
                                          >
                                            <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                                              {slot.location}
                                            </div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-en">
                                              {bookedCount}/{slot.max_groups}
                                            </div>

                                            {isBookedByMe ? (
                                              <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] py-1 px-2 rounded-lg block border border-emerald-200/80 dark:border-emerald-900/60">
                                                ✓ รอบของคุณ
                                              </span>
                                            ) : isFull ? (
                                              <span className="bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-semibold text-[11px] py-1 px-2 rounded-lg block">
                                                เต็ม
                                              </span>
                                            ) : (
                                              <button
                                                onClick={() => handleBookSlot(slot.id)}
                                                className="w-full bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-bold text-[11px] py-1.5 px-3 rounded-lg shadow-xs transition-all cursor-pointer"
                                              >
                                                จอง
                                              </button>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
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
              </div>
            )}

            {/* ==================== TAB 4: SCORES ==================== */}
            {activeTab === "scores" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">ผลการประเมินโครงงานและคะแนน Rubric</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    สรุปผลคะแนนจากคณะกรรมการการนำเสนอโครงงานคอมพิวเตอร์
                  </p>
                </div>

                {(!group?.booking?.scores || group.booking.scores.length === 0) ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-500 mx-auto flex items-center justify-center">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white">ยังไม่มีการบันทึกคะแนนการนำเสนอ</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      คะแนนจะแสดงขึ้นเมื่อคณะกรรมการทำการประเมินในรอบนำเสนอเสร็จสิ้น
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {group.booking.scores.map((score, idx) => (
                      <div
                        key={score.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 font-bold flex items-center justify-center text-xs">
                              #{idx + 1}
                            </span>
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                กรรมการท่านที่ {idx + 1}
                              </h4>
                              <p className="text-[11px] text-slate-400">ประเมินเมื่อ {formatDate(score.scored_at)}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[11px] text-slate-400">คะแนนรวม</span>
                            <div className="text-lg font-bold text-brand-600 dark:text-brand-400">
                              {formatScore(score.total_score)}
                            </div>
                          </div>
                        </div>

                        {score.comments && (
                          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                            <span className="font-bold text-slate-800 dark:text-slate-200">ข้อเสนอแนะ: </span>
                            <span>{score.comments}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Modal: Create Group */}
            <Modal
              isOpen={showCreateGroup}
              onClose={() => setShowCreateGroup(false)}
              title="สร้างกลุ่มโครงงานใหม่"
              icon={Plus}
              maxWidth="lg"
            >
              <form onSubmit={handleCreateGroup} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ชื่อโครงงาน (ภาษาไทย) *
                  </label>
                  <input
                    type="text"
                    required
                    value={projectNameTh}
                    onChange={(e) => setProjectNameTh(e.target.value)}
                    placeholder="เช่น ระบบตรวจจับฝุ่น PM 2.5 ด้วย IoT"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ชื่อโครงงาน (ภาษาอังกฤษ) *
                  </label>
                  <input
                    type="text"
                    required
                    value={projectNameEn}
                    onChange={(e) => setProjectNameEn(e.target.value)}
                    placeholder="e.g. IoT PM 2.5 Air Quality Detection System"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 font-en"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ครูที่ปรึกษาโครงงาน
                  </label>
                  <select
                    value={advisorId}
                    onChange={(e) => setAdvisorId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
                  >
                    <option value="">-- เลือกครูที่ปรึกษา (สามารถเลือกภายหลังได้) --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} ({t.email})
                      </option>
                    ))}
                    <option value="CUSTOM">ระบุชื่อครูที่ปรึกษาเอง (Custom)</option>
                  </select>
                </div>

                {advisorId === "CUSTOM" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      ชื่อครูที่ปรึกษา (พิมพ์เอง)
                    </label>
                    <input
                      type="text"
                      required
                      value={advisorCustom}
                      onChange={(e) => setAdvisorCustom(e.target.value)}
                      placeholder="เช่น คุณครูสมศักดิ์ รักเรียน"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <CalendarRange className="w-3.5 h-3.5 text-brand-500" />
                    ปีการศึกษา (Academic Year)
                  </label>
                  {activeYears.length > 0 ? (
                    <select
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
                    >
                      {activeYears.map((y) => (
                        <option key={y.id} value={y.year}>
                          ปีการศึกษา {y.year} (ภาคเรียนที่ {y.term}) {y.is_current ? "⭐ ปีปัจจุบัน" : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 font-en"
                    />
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateGroup(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingGroup}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-md shadow-brand-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingGroup ? "กำลังสร้างกลุ่ม..." : "ยืนยันสร้างกลุ่ม"}
                  </button>
                </div>
              </form>
            </Modal>

            {/* Modal: Edit Group */}
            <Modal
              isOpen={showEditGroup && !!group}
              onClose={() => setShowEditGroup(false)}
              title="แก้ไขข้อมูลกลุ่มโครงงาน"
              description={group ? `ห้อง ม.${group.room || user?.room || "-"}` : undefined}
              icon={Pencil}
              maxWidth="lg"
            >
              <form onSubmit={handleSaveEditGroup} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ชื่อโครงงาน (ภาษาไทย) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editProjectNameTh}
                    onChange={(e) => setEditProjectNameTh(e.target.value)}
                    placeholder="เช่น ระบบตรวจจับฝุ่น PM 2.5 ด้วย IoT"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ชื่อโครงงาน (ภาษาอังกฤษ) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editProjectNameEn}
                    onChange={(e) => setEditProjectNameEn(e.target.value)}
                    placeholder="e.g. IoT PM 2.5 Air Quality Detection System"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 font-en"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ครูที่ปรึกษาโครงงาน
                  </label>
                  <select
                    value={editAdvisorId}
                    onChange={(e) => setEditAdvisorId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
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

                {editAdvisorId === "CUSTOM" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      ชื่อครูที่ปรึกษา (พิมพ์เอง)
                    </label>
                    <input
                      type="text"
                      required
                      value={editAdvisorCustom}
                      onChange={(e) => setEditAdvisorCustom(e.target.value)}
                      placeholder="เช่น คุณครูสมศักดิ์ รักเรียน"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditGroup(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEditGroup}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-md shadow-brand-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingEditGroup ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                  </button>
                </div>
              </form>
            </Modal>

            {/* Modal: Add Member (Multi-Select) */}
            <Modal
              isOpen={showAddMember}
              onClose={() => setShowAddMember(false)}
              title="เพิ่มเพื่อนร่วมกลุ่มโครงงาน"
              description="เลือกเพื่อนร่วมห้องหรือเพื่อนระดับชั้น ม.6 ที่ยังไม่มีกลุ่ม เพื่อเพิ่มเข้ากลุ่มโครงงานพร้อมกัน"
              icon={UserPlus}
              maxWidth="2xl"
            >
              {(() => {
                const currentMembersCount = group?.members?.length || 1
                const remainingSlots = Math.max(0, maxMembersLimit - currentMembersCount)
                const filteredStudents = availableStudents.filter((s) => {
                  const q = filterSearch.toLowerCase().trim()
                  if (!q) return true
                  return (
                    s.full_name?.toLowerCase().includes(q) ||
                    s.student_id?.toLowerCase().includes(q) ||
                    s.room?.toLowerCase().includes(q)
                  )
                })
                const allVisibleSelected = filteredStudents.length > 0 && filteredStudents.every((s) => selectedStudentIds.includes(s.id))

                return (
                  <div className="space-y-4">
                    {/* Quota & Status Banner */}
                    <div className="bg-brand-50/70 dark:bg-brand-950/40 border border-brand-200/80 dark:border-brand-900/60 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            สมาชิกปัจจุบัน: <span className="font-en text-brand-600 dark:text-brand-400">{currentMembersCount} / {maxMembersLimit}</span> คน
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {remainingSlots > 0 ? (
                              <span>สามารถเลือกเพิ่มได้อีกสูงสุด <strong className="font-en text-brand-600 dark:text-brand-400 font-bold">{remainingSlots}</strong> คน</span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">กลุ่มนี้มีสมาชิกครบตามจำนวนสูงสุดแล้ว</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-brand-300/80 dark:border-brand-800 text-brand-700 dark:text-brand-300 font-bold shadow-xs">
                          เลือกแล้ว {selectedStudentIds.length} คน
                        </span>
                      </div>
                    </div>

                    {/* Filter Bar: Room Selector + Instant Search */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-5 flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <select
                          value={filterRoom}
                          onChange={(e) => handleRoomFilterChange(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
                        >
                          <option value={group?.room || user?.room || ""}>
                            ห้องของฉัน (ม.{group?.room || user?.room || "-"})
                          </option>
                          <option value="ALL">ทุกห้องเรียน (ม.6 ทั้งหมด)</option>
                          {["6.1", "6.2", "6.3", "6.4", "6.5", "6.6"]
                            .filter((r) => r !== (group?.room || user?.room))
                            .map((r) => (
                              <option key={r} value={r}>
                                ห้อง ม.{r}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="sm:col-span-7 relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={filterSearch}
                          onChange={(e) => setFilterSearch(e.target.value)}
                          placeholder="ค้นหาชื่อ หรือ รหัสนักเรียน..."
                          className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
                        />
                      </div>
                    </div>

                    {/* Multi-Select Toolbar */}
                    <div className="flex items-center justify-between text-xs px-1 text-slate-500 dark:text-slate-400">
                      <span>
                        พบเพื่อนที่ยังไม่มีกลุ่ม <strong className="font-en text-slate-800 dark:text-slate-200">{filteredStudents.length}</strong> คน
                      </span>
                      {filteredStudents.length > 0 && remainingSlots > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSelectAllInView(filteredStudents, remainingSlots)}
                          className="text-brand-600 dark:text-brand-400 hover:underline font-semibold cursor-pointer text-xs"
                        >
                          {allVisibleSelected ? "ยกเลิกการเลือกทั้งหมด" : `เลือกทั้งหมด (${Math.min(filteredStudents.length, remainingSlots)} คน)`}
                        </button>
                      )}
                    </div>

                    {/* Student Multi-Select List */}
                    <div className="max-h-72 overflow-y-auto space-y-1.5 p-1 border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-slate-50/40 dark:bg-slate-950/40">
                      {isLoadingAvailableStudents ? (
                        <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-brand-500" />
                          <span>กำลังโหลดรายชื่อนักเรียน...</span>
                        </div>
                      ) : filteredStudents.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          {filterSearch ? "ไม่พบนักเรียนที่ตรงกับคำค้นหา" : "ไม่พบเพื่อนที่ยังไม่มีกลุ่มในห้องที่เลือก"}
                        </div>
                      ) : (
                        filteredStudents.map((std) => {
                          const isSelected = selectedStudentIds.includes(std.id)
                          const isReachedLimit = !isSelected && selectedStudentIds.length >= remainingSlots
                          const isDisabled = remainingSlots === 0 || isReachedLimit

                          return (
                            <div
                              key={std.id}
                              onClick={() => {
                                if (!isDisabled || isSelected) {
                                  handleToggleSelectStudent(std.id, remainingSlots)
                                }
                              }}
                              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                                isSelected
                                  ? "bg-brand-50/90 dark:bg-brand-950/60 border-brand-500 shadow-xs"
                                  : isDisabled
                                  ? "bg-slate-100/50 dark:bg-slate-900/20 border-slate-200/50 dark:border-slate-800/40 opacity-50 cursor-not-allowed"
                                  : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 hover:border-brand-300 dark:hover:border-brand-700 cursor-pointer"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {/* Custom Checkbox */}
                                <div
                                  className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                                    isSelected
                                      ? "bg-brand-500 border-brand-500 text-white"
                                      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                                  }`}
                                >
                                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>

                                {/* Avatar & Info */}
                                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                                  {std.full_name?.charAt(0) || "น"}
                                </div>

                                <div>
                                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>{std.full_name}</span>
                                    {isSelected && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400">
                                        เลือกแล้ว
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-en flex items-center gap-2">
                                    <span>รหัส {std.student_id || "-"}</span>
                                    <span>·</span>
                                    <span>ห้อง ม.{std.room || "-"}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  ม.{std.room || "-"}
                                </span>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>

                    {/* Modal Footer Actions */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {selectedStudentIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedStudentIds([])}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline cursor-pointer"
                          >
                            ล้างการเลือกทั้งหมด
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setShowAddMember(false)}
                          className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          disabled={selectedStudentIds.length === 0 || isSubmittingAddMembers}
                          onClick={handleAddSelectedMembers}
                          className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          {isSubmittingAddMembers ? "กำลังเพิ่มสมาชิก..." : `เพิ่มสมาชิกที่เลือก (${selectedStudentIds.length} คน)`}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </Modal>

            {/* Modal: Submit Work */}
            <Modal
              isOpen={!!showSubmitWork}
              onClose={() => setShowSubmitWork(null)}
              title="ส่งงาน/ผลงาน"
              description={showSubmitWork ? `ขั้นตอน: ${showSubmitWork.step_name}` : undefined}
              maxWidth="lg"
            >
              <form onSubmit={handleSubmitWork} className="space-y-4">
                {/* Type Switcher */}
                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setSubmissionType("file")}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      submissionType === "file"
                        ? "bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    📁 อัปโหลดไฟล์ (PDF/Word/ZIP &le; 20MB)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionType("link")}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      submissionType === "link"
                        ? "bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    🔗 ส่งเป็นลิงก์ (URL / Google Drive)
                  </button>
                </div>

                {submissionType === "file" ? (
                  <div className="space-y-1.5" key="file-wrapper">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      เลือกไฟล์งาน (ขนาดไม่เกิน 20MB)
                    </label>
                    <input
                      key="submit-file-input"
                      type="file"
                      required
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 dark:file:bg-brand-950 dark:file:text-brand-300 hover:file:bg-brand-100"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5" key="link-wrapper">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      ลิงก์ผลงาน (URL)
                    </label>
                    <input
                      key="submit-link-input"
                      type="url"
                      required
                      value={submissionLink || ""}
                      onChange={(e) => setSubmissionLink(e.target.value)}
                      placeholder="https://drive.google.com/... หรือ https://github.com/..."
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 font-en"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSubmitWork(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isUploadingWork}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-md shadow-brand-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingWork ? "กำลังอัปโหลด..." : "ยืนยันส่งงาน"}
                  </button>
                </div>
              </form>
            </Modal>
          </>
        );
      }}
    </DashboardLayout>
  );
}
