"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/lib/api";
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
} from "@/types";
import { formatDate, formatScore } from "@/lib/utils";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
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
  AlertCircle,
  HelpCircle,
  Pencil,
  CalendarRange,
  ChevronRight,
  ExternalLink
} from "lucide-react";

export default function TeacherPage() {
  const { user } = useAuthStore();
  const [assignedRooms, setAssignedRooms] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [activeYears, setActiveYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("2568");
  const [queue, setQueue] = useState<Submission[]>([]);
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [steps, setSteps] = useState<ProjectStep[]>([]);
  const [slots, setSlots] = useState<PresentationSlot[]>([]);
  const [criteriaList, setCriteriaList] = useState<PresentationCriteria[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Review Modal State
  const [reviewSubmission, setReviewSubmission] = useState<Submission | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [reviewScore, setReviewScore] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Rubric Score Modal State
  const [rubricBooking, setRubricBooking] = useState<PresentationBooking | null>(null);
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
  const [rubricComments, setRubricComments] = useState("");
  const [isSubmittingRubric, setIsSubmittingRubric] = useState(false);

  // 1. Fetch initial teacher rooms and steps
  const fetchTeacherData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Assigned rooms
      const roomsRes = await api.get<{ data?: string[]; rooms?: string[] }>("/teacher/assigned-rooms");
      const roomsList = roomsRes?.data || roomsRes?.rooms || [];
      if (Array.isArray(roomsList)) {
        setAssignedRooms(roomsList);
        if (roomsList.length > 0 && !selectedRoom) {
          setSelectedRoom(roomsList[0]);
        }
      }

      // Steps
      const stepsRes = await api.get<{ data?: ProjectStep[]; steps?: ProjectStep[] }>("/steps");
      const stepsList = stepsRes?.data || stepsRes?.steps || [];
      if (Array.isArray(stepsList)) {
        setSteps(stepsList.filter((s) => s.is_active));
      }

      // Criteria
      const critRes = await api.get<{ data?: PresentationCriteria[]; criteria?: PresentationCriteria[] }>("/presentation/criteria");
      const critList = critRes?.data || critRes?.criteria || [];
      if (Array.isArray(critList)) {
        setCriteriaList(critList.filter((c) => c.is_active));
      }

      // Slots
      const slotsRes = await api.get<{ data?: PresentationSlot[]; slots?: PresentationSlot[] }>("/presentation/slots");
      const slotsList = slotsRes?.data || slotsRes?.slots || [];
      if (Array.isArray(slotsList)) {
        setSlots(slotsList);
      }

      // Active Academic Years
      try {
        const yearsRes = await api.get<{ data?: AcademicYear[] }>("/academic-years/active");
        const yearsList = yearsRes?.data || [];
        if (Array.isArray(yearsList) && yearsList.length > 0) {
          setActiveYears(yearsList);
          const curr = yearsList.find((y) => y.is_current);
          if (curr) {
            setSelectedYear(curr.year);
          } else {
            setSelectedYear(yearsList[0].year);
          }
        }
      } catch {
        // Fallback default
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ";
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRoom]);

  useEffect(() => {
    fetchTeacherData();
  }, [fetchTeacherData]);

  // 2. Fetch Queue and Matrix whenever selectedRoom changes
  const fetchRoomSpecificData = useCallback(async () => {
    try {
      // Pending Queue
      const queueRes = await api.get<{ data?: Submission[]; queue?: Submission[] }>("/teacher/queue", {
        room: selectedRoom || undefined,
      });
      const queueList = queueRes?.data || queueRes?.queue || [];
      if (Array.isArray(queueList)) {
        setQueue(queueList);
      }

      // Progress Matrix
      const matrixRes = await api.get<{
        data?: { steps?: ProjectStep[]; groups?: ProjectGroup[] } | MatrixRow[];
        matrix?: MatrixRow[];
      }>("/teacher/progress-matrix", {
        room: selectedRoom || undefined,
      });

      let matrixList: MatrixRow[] = [];
      if (Array.isArray(matrixRes?.data)) {
        matrixList = matrixRes.data;
      } else if (matrixRes?.data && typeof matrixRes.data === "object" && "groups" in matrixRes.data && Array.isArray(matrixRes.data.groups)) {
        const rawGroups = matrixRes.data.groups;
        if (matrixRes.data.steps && Array.isArray(matrixRes.data.steps) && matrixRes.data.steps.length > 0) {
          setSteps(matrixRes.data.steps.filter((s) => s.is_active));
        }
        matrixList = rawGroups.map((g) => {
          const stepMap: Record<string, MatrixStepCell> = {};
          let totalScore = 0;
          g.submissions?.forEach((sub) => {
            stepMap[sub.step_id] = {
              step_id: sub.step_id,
              status: sub.status,
              score: sub.score !== undefined && sub.score !== null ? Number(sub.score) : null,
              submission_id: sub.id,
            };
            if (sub.score !== undefined && sub.score !== null) {
              totalScore += Number(sub.score);
            }
          });

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
          };
        });
      } else if (Array.isArray(matrixRes?.matrix)) {
        matrixList = matrixRes.matrix;
      }

      setMatrix(matrixList);
    } catch {
      // Ignore
    }
  }, [selectedRoom]);

  useEffect(() => {
    fetchRoomSpecificData();
  }, [fetchRoomSpecificData]);

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

  // Open rubric modal
  const handleOpenRubric = (booking: PresentationBooking) => {
    setRubricBooking(booking);
    const initialScores: Record<string, number> = {};
    criteriaList.forEach((c) => {
      initialScores[c.id] = c.max_score; // default to max score
    });
    setRubricScores(initialScores);
    setRubricComments("");
  };

  const handleScoreChange = (criteriaId: string, value: number) => {
    setRubricScores((prev) => ({
      ...prev,
      [criteriaId]: value,
    }));
  };

  const handleSubmitRubric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rubricBooking) return;

    let total = 0;
    Object.values(rubricScores).forEach((v) => {
      total += Number(v);
    });

    setIsSubmittingRubric(true);
    try {
      await api.post("/presentation/scores", {
        booking_id: rubricBooking.id,
        criteria_data: rubricScores,
        total_score: total,
        comments: rubricComments.trim(),
      });

      toast.success("บันทึกคะแนนการประเมิน Rubric สำเร็จ");
      setRubricBooking(null);
      fetchTeacherData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "บันทึกคะแนนไม่สำเร็จ";
      toast.error(errorMsg);
    } finally {
      setIsSubmittingRubric(false);
    }
  };

  const handleExportGradeSheet = () => {
    const url = api.getExportUrl(`/teacher/gradesheet/export?room=${encodeURIComponent(selectedRoom)}`);
    window.open(url, "_blank");
  };

  const handleExportScores = () => {
    const yr = selectedYear || "2568";
    const url = api.getExportUrl(`/presentation/scores/export?academic_year=${encodeURIComponent(yr)}`);
    window.open(url, "_blank");
  };

  return (
    <DashboardLayout allowedRoles={["TEACHER", "ADMIN"]} defaultTab="queue">
      {({ activeTab }) => {
        if (isLoading) {
          return (
            <div className="flex flex-col items-center justify-center p-12 space-y-3">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500">กำลังโหลดข้อมูลครูผู้สอน...</p>
            </div>
          );
        }

        return (
          <>
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header with Room Selector */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
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

                {/* Room Pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" /> เลือกห้องเรียน:
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
                        ประเมินคะแนนรายกลุ่มตามเกณฑ์ Rubric ในรอบนำเสนอ
                      </p>
                    </div>

                    <button
                      onClick={handleExportScores}
                      className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> Export รายงานคะแนน Rubric CSV
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {slots.map((slot) => (
                      <div
                        key={slot.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-sm"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                              สถานที่: {slot.location}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              เวลา: {formatDate(slot.start_time)} - {formatDate(slot.end_time)}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-2.5 py-1 rounded-lg">
                            จองแล้ว {slot.bookings?.length || 0} กลุ่ม
                          </span>
                        </div>

                        {/* Bookings inside slot */}
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {slot.bookings?.map((b) => (
                            <div key={b.id} className="py-3 flex items-center justify-between">
                              <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-white">
                                  {b.group?.project_name_th}
                                </div>
                                <div className="text-[11px] text-slate-400 font-en">
                                  ห้อง ม.{b.group?.room || "-"}
                                </div>
                              </div>

                              <button
                                onClick={() => handleOpenRubric(b)}
                                className="bg-brand-50 hover:bg-brand-100 dark:bg-brand-950 dark:hover:bg-brand-900 text-brand-700 dark:text-brand-300 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                              >
                                ✍️ ให้คะแนน Rubric
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
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
              title={rubricBooking ? `กลุ่ม: ${rubricBooking.group?.project_name_th}` : undefined}
              description="แบบประเมิน Rubric การนำเสนอโครงงาน"
              maxWidth="xl"
            >
              {rubricBooking && (
                <form onSubmit={handleSubmitRubric} className="space-y-4">
                  <div className="space-y-3">
                    {criteriaList.map((crit, idx) => (
                      <div
                        key={crit.id}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                              {idx + 1}. {crit.label}
                            </h5>
                            {crit.description && (
                              <p className="text-[11px] text-slate-400 mt-0.5">{crit.description}</p>
                            )}
                          </div>
                          <span className="text-xs font-bold text-brand-600 font-en">
                            เต็ม {crit.max_score}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max={crit.max_score}
                            step="0.5"
                            value={rubricScores[crit.id] || 0}
                            onChange={(e) => handleScoreChange(crit.id, Number(e.target.value))}
                            className="flex-1 accent-brand-500 cursor-pointer"
                          />
                          <span className="w-12 text-right font-bold text-xs text-brand-600 font-en">
                            {rubricScores[crit.id] || 0}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      ข้อเสนอแนะจากกรรมการ
                    </label>
                    <textarea
                      rows={2}
                      value={rubricComments}
                      onChange={(e) => setRubricComments(e.target.value)}
                      placeholder="เขียนข้อคิดเห็นหรือคำแนะนำเพิ่มเติม..."
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
                      className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-md shadow-brand-500/20 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingRubric ? "กำลังบันทึก..." : "ส่งคะแนนประเมิน"}
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
