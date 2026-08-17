"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Role } from "@/types";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, isInitialized, initAuth } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initAuth();
    }
  }, [isInitialized, initAuth]);

  useEffect(() => {
    if (!isInitialized) return;

    if (!token || !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      // Redirect to correct dashboard based on actual role
      if (user.role === "ADMIN") {
        router.replace("/admin");
      } else if (user.role === "TEACHER") {
        router.replace("/teacher");
      } else {
        router.replace("/student");
      }
    }
  }, [isInitialized, token, user, allowedRoles, router, pathname]);

  if (!isInitialized || !token || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">กำลังโหลดข้อมูลระบบ...</p>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
