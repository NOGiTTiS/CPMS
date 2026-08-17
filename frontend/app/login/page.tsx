"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/lib/api";
import { LoginResponse } from "@/types";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "sonner";
import { LogIn, GraduationCap, ShieldCheck, Lock, User as UserIcon } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, setAuth, initAuth, isInitialized } = useAuthStore();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (isInitialized && token && user) {
      if (user.role === "ADMIN") {
        router.replace("/admin");
      } else if (user.role === "TEACHER") {
        router.replace("/teacher");
      } else {
        router.replace("/student");
      }
    }
  }, [isInitialized, token, user, router]);

  useEffect(() => {
    if (searchParams.get("expired")) {
      toast.error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      toast.error("กรุณากรอกรหัสนักเรียน/อีเมล และรหัสผ่าน");
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post<LoginResponse>("/auth/login", {
        identifier: identifier.trim(),
        password: password.trim(),
      });

      const loginUser = res?.user || res?.data?.user;
      const accessToken = res?.token || res?.access_token || res?.data?.access_token || res?.data?.token;

      if (accessToken && loginUser) {
        setAuth({
          token: accessToken,
          access_token: accessToken,
          refresh_token: res.refresh_token || res.data?.refresh_token,
          user: loginUser,
        });
        toast.success(`ยินดีต้อนรับคุณ ${loginUser.full_name}`);

        const redirectUrl = searchParams.get("redirect");
        if (redirectUrl) {
          router.replace(redirectUrl);
          return;
        }

        if (loginUser.role === "ADMIN") {
          router.replace("/admin");
        } else if (loginUser.role === "TEACHER") {
          router.replace("/teacher");
        } else {
          router.replace("/student");
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ";
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 mb-1 border border-brand-100 dark:border-brand-900/50">
          <GraduationCap className="w-7 h-7" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          เข้าสู่ระบบจัดการโครงงาน
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          นักเรียนสามารถเข้าใช้งานด้วย <span className="font-semibold text-brand-600 dark:text-brand-400">รหัสนักเรียน</span> หรือ <span className="font-semibold text-brand-600 dark:text-brand-400">อีเมล</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <UserIcon className="w-3.5 h-3.5 text-brand-500" />
            รหัสนักเรียน หรือ อีเมล (Email / Student ID)
          </label>
          <input
            type="text"
            required
            autoFocus
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="เช่น 12345 หรือ student@tunorth.ac.th"
            className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-xs outline-none transition-all font-en"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-brand-500" />
              รหัสผ่าน (Password)
            </label>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="กรอกรหัสผ่านของคุณ"
            className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-xs outline-none transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 bg-brand-500 hover:bg-brand-600 active:scale-98 text-white py-3 rounded-2xl text-xs font-bold shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>กำลังเข้าสู่ระบบ...</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>เข้าสู่ระบบ</span>
            </>
          )}
        </button>
      </form>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
        <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          ความปลอดภัยระดับสถาบันการศึกษา (JWT + BCrypt)
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md shadow-brand-500/30">
            CPMS
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
              TU-North CPMS
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-en">
              โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full space-y-6">
          <Suspense fallback={
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl text-center text-xs text-slate-400">
              กำลังโหลดฟอร์มเข้าสู่ระบบ...
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 dark:text-slate-600">
        © 2568 TU-North CPMS · โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ
      </footer>
    </div>
  );
}
