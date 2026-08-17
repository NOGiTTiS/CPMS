"use client";

import React from "react";
import { 
  Users, 
  Send, 
  CalendarCheck, 
  Award, 
  ListOrdered, 
  TableProperties, 
  FileSpreadsheet, 
  LayoutDashboard, 
  Sliders, 
  Layers, 
  History, 
  Sparkles,
  School,
  FolderKanban,
  CalendarRange
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ activeTab, setActiveTab, isOpen, onCloseMobile }: SidebarProps) {
  const { user } = useAuthStore();

  const getNavItems = (): NavItem[] => {
    if (!user) return [];

    if (user.role === "ADMIN") {
      return [
        { id: "overview", label: "ภาพรวมระบบ (Overview)", icon: LayoutDashboard },
        { id: "users", label: "จัดการผู้ใช้ & นำเข้า CSV", icon: Users },
        { id: "groups", label: "จัดการกลุ่มโครงงาน (Groups)", icon: FolderKanban },
        { id: "academic-years", label: "จัดการปีการศึกษา", icon: CalendarRange },
        { id: "rooms", label: "มอบหมายห้องเรียนครู", icon: School },
        { id: "steps", label: "กำหนดขั้นตอนส่งงาน", icon: Layers },
        { id: "defense", label: "รอบนำเสนอ & เกณฑ์ Rubric", icon: CalendarCheck },
        { id: "settings", label: "ตั้งค่าระบบ & Telegram", icon: Sliders },
        { id: "logs", label: "บันทึกกิจกรรม (Audit Logs)", icon: History },
      ];
    }

    if (user.role === "TEACHER") {
      return [
        { id: "queue", label: "คิวงานรอตรวจ (Review Queue)", icon: ListOrdered },
        { id: "matrix", label: "ตารางสรุปงานห้องเรียน (Matrix)", icon: TableProperties },
        { id: "defense", label: "กรรมการประเมิน Rubric", icon: Award },
        { id: "export", label: "ส่งออกคะแนน (Export CSV)", icon: FileSpreadsheet },
      ];
    }

    // STUDENT
    return [
      { id: "group", label: "กลุ่มโครงงาน & สมาชิก", icon: Users },
      { id: "milestones", label: "ขั้นตอนส่งงาน & ส่งมอบ", icon: Send },
      { id: "defense", label: "จองรอบนำเสนอโครงงาน", icon: CalendarCheck },
      { id: "scores", label: "สรุปผลการประเมิน", icon: Sparkles },
    ];
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed top-16 bottom-0 left-0 z-30 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-200 lg:translate-x-0 overflow-y-auto flex flex-col justify-between p-4",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="space-y-1">
          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            เมนูหลัก ({user?.role})
          </div>

          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer",
                    isActive
                      ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-slate-500 dark:text-slate-400")} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer info in sidebar */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 text-[11px] space-y-1 text-slate-500 dark:text-slate-400">
          <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            TU-North CPMS v1.0
          </div>
          <p className="text-[10px]">ระบบพร้อมใช้งานบน LAN และ Cloudflare</p>
        </div>
      </aside>
    </>
  );
}
