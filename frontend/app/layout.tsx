import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import { DynamicBranding } from "@/components/dynamic-branding"

export const metadata: Metadata = {
  title: "TU-North CPMS | ระบบจัดการโครงงานคอมพิวเตอร์",
  description: "ระบบจัดการโครงงานคอมพิวเตอร์ โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-brand-500 selection:text-white transition-colors duration-200">
        <ThemeProvider defaultTheme="light" storageKey="kru_theme">
          <DynamicBranding />
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
