"use client"

import React, { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { useAuthStore } from "@/store/useAuthStore"
import { api } from "@/lib/api"
import { 
  Submission, 
  MatrixRow, 
  MatrixStepCell,
  ProjectGroup,
  PresentationSlot, 
  PresentationCriteria, 
  PresentationBooking,
  ProjectStep,
  AcademicYear 
} from "@/types"
import { formatDate, formatScore, compareRooms } from "@/lib/utils"
import { toast } from "sonner"
import { Modal } from "@/components/ui/modal"
import { 
  ListOrdered, 
  TableProperties, 
  Award, 
  FileSpreadsheet, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Filter, 
  School, 
  Eye, 
  Send, 
  FileText, 
  Link as LinkIcon, 
  MapPin, 
  Users, 
  UserCheck, 
  Download,
  CalendarRange,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LayoutGrid,
  List,
  Sparkles,
  Info,
  Edit3
} from "lucide-react"

export default function TeacherPage() {
  const { user } = useAuthStore()
  const [assignedRooms, setAssignedRooms] = useState<string[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string>("")
  const [activeYears, setActiveYears] = useState<AcademicYear[]>([])
  const [selectedYear, setSelectedYear] = useState<string>("2568")
  const [queue, setQueue] = useState<Submission[]>([])
  const [matrix, setMatrix] = useState<MatrixRow[]>([])
  const [steps, setSteps] = useState<ProjectStep[]>([])
  const [slots, setSlots] = useState<PresentationSlot[]>([])
  const [criteriaList, setCriteriaList] = useState<PresentationCriteria[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Review Modal State
  const [reviewSubmission, setReviewSubmission] = useState<Submission | null>(null)
  const [reviewStatus, setReviewStatus] = useState<"APPROVED" | "REJECTED">("APPROVED")
  const [reviewScore, setReviewScore] = useState<number>(0)
  const [reviewComment, setReviewComment] = useState("")
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  // Rubric Score Modal State
  const [rubricBooking, setRubricBooking] = useState<PresentationBooking | null>(null)
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({})
  const [rubricComments, setRubricComments] = useState("")
  const [isSubmittingRubric, setIsSubmittingRubric] = useState(false)
  const [rubricTab, setRubricTab] = useState<"evaluate" | "history">("evaluate")

  // Defense Schedule View State
  const [defenseViewMode, setDefenseViewMode] = useState<"grid" | "list">("grid")
  const [slotWeekStart, setSlotWeekStart] = useState<Date>(() => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const mon = new Date(d)
    mon.setDate(diff)
    mon.setHours(0, 0, 0, 0)
    return mon
  })

  // 1. Fetch initial teacher static data (years, steps, criteria)
  const fetchTeacherData = useCallback(async () => {
    try {
      setIsLoading(true)

      // Steps
      const stepsRes = await api.get<{ data?: ProjectStep[]; steps?: ProjectStep[] }>("/steps")
      const stepsList = stepsRes?.data || stepsRes?.steps || []
      if (Array.isArray(stepsList)) {
        setSteps(stepsList.filter((s) => s.is_active))
      }

      // Criteria
      const critRes = await api.get<{ data?: PresentationCriteria[]; criteria?: PresentationCriteria[] }>("/presentation/criteria")
      const critList = critRes?.data || critRes?.criteria || []
      if (Array.isArray(critList)) {
        setCriteriaList(critList.filter((c) => c.is_active))
      }

      // Active Academic Years
      try {
        const yearsRes = await api.get<{ data?: AcademicYear[] }>("/academic-years/active")
        const yearsList = yearsRes?.data || []
        if (Array.isArray(yearsList) && yearsList.length > 0) {
          setActiveYears(yearsList)
          const curr = yearsList.find((y) => y.is_current)
          if (curr) {
            setSelectedYear(curr.year)
          } else {
            setSelectedYear(yearsList[0].year)
          }
        }
      } catch {
        // Fallback default
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ"
      toast.error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTeacherData()
  }, [fetchTeacherData])

  // 2. Fetch Assigned Rooms, Queue, Matrix, and Slots whenever selectedYear or selectedRoom changes
  const fetchRoomSpecificData = useCallback(async () => {
    try {
      const yr = selectedYear || "2568"

      // Assigned rooms for selected year
      const roomsRes = await api.get<{ data?: string[]; rooms?: string[] }>("/teacher/assigned-rooms", {
        academic_year: yr
      })
      const roomsList = (roomsRes?.data || roomsRes?.rooms || []).sort(compareRooms)
      if (Array.isArray(roomsList)) {
        setAssignedRooms(roomsList)
      }

      // Slots for selected year
      const slotsRes = await api.get<{ data?: PresentationSlot[]; slots?: PresentationSlot[] }>("/presentation/slots", {
        academic_year: yr
      })
      const slotsList = slotsRes?.data || slotsRes?.slots || []
      if (Array.isArray(slotsList)) {
        setSlots(slotsList)
      }

      // Pending Queue
      const queueRes = await api.get<{ data?: Submission[]; queue?: Submission[] }>("/teacher/queue", {
        academic_year: yr,
        room: selectedRoom || undefined,
      })
      const queueList = queueRes?.data || queueRes?.queue || []
      if (Array.isArray(queueList)) {
        setQueue(queueList)
      }

      // Progress Matrix
      const matrixRes = await api.get<{
        data?: { steps?: ProjectStep[]; groups?: ProjectGroup[] } | MatrixRow[]
        matrix?: MatrixRow[]
      }>("/teacher/progress-matrix", {
        academic_year: yr,
        room: selectedRoom || undefined,
      })

      let matrixList: MatrixRow[] = []
      if (Array.isArray(matrixRes?.data)) {
        matrixList = matrixRes.data
      } else if (matrixRes?.data && typeof matrixRes.data === "object" && "groups" in matrixRes.data && Array.isArray(matrixRes.data.groups)) {
        const rawGroups = matrixRes.data.groups
        if (matrixRes.data.steps && Array.isArray(matrixRes.data.steps) && matrixRes.data.steps.length > 0) {
          setSteps(matrixRes.data.steps.filter((s) => s.is_active))
        }
        matrixList = rawGroups.map((g) => {
          const stepMap: Record<string, MatrixStepCell> = {}
          let totalScore = 0
          g.submissions?.forEach((sub) => {
            stepMap[sub.step_id] = {
              step_id: sub.step_id,
              status: sub.status,
              score: sub.score !== undefined && sub.score !== null ? Number(sub.score) : null,
              submission_id: sub.id,
            }
            if (sub.score !== undefined && sub.score !== null) {
              totalScore += Number(sub.score)
            }
          })

          return {
            group_id: g.id,
            project_name_th: g.project_name_th,
            project_name_en: g.project_name_en,
            room: g.room || "",
            advisor_name: g.advisor_name || g.advisor?.full_name,
            members: g.members?.map((m) => ({
              id: m.user_id,
              student_id: m.user?.student_id || undefined,
              full_name: m.user?.full_name || "สมาชิก",
              room: m.user?.room || undefined,
              is_leader: m.is_leader,
            })) || [],
            steps: stepMap,
            total_score: totalScore,
          }
        })
      } else if (Array.isArray(matrixRes?.matrix)) {
        matrixList = matrixRes.matrix
      }

      setMatrix(matrixList)
    } catch {
      // Ignore
    }
  }, [selectedRoom, selectedYear])

  useEffect(() => {
    fetchRoomSpecificData()
  }, [fetchRoomSpecificData])

  // Open review modal
  const handleOpenReview = (sub: Submission) => {
    setReviewSubmission(sub);
    setReviewStatus("APPROVED");
    setReviewScore(sub.step?.max_score || 10);
    setReviewComment(sub.comment || "");
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewSubmission) return;

    setIsSubmittingReview(true);
    try {
      await api.put(`/submissions/${reviewSubmission.id}/review`, {
        status: reviewStatus,
        score: Number(reviewScore),
        comment: reviewComment.trim(),
      });

      toast.success("บันทึกผลการตรวจงานเรียบร้อยแล้ว");
      setReviewSubmission(null);
      fetchRoomSpecificData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "บันทึกผลตรวจไม่สำเร็จ";
      toast.error(errorMsg);
    } finally {
      setIsSubmittingReview(false);
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

  // Open rubric modal and pre-fill existing evaluation
  const handleOpenRubric = (booking: PresentationBooking) => {
    setRubricBooking(booking)
    setRubricTab("evaluate")

    // Find if the logged-in teacher has already evaluated this group
    const myScore = booking.scores?.find((s) => s.scorer_id === user?.id)
    const initialScores: Record<string, number> = {}
    let initialComments = ""

    if (myScore) {
      initialComments = myScore.comments || ""
      if (myScore.criteria_data) {
        try {
          const parsed = typeof myScore.criteria_data === "string"
            ? JSON.parse(myScore.criteria_data)
            : myScore.criteria_data
          if (parsed && typeof parsed === "object") {
            Object.assign(initialScores, parsed)
          }
        } catch {
          // ignore parsing error
        }
      }
    }

    // Default missing criteria to max_score
    criteriaList.forEach((c) => {
      if (initialScores[c.id] === undefined) {
        initialScores[c.id] = c.max_score
      }
    })

    setRubricScores(initialScores)
    setRubricComments(initialComments)
  }

  const handleScoreChange = (criteriaId: string, value: number) => {
    setRubricScores((prev) => ({
      ...prev,
      [criteriaId]: value,
    }))
  }

  const handleSubmitRubric = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rubricBooking) return

    let total = 0
    Object.values(rubricScores).forEach((v) => {
      total += Number(v)
    })

    setIsSubmittingRubric(true)
    try {
      await api.post("/presentation/scores", {
        booking_id: rubricBooking.id,
        criteria_data: rubricScores,
        total_score: total,
        comments: rubricComments.trim(),
      })

      toast.success("บันทึกคะแนนการประเมิน Rubric สำเร็จ")
      setRubricBooking(null)
      fetchTeacherData()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "บันทึกคะแนนไม่สำเร็จ"
      toast.error(errorMsg)
    } finally {
      setIsSubmittingRubric(false)
    }
  }

  const handleExportGradeSheet = () => {
    const yr = selectedYear || "2568"
    const url = api.getExportUrl(`/teacher/gradesheet/export?academic_year=${encodeURIComponent(yr)}&room=${encodeURIComponent(selectedRoom)}`)
    window.open(url, "_blank")
  }

  const handleExportScores = () => {
    const yr = selectedYear || "2568"
    const url = api.getExportUrl(`/presentation/scores/export?academic_year=${encodeURIComponent(yr)}`)
    window.open(url, "_blank")
  }

  return (
    <DashboardLayout allowedRoles={["TEACHER", "ADMIN"]} defaultTab="queue">
      {({ activeTab }) => {
        if (isLoading) {
          return (
            <div className="flex flex-col items-center justify-center p-12 space-y-3">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500">กำลังโหลดข้อมูลครูผู้สอน...</p>
            </div>
          )
        }

        return (
          <>
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header with Year and Room Selectors */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                    <School className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      ระบบอาจารย์และกรรมการประเมิน
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      อาจารย์ผู้สอน: {user?.full_name}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                  {/* Academic Year Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <CalendarRange className="w-3.5 h-3.5 text-brand-500" /> ปีการศึกษา:
                    </span>
                    <select
                      aria-label="เลือกปีการศึกษา"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-900 outline-none cursor-pointer"
                    >
                      {activeYears.map((y) => (
                        <option key={y.id} value={y.year}>
                          ปีการศึกษา {y.year} (เทอม {y.term}) {y.is_current ? "👑 ปัจจุบัน" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Room Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5" /> ห้อง:
                    </span>
                    <button
                      onClick={() => setSelectedRoom("")}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        selectedRoom === ""
                          ? "bg-brand-500 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      ทั้งหมด
                    </button>
                    {assignedRooms.map((room) => (
                      <button
                        key={room}
                        onClick={() => setSelectedRoom(room)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          selectedRoom === room
                            ? "bg-brand-500 text-white shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                        }`}
                      >
                        ม.{room}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ==================== TAB 1: QUEUE ==================== */}
              {activeTab === "queue" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <ListOrdered className="w-4 h-4 text-brand-500" />
                        คิวงานรอตรวจ (Pending Submissions Queue)
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        รายการงานที่นักเรียนส่งเข้ามาและรอการอนุมัติ/ให้คะแนน
                      </p>
                    </div>
                    <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-bold px-3 py-1 rounded-xl">
                      รอตรวจ {queue.length} รายการ
                    </span>
                  </div>

                  {queue.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-500 mx-auto flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white">ไม่มีงานค้างตรวจ</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        งานทั้งหมดในห้องที่คุณเลือกได้รับการตรวจเรียบร้อยแล้ว
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {queue.map((sub) => (
                        <div
                          key={sub.id}
                          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm hover:border-brand-500/40 transition-all space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 text-xs font-bold px-2.5 py-0.5 rounded-md">
                                  ห้อง ม.{sub.group?.room || "-"}
                                </span>
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                                  {sub.group?.project_name_th}
                                </h4>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                ขั้นตอน: <span className="font-semibold text-slate-800 dark:text-slate-200">{sub.step?.step_name}</span> · ส่งโดย {sub.submitter?.full_name} ({formatDate(sub.submitted_at)})
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold px-2.5 py-1 rounded-xl flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> รอบที่ {sub.revision_number}
                              </span>
                              <button
                                onClick={() => handleOpenReview(sub)}
                                className="bg-brand-500 hover:bg-brand-600 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                ตรวจงาน / ให้คะแนน <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* File / Link View */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">ผลงานที่แนบมา:</span>
                              <a
                                href={sub.file_path.startsWith("http") ? sub.file_path : api.getDownloadUrl(sub.file_path)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-brand-600 dark:text-brand-400 hover:underline font-semibold flex items-center gap-1"
                              >
                                {sub.submission_type === "link" ? <LinkIcon className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                                {sub.submission_type === "link" ? "เปิดลิงก์ผลงานภายนอก" : "ดาวน์โหลดไฟล์ผลงาน"}
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ==================== TAB 2: MATRIX ==================== */}
              {activeTab === "matrix" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <TableProperties className="w-4 h-4 text-brand-500" />
                        ตารางสรุปความก้าวหน้ารายห้อง (Progress Matrix)
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        แสดงสถานะและคะแนนของแต่ละกลุ่มโครงงานในทุกขั้นตอน
                      </p>
                    </div>

                    <button
                      onClick={handleExportGradeSheet}
                      className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> ส่งออกใบคะแนน CSV
                    </button>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                          <tr>
                            <th className="p-4 min-w-[200px]">กลุ่มโครงงาน / สมาชิก</th>
                            <th className="p-4 min-w-[80px]">ห้อง</th>
                            {steps.map((st) => (
                              <th key={st.id} className="p-4 text-center min-w-[110px]">
                                <div>{st.step_name}</div>
                                <span className="text-[10px] font-normal text-slate-400 font-en">
                                  (เต็ม {st.max_score})
                                </span>
                              </th>
                            ))}
                            <th className="p-4 text-center min-w-[100px] text-brand-600 dark:text-brand-400">
                              รวมคะแนน
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {matrix.length === 0 ? (
                            <tr>
                              <td colSpan={steps.length + 3} className="p-8 text-center text-slate-400">
                                ไม่พบข้อมูลกลุ่มโครงงานในห้องนี้
                              </td>
                            </tr>
                          ) : (
                            matrix.map((row) => (
                              <tr key={row.group_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/50 transition-colors">
                                <td className="p-4">
                                  <div className="font-bold text-slate-900 dark:text-white">
                                    {row.project_name_th}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-en">
                                    {row.project_name_en}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-1">
                                    {row.members.map((m) => m.full_name).join(", ")}
                                  </div>
                                </td>
                                <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                                  ม.{row.room || "-"}
                                </td>
                                {steps.map((st) => {
                                  const cell = row.steps[st.id];
                                  if (!cell || cell.status === "NOT_SUBMITTED") {
                                    return (
                                      <td key={st.id} className="p-4 text-center text-slate-300 dark:text-slate-600">
                                        -
                                      </td>
                                    );
                                  }
                                  if (cell.status === "PENDING") {
                                    return (
                                      <td key={st.id} className="p-4 text-center">
                                        <span className="inline-block bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                          รอตรวจ
                                        </span>
                                      </td>
                                    );
                                  }
                                  if (cell.status === "REJECTED") {
                                    return (
                                      <td key={st.id} className="p-4 text-center">
                                        <span className="inline-block bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                          แก้ไข
                                        </span>
                                      </td>
                                    );
                                  }
                                  return (
                                    <td key={st.id} className="p-4 text-center">
                                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                        {cell.score !== null ? cell.score : "✓"}
                                      </span>
                                    </td>
                                  );
                                })}
                                <td className="p-4 text-center font-bold text-sm text-brand-600 dark:text-brand-400">
                                  {formatScore(row.total_score)}
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

              {/* ==================== TAB 3: DEFENSE RUBRIC ==================== */}
              {activeTab === "defense" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Award className="w-4 h-4 text-brand-500" />
                        คณะกรรมการประเมิน Rubric การนำเสนอโครงงาน
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        ประเมินคะแนนรายกลุ่มตามเกณฑ์ Rubric ในรอบนำเสนอ พร้อมแสดงสถานะการประเมินของคณะกรรมการ
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* View Mode Toggle */}
                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                          onClick={() => setDefenseViewMode("grid")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                            defenseViewMode === "grid"
                              ? "bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs"
                              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          <LayoutGrid className="w-3.5 h-3.5" /> ตารางสัปดาห์
                        </button>
                        <button
                          onClick={() => setDefenseViewMode("list")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                            defenseViewMode === "list"
                              ? "bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs"
                              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          <List className="w-3.5 h-3.5" /> รายการการ์ด
                        </button>
                      </div>

                      <button
                        onClick={handleExportScores}
                        className="bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <Download className="w-4 h-4" /> Export คะแนน Rubric CSV
                      </button>
                    </div>
                  </div>

                  {/* 1. WEEKLY TIMETABLE GRID VIEW */}
                  {defenseViewMode === "grid" && (
                    <div className="space-y-4">
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

                      {/* Grid Table */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-center border-collapse min-w-[760px]">
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
                                      <td key={dayIdx} className="p-2 border-r last:border-r-0 border-slate-200/40 dark:border-slate-800/60 align-top text-left">
                                        <div className="space-y-2">
                                          {cellSlots.map((slot) => (
                                            <div key={slot.id} className="rounded-2xl p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2 shadow-xs">
                                              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                                                <span className="flex items-center gap-1">
                                                  <MapPin className="w-3 h-3 text-brand-500 shrink-0" />
                                                  <span className="truncate">{slot.location}</span>
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 font-en">
                                                  {slot.bookings?.length || 0}/{slot.max_groups}
                                                </span>
                                              </div>

                                              {/* Bookings inside slot */}
                                              {slot.bookings && slot.bookings.length > 0 ? (
                                                <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                                                  {slot.bookings.map((b) => {
                                                    const myScore = b.scores?.find((s) => s.scorer_id === user?.id)
                                                    const scoreList = b.scores || []
                                                    const scoreCount = scoreList.length
                                                    const avgScore = scoreCount > 0 
                                                      ? (scoreList.reduce((acc, s) => acc + s.total_score, 0) / scoreCount).toFixed(2)
                                                      : null

                                                    return (
                                                      <div key={b.id} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 space-y-1.5">
                                                        <div className="flex items-start justify-between gap-1">
                                                          <div className="font-bold text-slate-900 dark:text-white text-[11px] leading-tight line-clamp-2">
                                                            {b.group?.project_name_th}
                                                          </div>
                                                          <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded shrink-0">
                                                            ม.{b.group?.room || "-"}
                                                          </span>
                                                        </div>

                                                        {(b.group?.advisor || b.group?.advisor_name) && (
                                                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                                            ที่ปรึกษา: {b.group.advisor?.full_name || b.group.advisor_name}
                                                          </div>
                                                        )}

                                                        <div className="flex items-center justify-between gap-1 pt-1 text-[10px]">
                                                          <span className="text-slate-400">
                                                            👥 ประเมิน: <span className="font-bold text-slate-700 dark:text-slate-300">{scoreCount} ท่าน</span>
                                                            {avgScore && ` (${avgScore})`}
                                                          </span>
                                                        </div>

                                                        {/* Action Button */}
                                                        {myScore ? (
                                                          <button
                                                            onClick={() => handleOpenRubric(b)}
                                                            className="w-full py-1 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                                                          >
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                            คุณประเมินแล้ว ({myScore.total_score} คะแนน)
                                                          </button>
                                                        ) : (
                                                          <button
                                                            onClick={() => handleOpenRubric(b)}
                                                            className="w-full py-1.5 px-2 rounded-lg bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white text-[10px] font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                                                          >
                                                            <Award className="w-3 h-3" />
                                                            ให้คะแนน Rubric
                                                          </button>
                                                        )}
                                                      </div>
                                                    )
                                                  })}
                                                </div>
                                              ) : (
                                                <div className="text-[10px] text-slate-400 text-center py-1">
                                                  ยังไม่มีกลุ่มจอง
                                                </div>
                                              )}
                                            </div>
                                          ))}
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
                                      <td key={dayIdx} className="p-2 border-r last:border-r-0 border-slate-200/40 dark:border-slate-800/60 align-top text-left">
                                        <div className="space-y-2">
                                          {cellSlots.map((slot) => (
                                            <div key={slot.id} className="rounded-2xl p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2 shadow-xs">
                                              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                                                <span className="flex items-center gap-1">
                                                  <MapPin className="w-3 h-3 text-brand-500 shrink-0" />
                                                  <span className="truncate">{slot.location}</span>
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 font-en">
                                                  {slot.bookings?.length || 0}/{slot.max_groups}
                                                </span>
                                              </div>

                                              {/* Bookings inside slot */}
                                              {slot.bookings && slot.bookings.length > 0 ? (
                                                <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                                                  {slot.bookings.map((b) => {
                                                    const myScore = b.scores?.find((s) => s.scorer_id === user?.id)
                                                    const scoreList = b.scores || []
                                                    const scoreCount = scoreList.length
                                                    const avgScore = scoreCount > 0 
                                                      ? (scoreList.reduce((acc, s) => acc + s.total_score, 0) / scoreCount).toFixed(2)
                                                      : null

                                                    return (
                                                      <div key={b.id} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 space-y-1.5">
                                                        <div className="flex items-start justify-between gap-1">
                                                          <div className="font-bold text-slate-900 dark:text-white text-[11px] leading-tight line-clamp-2">
                                                            {b.group?.project_name_th}
                                                          </div>
                                                          <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded shrink-0">
                                                            ม.{b.group?.room || "-"}
                                                          </span>
                                                        </div>

                                                        {(b.group?.advisor || b.group?.advisor_name) && (
                                                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                                            ที่ปรึกษา: {b.group.advisor?.full_name || b.group.advisor_name}
                                                          </div>
                                                        )}

                                                        <div className="flex items-center justify-between gap-1 pt-1 text-[10px]">
                                                          <span className="text-slate-400">
                                                            👥 ประเมิน: <span className="font-bold text-slate-700 dark:text-slate-300">{scoreCount} ท่าน</span>
                                                            {avgScore && ` (${avgScore})`}
                                                          </span>
                                                        </div>

                                                        {/* Action Button */}
                                                        {myScore ? (
                                                          <button
                                                            onClick={() => handleOpenRubric(b)}
                                                            className="w-full py-1 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                                                          >
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                            คุณประเมินแล้ว ({myScore.total_score} คะแนน)
                                                          </button>
                                                        ) : (
                                                          <button
                                                            onClick={() => handleOpenRubric(b)}
                                                            className="w-full py-1.5 px-2 rounded-lg bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white text-[10px] font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                                                          >
                                                            <Award className="w-3 h-3" />
                                                            ให้คะแนน Rubric
                                                          </button>
                                                        )}
                                                      </div>
                                                    )
                                                  })}
                                                </div>
                                              ) : (
                                                <div className="text-[10px] text-slate-400 text-center py-1">
                                                  ยังไม่มีกลุ่มจอง
                                                </div>
                                              )}
                                            </div>
                                          ))}
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
                  )}

                  {/* 2. LIST CARDS VIEW */}
                  {defenseViewMode === "list" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {slots.length === 0 ? (
                        <div className="col-span-2 text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 text-xs">
                          ไม่พบรอบนำเสนอโครงงานในปีการศึกษานี้
                        </div>
                      ) : (
                        slots.map((slot) => (
                          <div
                            key={slot.id}
                            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-sm"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                                  <MapPin className="w-4 h-4 text-brand-500" />
                                  {slot.location}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-en">
                                  {formatDate(slot.start_time)} - {formatDate(slot.end_time)}
                                </p>
                              </div>
                              <span className="text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-2.5 py-1 rounded-lg">
                                จองแล้ว {slot.bookings?.length || 0}/{slot.max_groups} กลุ่ม
                              </span>
                            </div>

                            {/* Bookings inside slot */}
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                              {slot.bookings && slot.bookings.length > 0 ? (
                                slot.bookings.map((b) => {
                                  const myScore = b.scores?.find((s) => s.scorer_id === user?.id)
                                  const scoreList = b.scores || []
                                  const scoreCount = scoreList.length
                                  const avgScore = scoreCount > 0 
                                    ? (scoreList.reduce((acc, s) => acc + s.total_score, 0) / scoreCount).toFixed(2)
                                    : null

                                  return (
                                    <div key={b.id} className="py-3.5 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                      <div className="space-y-1">
                                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                          <span>{b.group?.project_name_th}</span>
                                          <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                                            ม.{b.group?.room || "-"}
                                          </span>
                                        </div>
                                        {b.group?.project_name_en && (
                                          <div className="text-[11px] text-slate-400 font-en italic">
                                            {b.group.project_name_en}
                                          </div>
                                        )}
                                        {(b.group?.advisor || b.group?.advisor_name) && (
                                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                            ครูที่ปรึกษา: {b.group.advisor?.full_name || b.group.advisor_name}
                                          </div>
                                        )}
                                        <div className="text-[10px] text-slate-400">
                                          👥 คณะกรรมการประเมินแล้ว: <span className="font-bold text-slate-700 dark:text-slate-300">{scoreCount} ท่าน</span>
                                          {avgScore && ` (คะแนนเฉลี่ย: ${avgScore} คะแนน)`}
                                        </div>
                                      </div>

                                      {myScore ? (
                                        <button
                                          onClick={() => handleOpenRubric(b)}
                                          className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                                        >
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                          คุณประเมินแล้ว ({myScore.total_score} คะแนน)
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleOpenRubric(b)}
                                          className="bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                                        >
                                          <Award className="w-3.5 h-3.5" />
                                          ให้คะแนน Rubric
                                        </button>
                                      )}
                                    </div>
                                  )
                                })
                              ) : (
                                <div className="py-4 text-center text-xs text-slate-400">
                                  ยังไม่มีกลุ่มจองในรอบเวลานี้
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ==================== TAB 4: EXPORT ==================== */}
              {activeTab === "export" && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      ส่งออกใบคะแนนและรายงานสรุป (Data Export Center)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      ดาวน์โหลดรายงานในรูปแบบไฟล์ CSV พร้อมรองรับภาษาไทยใน Microsoft Excel อย่างสมบูรณ์
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          ใบคะแนนขั้นตอนการส่งงาน (Milestone Gradesheet)
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        คะแนนทุกขั้นตอน แยกตามกลุ่มและห้องเรียนที่เลือก
                      </p>
                      <button
                        onClick={handleExportGradeSheet}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        ดาวน์โหลด CSV ใบคะแนน
                      </button>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-brand-600" />
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          คะแนนการนำเสนอ Rubric (Presentation Defense)
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        สรุปคะแนนประเมินการนำเสนอรายกรรมการและคะแนนเฉลี่ย
                      </p>
                      <button
                        onClick={handleExportScores}
                        className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        ดาวน์โหลด CSV ผลประเมิน Rubric
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal: Review & Grade Submission */}
            <Modal
              isOpen={!!reviewSubmission}
              onClose={() => setReviewSubmission(null)}
              title={reviewSubmission ? `ตรวจงาน: ${reviewSubmission.group?.project_name_th}` : undefined}
              description={reviewSubmission ? `ขั้นตอน: ${reviewSubmission.step?.step_name} (คะแนนเต็ม ${reviewSubmission.step?.max_score})` : undefined}
              maxWidth="lg"
            >
              {reviewSubmission && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">ผลงานที่นักเรียนส่ง:</span>
                      <a
                        href={reviewSubmission.file_path.startsWith("http") ? reviewSubmission.file_path : api.getDownloadUrl(reviewSubmission.file_path)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-600 dark:text-brand-400 font-bold hover:underline flex items-center gap-1"
                      >
                        {reviewSubmission.submission_type === "link" ? <ExternalLink className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                        {reviewSubmission.submission_type === "link" ? "เปิดลิงก์ผลงาน" : "ดาวน์โหลดไฟล์"}
                      </a>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        ผลการประเมิน
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setReviewStatus("APPROVED")}
                          className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            reviewStatus === "APPROVED"
                              ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" /> ผ่าน (Approved)
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewStatus("REJECTED")}
                          className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            reviewStatus === "REJECTED"
                              ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          <XCircle className="w-4 h-4" /> ส่งกลับแก้ไข (Rejected)
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        คะแนนที่ให้ (เต็ม {reviewSubmission.step?.max_score} คะแนน)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={reviewSubmission.step?.max_score || 100}
                        required
                        value={reviewScore}
                        onChange={(e) => setReviewScore(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 font-en font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        ข้อเสนอแนะ / คอมเมนต์ (Feedback)
                      </label>
                      <textarea
                        rows={3}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="เขียนคำแนะนำสำหรับนักเรียน..."
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setReviewSubmission(null)}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingReview}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-md shadow-brand-500/20 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingReview ? "กำลังบันทึก..." : "บันทึกผลการตรวจ"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </Modal>

            {/* Modal: Rubric Evaluation */}
            <Modal
              isOpen={!!rubricBooking}
              onClose={() => setRubricBooking(null)}
              title={rubricBooking ? `แบบประเมิน Rubric: ${rubricBooking.group?.project_name_th}` : undefined}
              description="ประเมินคะแนนการนำเสนอโครงงานตามเกณฑ์ Rubric Score"
              maxWidth="2xl"
            >
              {rubricBooking && (
                <div className="space-y-4">
                  {/* Group Info Card */}
                  <div className="p-4 rounded-2xl bg-brand-50/60 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-900/50 space-y-2 text-xs">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {rubricBooking.group?.project_name_th}
                      </div>
                      <span className="text-[11px] font-bold text-brand-700 dark:text-brand-300 bg-brand-100 dark:bg-brand-900/60 px-2 py-0.5 rounded-md self-start sm:self-auto">
                        ห้อง ม.{rubricBooking.group?.room || "-"}
                      </span>
                    </div>

                    {rubricBooking.group?.project_name_en && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-en italic">
                        {rubricBooking.group.project_name_en}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-brand-200/40 dark:border-brand-900/40 text-[11px] text-slate-600 dark:text-slate-300">
                      {(rubricBooking.group?.advisor || rubricBooking.group?.advisor_name) && (
                        <div>
                          ครูที่ปรึกษา: <span className="font-semibold text-slate-800 dark:text-slate-200">{rubricBooking.group.advisor?.full_name || rubricBooking.group.advisor_name}</span>
                        </div>
                      )}
                      {rubricBooking.slot && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-brand-500" />
                          <span>{rubricBooking.slot.location} ({formatDate(rubricBooking.slot.start_time)})</span>
                        </div>
                      )}
                    </div>

                    {rubricBooking.group?.members && rubricBooking.group.members.length > 0 && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                        สมาชิก: {rubricBooking.group.members.map((m) => m.user?.full_name || m.user_id).join(", ")}
                      </div>
                    )}
                  </div>

                  {/* Subtabs Switcher */}
                  <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setRubricTab("evaluate")}
                      className={`pb-2 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                        rubricTab === "evaluate"
                          ? "border-brand-500 text-brand-600 dark:text-brand-400 font-bold"
                          : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" /> แบบประเมินของคุณ
                    </button>
                    <button
                      type="button"
                      onClick={() => setRubricTab("history")}
                      className={`pb-2 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                        rubricTab === "history"
                          ? "border-brand-500 text-brand-600 dark:text-brand-400 font-bold"
                          : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" /> คะแนนของกรรมการทั้งหมด ({rubricBooking.scores?.length || 0} ท่าน)
                    </button>
                  </div>

                  {/* Tab 1: Evaluate Form */}
                  {rubricTab === "evaluate" && (
                    <form onSubmit={handleSubmitRubric} className="space-y-4">
                      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                        {criteriaList.map((crit, idx) => {
                          const currentScore = rubricScores[crit.id] ?? crit.max_score
                          return (
                            <div
                              key={crit.id}
                              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="space-y-0.5">
                                  <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                                    {idx + 1}. {crit.label}
                                  </h5>
                                  {crit.description && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                      {crit.description}
                                    </p>
                                  )}
                                </div>
                                <span className="text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-2 py-0.5 rounded-lg shrink-0 font-en">
                                  เต็ม {crit.max_score}
                                </span>
                              </div>

                              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                                {/* Range Slider */}
                                <div className="flex-1 w-full flex items-center gap-2">
                                  <input
                                    type="range"
                                    min="0"
                                    max={crit.max_score}
                                    step="0.5"
                                    value={currentScore}
                                    onChange={(e) => handleScoreChange(crit.id, Number(e.target.value))}
                                    className="w-full accent-brand-500 cursor-pointer"
                                  />
                                </div>

                                {/* Direct Number Input */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <input
                                    type="number"
                                    min="0"
                                    max={crit.max_score}
                                    step="0.5"
                                    value={currentScore}
                                    onChange={(e) => {
                                      const val = Math.min(crit.max_score, Math.max(0, Number(e.target.value)))
                                      handleScoreChange(crit.id, val)
                                    }}
                                    className="w-16 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center font-bold text-xs text-brand-600 dark:text-brand-400 font-en outline-none focus:border-brand-500"
                                  />
                                  <span className="text-xs text-slate-400">/ {crit.max_score}</span>
                                </div>

                                {/* Quick Presets */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleScoreChange(crit.id, 0)}
                                    className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                                  >
                                    0
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleScoreChange(crit.id, crit.max_score / 2)}
                                    className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                                  >
                                    50%
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleScoreChange(crit.id, crit.max_score)}
                                    className="px-2 py-1 rounded-md bg-brand-50 hover:bg-brand-100 dark:bg-brand-950 dark:hover:bg-brand-900 text-[10px] font-semibold text-brand-700 dark:text-brand-300 transition-colors cursor-pointer"
                                  >
                                    เต็ม
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Total Score Real-time Preview */}
                      {(() => {
                        let total = 0
                        let maxTotal = 0
                        criteriaList.forEach((c) => {
                          total += Number(rubricScores[c.id] ?? c.max_score)
                          maxTotal += c.max_score
                        })
                        const percentage = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(1) : "0"

                        return (
                          <div className="p-4 rounded-2xl bg-brand-50/70 dark:bg-brand-950/40 border border-brand-200/80 dark:border-brand-900/60 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            <div>
                              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                คะแนนรวมการประเมินของคุณ
                              </div>
                              <div className="text-[11px] text-slate-400">
                                คิดเป็น {percentage}% ของเกณฑ์ทั้งหมด
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-2xl font-bold text-brand-600 dark:text-brand-400 font-en">
                                {total.toFixed(1)}
                              </span>
                              <span className="text-xs font-bold text-slate-400 font-en"> / {maxTotal.toFixed(1)} คะแนน</span>
                            </div>
                          </div>
                        )
                      })()}

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          ข้อเสนอแนะและจุดที่ควรปรับปรุง (Feedback)
                        </label>
                        <textarea
                          rows={2}
                          value={rubricComments}
                          onChange={(e) => setRubricComments(e.target.value)}
                          placeholder="เขียนข้อคิดเห็นหรือคำแนะนำสำหรับกลุ่มนี้..."
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setRubricBooking(null)}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingRubric}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 cursor-pointer disabled:opacity-50 transition-all"
                        >
                          {isSubmittingRubric ? "กำลังบันทึก..." : "บันทึกคะแนนประเมิน"}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Tab 2: All Committee Scores History */}
                  {rubricTab === "history" && (
                    <div className="space-y-3">
                      {rubricBooking.scores && rubricBooking.scores.length > 0 ? (
                        <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                          {rubricBooking.scores.map((score, sIdx) => (
                            <div
                              key={score.id || sIdx}
                              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5"
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold flex items-center justify-center text-xs">
                                    {sIdx + 1}
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900 dark:text-white text-xs">
                                      {score.scorer?.full_name || "คณะกรรมการ"}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      {formatDate(score.scored_at)}
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="text-base font-bold text-brand-600 dark:text-brand-400 font-en">
                                    {score.total_score}
                                  </span>
                                  <span className="text-[10px] text-slate-400"> คะแนน</span>
                                </div>
                              </div>

                              {score.comments && (
                                <div className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                                  💭 {score.comments}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                          ยังไม่มีคณะกรรมการท่านใดส่งคะแนนประเมินสำหรับกลุ่มนี้
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Modal>
          </>
        )
      }}
    </DashboardLayout>
  )
}
