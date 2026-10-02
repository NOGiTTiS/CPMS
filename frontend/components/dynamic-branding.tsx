"use client"

import { useEffect } from "react"
import { api } from "@/lib/api"

interface RgbColor {
  r: number
  g: number
  b: number
}

function hexToRgb(hex: string): RgbColor {
  const cleanHex = hex.replace("#", "")
  if (cleanHex.length !== 6) return { r: 95, g: 6, b: 196 }
  return {
    r: parseInt(cleanHex.substring(0, 2), 16),
    g: parseInt(cleanHex.substring(2, 4), 16),
    b: parseInt(cleanHex.substring(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)))
  return `#${[clamp(r), clamp(g), clamp(b)].map((x) => x.toString(16).padStart(2, "0")).join("")}`
}

function mixColors(c1: RgbColor, c2: RgbColor, weight: number): string {
  const w1 = weight
  const w2 = 1 - weight
  return rgbToHex(
    c1.r * w1 + c2.r * w2,
    c1.g * w1 + c2.g * w2,
    c1.b * w1 + c2.b * w2
  )
}

function getContrastColor(rgb: RgbColor): string {
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000
  return yiq >= 150 ? "#0f172a" : "#ffffff"
}

export function generateColorPalette(baseHex: string) {
  const rgb = hexToRgb(baseHex)
  const white: RgbColor = { r: 255, g: 255, b: 255 }
  const black: RgbColor = { r: 0, g: 0, b: 0 }

  return {
    50: mixColors(rgb, white, 0.08),
    100: mixColors(rgb, white, 0.16),
    200: mixColors(rgb, white, 0.30),
    300: mixColors(rgb, white, 0.50),
    400: mixColors(rgb, white, 0.75),
    500: baseHex,
    600: mixColors(rgb, black, 0.85),
    700: mixColors(rgb, black, 0.70),
    800: mixColors(rgb, black, 0.55),
    900: mixColors(rgb, black, 0.40),
    950: mixColors(rgb, black, 0.25),
    foreground: getContrastColor(rgb),
  }
}

export interface DayColorConfig {
  dayIndex: number
  key: string
  name: string
  enName: string
  defaultHex: string
}

export const DEFAULT_DAY_COLORS: Record<number, DayColorConfig> = {
  0: { dayIndex: 0, key: "theme_day_color_sun", name: "วันอาทิตย์", enName: "Sunday", defaultHex: "#dc2626" },
  1: { dayIndex: 1, key: "theme_day_color_mon", name: "วันจันทร์", enName: "Monday", defaultHex: "#eab308" },
  2: { dayIndex: 2, key: "theme_day_color_tue", name: "วันอังคาร", enName: "Tuesday", defaultHex: "#ec4899" },
  3: { dayIndex: 3, key: "theme_day_color_wed", name: "วันพุธ", enName: "Wednesday", defaultHex: "#059669" },
  4: { dayIndex: 4, key: "theme_day_color_thu", name: "วันพฤหัสบดี", enName: "Thursday", defaultHex: "#ea580c" },
  5: { dayIndex: 5, key: "theme_day_color_fri", name: "วันศุกร์", enName: "Friday", defaultHex: "#0284c7" },
  6: { dayIndex: 6, key: "theme_day_color_sat", name: "วันเสาร์", enName: "Saturday", defaultHex: "#7c3aed" },
}

export function resolveEffectiveThemeColor(settings: Record<string, string>): string {
  const isAuto = settings["theme_auto_color_enabled"] === "true"
  if (isAuto) {
    const todayIndex = new Date().getDay()
    const dayConfig = DEFAULT_DAY_COLORS[todayIndex]
    const customHex = settings[dayConfig.key]
    if (customHex && /^#[0-9A-Fa-f]{6}$/.test(customHex)) {
      return customHex
    }
    return dayConfig.defaultHex
  }
  const primary = settings["theme_primary_color"]
  if (primary && /^#[0-9A-Fa-f]{6}$/.test(primary)) {
    return primary
  }
  return "#5f06c4"
}

export function applyThemeColors(themeColor: string) {
  if (!themeColor || !/^#[0-9A-Fa-f]{6}$/.test(themeColor)) return
  if (typeof document === "undefined") return

  const p = generateColorPalette(themeColor)
  const root = document.documentElement

  // 1. Set direct CSS variables on root style attribute
  root.style.setProperty("--color-brand-50", p[50])
  root.style.setProperty("--color-brand-100", p[100])
  root.style.setProperty("--color-brand-200", p[200])
  root.style.setProperty("--color-brand-300", p[300])
  root.style.setProperty("--color-brand-400", p[400])
  root.style.setProperty("--color-brand-500", p[500])
  root.style.setProperty("--color-brand-600", p[600])
  root.style.setProperty("--color-brand-700", p[700])
  root.style.setProperty("--color-brand-800", p[800])
  root.style.setProperty("--color-brand-900", p[900])
  root.style.setProperty("--color-brand-950", p[950])
  root.style.setProperty("--color-brand-foreground", p.foreground)

  root.style.setProperty("--primary", p[500])
  root.style.setProperty("--primary-hover", p[600])
  root.style.setProperty("--primary-foreground", p.foreground)
  root.style.setProperty("--ring", p[500])

  // 2. Inject or update dynamic <style id="cpms-theme-override"> tag with !important
  // This guarantees that Tailwind CSS v4 @theme and .dark rules are strictly overridden across all components
  let styleEl = document.getElementById("cpms-theme-override") as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement("style")
    styleEl.id = "cpms-theme-override"
    document.head.appendChild(styleEl)
  }

  styleEl.textContent = `
    :root, .dark {
      --color-brand-50: ${p[50]} !important;
      --color-brand-100: ${p[100]} !important;
      --color-brand-200: ${p[200]} !important;
      --color-brand-300: ${p[300]} !important;
      --color-brand-400: ${p[400]} !important;
      --color-brand-500: ${p[500]} !important;
      --color-brand-600: ${p[600]} !important;
      --color-brand-700: ${p[700]} !important;
      --color-brand-800: ${p[800]} !important;
      --color-brand-900: ${p[900]} !important;
      --color-brand-950: ${p[950]} !important;
      --color-brand-foreground: ${p.foreground} !important;
      --primary: ${p[500]} !important;
      --primary-hover: ${p[600]} !important;
      --primary-foreground: ${p.foreground} !important;
      --ring: ${p[500]} !important;
      --accent: ${p[50]} !important;
      --accent-foreground: ${p[700]} !important;
    }
    .dark {
      --accent: ${p[900]} !important;
      --accent-foreground: ${p[200]} !important;
    }
  `

  try {
    localStorage.setItem("cpms_theme_color", themeColor)
  } catch {
    // Ignore storage quota or restriction errors
  }
}

export function DynamicBranding() {
  const updateBranding = (explicitColor?: string) => {
    // 1. Immediately apply cached theme color from localStorage or explicit parameter
    if (typeof window !== "undefined") {
      const activeColor = explicitColor || localStorage.getItem("cpms_theme_color")
      if (activeColor && /^#[0-9A-Fa-f]{6}$/.test(activeColor)) {
        applyThemeColors(activeColor)
      }
    }

    // 2. Fetch fresh public settings from backend
    api.get<{ data?: Record<string, string> }>("/settings/public")
      .then((res) => {
        const d = res?.data || {}
        const faviconUrl = d["site_favicon"]
        const systemName = d["system_name"]

        // Resolve effective color considering auto day color or custom hex
        const targetColor =
          explicitColor ||
          resolveEffectiveThemeColor(d) ||
          (typeof window !== "undefined" ? localStorage.getItem("cpms_theme_color") : null)

        if (targetColor && /^#[0-9A-Fa-f]{6}$/.test(targetColor)) {
          applyThemeColors(targetColor)
        }

        // Update Favicon in document.head
        if (faviconUrl) {
          const resolvedFavicon = api.getFileUrl(faviconUrl)
          let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']")
          if (!link) {
            link = document.createElement("link")
            link.rel = "icon"
            document.head.appendChild(link)
          }
          link.href = resolvedFavicon

          let shortcutLink = document.querySelector<HTMLLinkElement>("link[rel='shortcut icon']")
          if (!shortcutLink) {
            shortcutLink = document.createElement("link")
            shortcutLink.rel = "shortcut icon"
            document.head.appendChild(shortcutLink)
          }
          shortcutLink.href = resolvedFavicon
        }

        // Update Page Title if custom
        if (systemName && (!document.title || document.title.includes("TU-North CPMS"))) {
          document.title = `${systemName} | ระบบจัดการโครงงานคอมพิวเตอร์`
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    updateBranding()

    // 1. Listen for in-app settings updated event
    const handleBrandingUpdated = (e?: Event) => {
      const customEvent = e as CustomEvent<{ themeColor?: string }>
      const newColor = customEvent?.detail?.themeColor
      if (newColor && /^#[0-9A-Fa-f]{6}$/.test(newColor)) {
        applyThemeColors(newColor)
      }
      updateBranding(newColor)
    }

    // 2. Listen for cross-tab storage changes (sync across open tabs immediately)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "cpms_theme_color" && e.newValue && /^#[0-9A-Fa-f]{6}$/.test(e.newValue)) {
        applyThemeColors(e.newValue)
      }
    }

    // 3. Midnight rollover check (every 60 seconds)
    let lastCheckedDay = new Date().getDay()
    const midnightInterval = setInterval(() => {
      const currentDay = new Date().getDay()
      if (currentDay !== lastCheckedDay) {
        lastCheckedDay = currentDay
        updateBranding()
      }
    }, 60000)

    window.addEventListener("branding-updated", handleBrandingUpdated)
    window.addEventListener("storage", handleStorageChange)

    return () => {
      clearInterval(midnightInterval)
      window.removeEventListener("branding-updated", handleBrandingUpdated)
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

  return null
}
