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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var c = localStorage.getItem('cpms_theme_color');
                  if (c && /^#[0-9A-Fa-f]{6}$/.test(c)) {
                    var s = document.createElement('style');
                    s.id = 'cpms-theme-preload';
                    s.textContent = ':root, .dark { --color-brand-500: ' + c + ' !important; --primary: ' + c + ' !important; --ring: ' + c + ' !important; }';
                    document.head.appendChild(s);
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
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
