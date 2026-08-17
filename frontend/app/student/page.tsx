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
  ChevronRight,
  Pencil,
  Crown,
  LogOut,
  UserMinus,
  School,
  Edit,
  CalendarRange
} from "lucide-react";

export default function StudentPage() {
  const { user } = useAuthStore();
  const [group, setGroup] = useState<ProjectGroup | null>(null);
  const [steps, setSteps] = useState<ProjectStep[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [slots, setSlots] = useState<PresentationSlot[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [activeYears, setActiveYears] = useState<AcademicYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showSubmitWork, setShowSubmitWork] = useState<ProjectStep | null>(null);
  
  // Create Group Form
  const [projectNameTh, setProjectNameTh] = useState("");
  const [projectNameEn, setProjectNameEn] = useState("");
  const [advisorId, setAdvisorId] = useState("");
  const [advisorCustom, setAdvisorCustom] = useState("");
  const [academicYear, setAcademicYear] = useState("2568");
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);

  // Edit Group Form
  const [editProjectNameTh, setEditProjectNameTh] = useState("");
  const [editProjectNameEn, setEditProjectNameEn] = useState("");
  const [editAdvisorId, setEditAdvisorId] = useState("");
  const [editAdvisorCustom, setEditAdvisorCustom] = useState("");
  const [isSubmittingEditGroup, setIsSubmittingEditGroup] = useState(false);

  // Search & Add Students
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [availableClassmates, setAvailableClassmates] = useState<User[]>([]);
  const [selectedClassmateId, setSelectedClassmateId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingClassmates, setIsLoadingClassmates] = useState(false);

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
      try {
        const groupRes = await api.get<{ data?: ProjectGroup; group?: ProjectGroup }>("/groups/my-group");
        const myGroup = groupRes?.data || groupRes?.group || null;
        if (myGroup) {
          setGroup(myGroup);
          // Fetch submissions for this group
          const subsRes = await api.get<{ data?: Submission[]; submissions?: Submission[] }>(`/submissions/group/${myGroup.id}`);
          const subsList = subsRes?.data || subsRes?.submissions || [];
          setSubmissions(subsList);
        } else {
          setGroup(null);
        }
      } catch {
        setGroup(null);
      }

      // 2. Get steps
      const stepsRes = await api.get<{ data?: ProjectStep[]; steps?: ProjectStep[] }>("/steps");
      const stepsList = stepsRes?.data || stepsRes?.steps || [];
      if (Array.isArray(stepsList)) {
        setSteps(stepsList.filter((s) => s.is_active));
      }

      // 3. Get presentation slots
      const slotsRes = await api.get<{ data?: PresentationSlot[]; slots?: PresentationSlot[] }>("/presentation/slots");
      const slotsList = slotsRes?.data || slotsRes?.slots || [];
      if (Array.isArray(slotsList)) {
        setSlots(slotsList);
      }

      // 4. Get teachers list
      try {
        const teachRes = await api.get<{ data?: User[] }>("/groups/teachers");
        if (Array.isArray(teachRes?.data)) {
          setTeachers(teachRes.data);
        }
      } catch {
        // Fallback
      }

      // 5. Get active academic years
      try {
        const yearsRes = await api.get<{ data?: AcademicYear[] }>("/academic-years/active");
        const yearsList = yearsRes?.data || [];
        if (Array.isArray(yearsList) && yearsList.length > 0) {
          setActiveYears(yearsList);
          const curr = yearsList.find((y) => y.is_current);
          if (curr) {
            setAcademicYear(curr.year);
          } else {
            setAcademicYear(yearsList[0].year);
          }
        }
      } catch {
        // Fallback default
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

  // Open Add Member Modal
  const handleOpenAddMember = async () => {
    setShowAddMember(true);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedClassmateId("");
    setIsLoadingClassmates(true);
    try {
      const roomParam = group?.room || user?.room || "";
      const res = await api.get<{ data: User[] }>(`/groups/search-students?room=${encodeURIComponent(roomParam)}`);
      setAvailableClassmates(res.data || []);
    } catch {
      setAvailableClassmates([]);
    } finally {
      setIsLoadingClassmates(false);
    }
  };

  const handleDissolveGroup = async () => {
    if (!group) return;
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการยุบกลุ่มโครงงานนี้? ข้อมูลการส่งงานและไฟล์ทั้งหมดจะถูกลบ")) {
      return;
    }

    try {
      await api.delete(`/groups/${group.id}`);
      toast.success("ยุบกลุ่มโครงงานสำเร็จ");
      fetchStudentData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "ยุบกลุ่มไม่สำเร็จ";
      toast.error(errorMsg);
    }
  };

  const handleSearchStudents = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await api.get<{ data?: User[]; users?: User[] }>(`/groups/search-students?query=${encodeURIComponent(query)}`);
      const usersList = res?.data || res?.users || [];
      if (Array.isArray(usersList)) {
        setSearchResults(usersList);
      } else {
        setSearchResults([]);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (studentId: string) => {
    if (!group) return;
    try {
      await api.post(`/groups/${group.id}/members`, { user_id: studentId });
      toast.success("เพิ่มสมาชิกเข้ากลุ่มเรียบร้อย");
      setShowAddMember(false);
      setSearchQuery("");
      setSearchResults([]);
      fetchStudentData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "เพิ่มสมาชิกไม่สำเร็จ";
      toast.error(errorMsg);
    }
  };

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
      toast.error("กรุณาสร้างกลุ่มก่อนจองรอบนำเสนอ");
      return;
    }

    try {
      await api.post("/presentation/bookings", {
        slot_id: slotId,
        group_id: group.id,
      });
      toast.success("จองรอบนำเสนอโครงงานสำเร็จ");
      fetchStudentData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "จองรอบนำเสนอไม่สำเร็จ";
      toast.error(errorMsg);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("คุณต้องการยกเลิกการจองรอบนำเสนอนี้ใช่หรือไม่?")) return;

    try {
      await api.delete(`/presentation/bookings/${bookingId}`);
      toast.success("ยกเลิกการจองสำเร็จ");
      fetchStudentData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "ยกเลิกไม่สำเร็จ";
      toast.error(errorMsg);
    }
  };

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
                              สมาชิกในกลุ่ม ({group.members?.length || 0}/3 คน)
                            </h3>
                            <p className="text-[11px] text-slate-400">
                              สูงสุด 3 คนต่อกลุ่ม
                            </p>
                          </div>
                        </div>

                        {(group.members?.length || 0) < 3 && (
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
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">จองรอบนำเสนอโครงงาน (Defense Booking)</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    เลือกรอบนำเสนอและห้องสอบที่สะดวกสำหรับกลุ่มของคุณ
                  </p>
                </div>

                {group?.booking ? (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-3xl p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                            กลุ่มของคุณทำการจองรอบเรียบร้อยแล้ว
                          </span>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            สถานที่: {group.booking.slot?.location || "ห้องสอบโครงงาน"}
                          </h3>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCancelBooking(group.booking!.id)}
                        className="bg-red-50 hover:bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        ยกเลิกการจองรอบนี้
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-emerald-200/60 dark:border-emerald-900/60">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        <span>เริ่ม: {formatDate(group.booking.slot?.start_time)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        <span>สิ้นสุด: {formatDate(group.booking.slot?.end_time)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      รอบนำเสนอที่เปิดให้จอง
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {slots.map((slot) => {
                        const isFull = (slot.bookings?.length || 0) >= slot.max_groups;
                        return (
                          <div
                            key={slot.id}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-brand-500" />
                                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                    {slot.location}
                                  </h4>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                  {formatDate(slot.start_time)} - {formatDate(slot.end_time)}
                                </p>
                              </div>
                              <span className="text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-100 dark:bg-brand-950 px-2.5 py-1 rounded-lg">
                                โควตา: {slot.bookings?.length || 0}/{slot.max_groups}
                              </span>
                            </div>

                            <button
                              disabled={isFull || !group}
                              onClick={() => handleBookSlot(slot.id)}
                              className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
                            >
                              {isFull ? "รอบนี้เต็มแล้ว" : "จองรอบนี้นำเสนอ"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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

            {/* Modal: Add Member */}
            <Modal
              isOpen={showAddMember}
              onClose={() => setShowAddMember(false)}
              title="เพิ่มเพื่อนร่วมกลุ่มโครงงาน"
              description={`เลือกเพื่อนในห้อง ม.${group?.room || user?.room || "-"} หรือค้นหาเพื่อนที่ยังไม่มีกลุ่ม`}
              icon={UserPlus}
              maxWidth="lg"
            >
              <div className="space-y-4">
                {/* Section 1: Quick Pick from Classmates */}
                {availableClassmates.length > 0 && (
                  <div className="space-y-2 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>เพื่อนในห้องที่ยังไม่มีกลุ่ม ({availableClassmates.length} คน)</span>
                      {isLoadingClassmates && <span className="text-[10px] text-slate-400 font-normal">กำลังโหลด...</span>}
                    </label>
                    
                    <div className="flex gap-2">
                      <select
                        value={selectedClassmateId}
                        onChange={(e) => setSelectedClassmateId(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
                      >
                        <option value="">-- เลือกเพื่อนในห้อง --</option>
                        {availableClassmates.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.full_name} {c.student_id ? `(${c.student_id})` : ""} - ม.{c.room || group?.room}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        disabled={!selectedClassmateId}
                        onClick={() => {
                          if (selectedClassmateId) {
                            handleAddMember(selectedClassmateId);
                          }
                        }}
                        className="bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" /> เพิ่มเข้ากลุ่ม
                      </button>
                    </div>
                  </div>
                )}

                {/* Section 2: Search By Name/ID across grade */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    หรือค้นหาด้วยชื่อ / รหัสนักเรียน
                  </label>

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchStudents(e.target.value)}
                    placeholder="พิมพ์ชื่อ หรือ รหัสนักเรียน..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
                  />

                  {searchQuery.trim() && (
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 bg-slate-50/50 dark:bg-slate-950/50">
                      {isSearching && (
                        <div className="py-4 text-center text-xs text-slate-400">กำลังค้นหา...</div>
                      )}
                      {!isSearching && searchResults.length === 0 && (
                        <div className="py-4 text-center text-xs text-slate-400">
                          ไม่พบนักเรียนที่ตรงกับคำค้นหา หรือนักเรียนมีกลุ่มแล้ว
                        </div>
                      )}
                      {searchResults.map((std) => (
                        <div key={std.id} className="py-2 px-2.5 flex items-center justify-between hover:bg-white dark:hover:bg-slate-900 rounded-xl transition-colors">
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">{std.full_name}</div>
                            <div className="text-[11px] text-slate-400 font-en">รหัส {std.student_id || "-"} · ห้อง ม.{std.room || "-"}</div>
                          </div>
                          <button
                            onClick={() => handleAddMember(std.id)}
                            className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 shadow-xs"
                          >
                            <Plus className="w-3 h-3" /> เพิ่ม
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMember(false)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    ปิดหน้าต่าง
                  </button>
                </div>
              </div>
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
