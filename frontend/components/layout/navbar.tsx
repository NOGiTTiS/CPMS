"use client";

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuthStore } from "@/store/useAuthStore"
import { ThemeToggle } from "@/components/theme-toggle"
import { 
  LogOut, 
  KeyRound, 
  Menu, 
  X, 
  ShieldAlert, 
  GraduationCap, 
  BookOpenCheck 
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface NavbarProps {
  onToggleSidebar?: () => void
  isSidebarOpen?: boolean
}

export function Navbar({ onToggleSidebar, isSidebarOpen }: NavbarProps) {
  const { user, logout } = useAuthStore()
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isChangingPass, setIsChangingPass] = useState(false)
  const [siteLogo, setSiteLogo] = useState("")
  const [systemName, setSystemName] = useState("TU-North CPMS")
  const [instituteName, setInstituteName] = useState("Computer Project Management System")
  const [systemVersion, setSystemVersion] = useState("v1.0")

  const loadBranding = () => {
    api.get<{ data?: Record<string, string> }>("/settings/public")
      .then((res) => {
        const d = res?.data || {}
        if (d["site_logo"]) setSiteLogo(d["site_logo"])
        else setSiteLogo("")
        if (d["system_name"]) setSystemName(d["system_name"])
        if (d["institute_name"]) setInstituteName(d["institute_name"])
        if (d["system_version"]) setSystemVersion(d["system_version"])
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadBranding()

    const handleBrandingUpdated = () => {
      loadBranding()
    }

    window.addEventListener("branding-updated", handleBrandingUpdated)
    return () => {
      window.removeEventListener("branding-updated", handleBrandingUpdated)
    }
  }, [])

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "ADMIN":
        return (
          <span className="flex items-center gap-1 bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
            <ShieldAlert className="w-3 h-3" /> ผู้ดูแลระบบ
          </span>
        )
      case "TEACHER":
        return (
          <span className="flex items-center gap-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
            <BookOpenCheck className="w-3 h-3" /> ครูผู้สอน
          </span>
        )
      default:
        return (
          <span className="flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
            <GraduationCap className="w-3 h-3" /> นักเรียน {user?.room ? `ม.${user.room}` : ""}
          </span>
        )
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast.error("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน")
      return
    }

    setIsChangingPass(true)
    try {
      await api.post("/auth/change-password", {
        old_password: oldPassword,
        new_password: newPassword,
      })
      toast.success("เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว")
      setShowPasswordModal(false)
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "เปลี่ยนรหัสผ่านไม่สำเร็จ"
      toast.error(errorMsg)
    } finally {
      setIsChangingPass(false)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden cursor-pointer"
                title="Toggle Sidebar"
              >
                {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

            <Link href="/" className="flex items-center gap-2.5 group">
              {siteLogo ? (
                <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs group-hover:scale-105 transition-transform p-0.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={api.getFileUrl(siteLogo)} alt="Site Logo" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-md shadow-brand-500/30 group-hover:scale-105 transition-transform">
                  CPMS
                </div>
              )}
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-tight">
                    {systemName}
                  </h1>
                  <span className="bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border border-brand-200/60 dark:border-brand-900/60 text-[10px] font-bold px-1.5 py-0.2 rounded-md font-en">
                    {systemVersion}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-en">
                  {instituteName}
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle showLabel={false} />

            {user && (
              <div className="flex items-center gap-2 sm:gap-3 border-l border-slate-200 dark:border-slate-800 pl-2 sm:pl-4">
                <div className="hidden md:flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {user.full_name}
                    </span>
                    {getRoleBadge(user.role)}
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-en">
                    {user.student_id ? `ID: ${user.student_id}` : user.email}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="เปลี่ยนรหัสผ่าน"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => logout()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium transition-colors cursor-pointer"
                    title="ออกจากระบบ"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">ออกจากระบบ</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-100 dark:bg-brand-950 flex items-center justify-center text-brand-600 dark:text-brand-300">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">เปลี่ยนรหัสผ่าน</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">รักษาความปลอดภัยบัญชีของคุณ</p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  รหัสผ่านปัจจุบัน
                </label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  placeholder="กรอกรหัสผ่านเดิม"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  placeholder="กรอกรหัสผ่านใหม่"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  ยืนยันรหัสผ่านใหม่
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isChangingPass ? "กำลังบันทึก..." : "บันทึกรหัสผ่าน"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
