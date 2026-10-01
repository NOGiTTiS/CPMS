"use client";

import React, { useState, useEffect } from "react";
import { AcademicYear } from "@/types";
import { api } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Download,
  Users,
  UserCheck,
  Layers,
  FileText,
  Loader2,
  Calendar,
  CheckCircle2,
} from "lucide-react";

interface ExportScoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academicYears?: AcademicYear[];
  rooms?: string[];
  defaultYear?: string;
  defaultRoom?: string;
}

export default function ExportScoreDialog({
  open,
  onOpenChange,
  academicYears = [],
  rooms = [],
  defaultYear = "",
  defaultRoom = "all",
}: ExportScoreDialogProps) {
  const [selectedYear, setSelectedYear] = useState<string>(defaultYear);
  const [selectedRoom, setSelectedRoom] = useState<string>(defaultRoom || "all");
  const [exportType, setExportType] = useState<"group" | "student">("group");
  const [fileFormat, setFileFormat] = useState<"xlsx" | "csv">("xlsx");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      if (defaultYear) setSelectedYear(defaultYear);
      if (defaultRoom) setSelectedRoom(defaultRoom);
    }
  }, [open, defaultYear, defaultRoom]);

  // Clean room label helper
  const getRoomLabel = (rm: string) => {
    if (!rm || rm === "all" || rm === "-") return rm;
    return rm.startsWith("6.") || rm.startsWith("60") ? `ม.${rm}` : rm;
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const yrParam = selectedYear ? `academic_year=${encodeURIComponent(selectedYear)}` : "";
      const rmParam = selectedRoom && selectedRoom !== "all" ? `room=${encodeURIComponent(selectedRoom)}` : "";
      const typeParam = `type=${exportType}`;

      const queryParts = [yrParam, rmParam, typeParam].filter(Boolean);
      const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";

      const fileExt = fileFormat;
      const typeLabel = exportType === "group" ? "รายกลุ่ม" : "รายบุคคล";
      const roomSuffix = selectedRoom && selectedRoom !== "all" ? `_ห้อง${selectedRoom}` : "_ทุกห้อง";
      const defaultFilename = `CPMS_รายงานคะแนน_${typeLabel}${roomSuffix}.${fileExt}`;

      const formatRoute = fileFormat === "xlsx" ? "excel" : "csv";
      const endpoint = `/teacher/scores/export/${formatRoute}${queryString}`;

      await api.downloadFile(endpoint, defaultFilename);
      toast.success(`ดาวน์โหลดรายงานคะแนน (${fileFormat.toUpperCase()}) สำเร็จเรียบร้อย!`);
      onOpenChange(false);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการส่งออกข้อมูล";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="ส่งออกรายงานผลคะแนนและการประเมิน"
      description="เลือกระดับข้อมูล รูปแบบการจัดกลุ่ม และนามสกุลไฟล์ที่ต้องการส่งออกสำหรับประมวลผลหรือตัดเกรด"
      icon={FileSpreadsheet}
      maxWidth="lg"
    >
      <div className="space-y-4 py-1 text-slate-800 dark:text-slate-200">
        {/* Academic Year Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" /> ปีการศึกษา
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3 py-2 outline-hidden focus:ring-2 focus:ring-brand-500/30 dark:text-white"
          >
            {academicYears.length > 0 ? (
              academicYears.map((ay) => (
                <option key={ay.id} value={ay.year}>
                  ปีการศึกษา {ay.year} {ay.is_current ? "(ปีปัจจุบัน)" : ""}
                </option>
              ))
            ) : (
              <option value={selectedYear || "2568"}>ปีการศึกษา {selectedYear || "2568"}</option>
            )}
          </select>
        </div>

        {/* Room Scope */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-slate-400" /> ขอบเขตห้องเรียน (การแยกห้อง)
          </label>
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3 py-2 outline-hidden focus:ring-2 focus:ring-brand-500/30 dark:text-white"
          >
            <option value="all">
              📁 ทุกห้องเรียน (รวมทุกห้อง + แยกชีตตามห้องใน Excel)
            </option>
            {rooms.map((rm) => (
              <option key={rm} value={rm}>
                ห้อง {getRoomLabel(rm)}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {selectedRoom === "all"
              ? "💡 ระบบจะสร้างชีตสรุปภาพรวมทั้งหมด + สร้างชีตแยกของแต่ละห้องเรียนโดยเฉพาะในไฟล์ Excel"
              : "💡 ระบบจะส่งออกเฉพาะข้อมูลโครงงานและนักเรียนในห้องเรียนที่เลือก"}
          </p>
        </div>

        {/* Export Level (Group vs Student) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-slate-400" /> ระดับข้อมูลที่ต้องการแสดง (การแยกกลุ่ม / รายคน)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setExportType("group")}
              className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                exportType === "group"
                  ? "border-brand-500 bg-brand-50/70 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 ring-1 ring-brand-500/40 shadow-xs"
                  : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs w-full">
                <Users className="h-3.5 w-3.5 text-brand-500" />
                <span>สรุปรายกลุ่ม</span>
                {exportType === "group" && <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-brand-500" />}
              </div>
              <span className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                1 แถวต่อ 1 กลุ่ม พร้อมรายชื่อสมาชิก เหมาะสำหรับดูภาพรวมโครงงาน
              </span>
            </button>

            <button
              type="button"
              onClick={() => setExportType("student")}
              className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                exportType === "student"
                  ? "border-brand-500 bg-brand-50/70 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 ring-1 ring-brand-500/40 shadow-xs"
                  : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs w-full">
                <UserCheck className="h-3.5 w-3.5 text-brand-500" />
                <span>รายชื่อนักเรียนรายคน</span>
                {exportType === "student" && <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-brand-500" />}
              </div>
              <span className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                1 แถวต่อนักเรียน 1 คน แสดงรหัสและชื่อ เหมาะสำหรับส่งเกรดเข้าระบบทะเบียน
              </span>
            </button>
          </div>
        </div>

        {/* File Format */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5 text-slate-400" /> นามสกุลไฟล์
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setFileFormat("xlsx")}
              className={`flex items-center gap-2.5 p-3 rounded-2xl border transition-all text-xs font-semibold cursor-pointer ${
                fileFormat === "xlsx"
                  ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/40 shadow-xs"
                  : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="font-bold">Excel (.xlsx) - แนะนำ</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">มีหลายชีต ตารางจัดรูปสวยงาม</span>
              </div>
              {fileFormat === "xlsx" && <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-emerald-600 dark:text-emerald-400" />}
            </button>

            <button
              type="button"
              onClick={() => setFileFormat("csv")}
              className={`flex items-center gap-2.5 p-3 rounded-2xl border transition-all text-xs font-semibold cursor-pointer ${
                fileFormat === "csv"
                  ? "border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 ring-1 ring-blue-500/40 shadow-xs"
                  : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="font-bold">CSV (.csv)</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">UTF-8 BOM รองรับภาษาไทย</span>
              </div>
              {fileFormat === "csv" && <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-blue-600 dark:text-blue-400" />}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={loading}
            className="bg-brand-500 hover:bg-brand-600 active:scale-98 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>กำลังสร้างรายงาน...</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                <span>ดาวน์โหลดรายงาน ({fileFormat.toUpperCase()})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
