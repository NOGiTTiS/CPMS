"use client"

import { useEffect } from "react"
import { api } from "@/lib/api"

export function DynamicBranding() {
  const updateBranding = () => {
    api.get<{ data?: Record<string, string> }>("/settings/public")
      .then((res) => {
        const d = res?.data || {}
        const faviconUrl = d["site_favicon"]
        const systemName = d["system_name"]

        // 1. Update Favicon in document.head
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

        // 2. Update Page Title if custom
        if (systemName && (!document.title || document.title.includes("TU-North CPMS"))) {
          document.title = `${systemName} | ระบบจัดการโครงงานคอมพิวเตอร์`
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    updateBranding()

    // Listen for custom settings updated event
    const handleBrandingUpdated = () => {
      updateBranding()
    }

    window.addEventListener("branding-updated", handleBrandingUpdated)
    return () => {
      window.removeEventListener("branding-updated", handleBrandingUpdated)
    }
  }, [])

  return null
}
