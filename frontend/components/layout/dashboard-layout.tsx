"use client";

import React, { useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { Role } from "@/types";

interface DashboardLayoutProps {
  children: (props: { activeTab: string; setActiveTab: (tab: string) => void }) => React.ReactNode;
  allowedRoles: Role[];
  defaultTab: string;
}

export function DashboardLayout({
  children,
  allowedRoles,
  defaultTab,
}: DashboardLayoutProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <AuthGuard allowedRoles={allowedRoles}>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
        <Navbar
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <div className="flex flex-1">
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isOpen={isSidebarOpen}
            onCloseMobile={() => setIsSidebarOpen(false)}
          />

          <main className="flex-1 lg:pl-64 flex flex-col min-w-0">
            <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
              {children({ activeTab, setActiveTab })}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
