import { create } from "zustand"
import { AcademicYear } from "@/types"
import { api } from "@/lib/api"

interface AcademicYearState {
  academicYears: AcademicYear[]
  currentYear: string
  selectedYear: string
  isLoading: boolean
  isInitialized: boolean
  fetchAcademicYears: () => Promise<AcademicYear[]>
  setSelectedYear: (year: string) => void
  refreshYears: () => Promise<void>
}

export const useAcademicYearStore = create<AcademicYearState>((set, get) => ({
  academicYears: [],
  currentYear: "2568",
  selectedYear: "2568",
  isLoading: false,
  isInitialized: false,

  fetchAcademicYears: async () => {
    try {
      set({ isLoading: true })
      const res = await api.get<{ data?: AcademicYear[] }>("/academic-years/active")
      const list = res?.data || []
      if (Array.isArray(list) && list.length > 0) {
        const curr = list.find((y) => y.is_current) || list[0]
        const currentYearStr = curr?.year || "2568"
        
        // If selectedYear is not yet in list or matches previous currentYear, set to currentYear
        const prevSelected = get().selectedYear
        const isPrevInList = list.some((y) => y.year === prevSelected)
        const nextSelected = isPrevInList ? prevSelected : currentYearStr

        set({
          academicYears: list,
          currentYear: currentYearStr,
          selectedYear: nextSelected,
          isLoading: false,
          isInitialized: true
        })
        return list
      }
      set({ isLoading: false, isInitialized: true })
      return []
    } catch {
      set({ isLoading: false, isInitialized: true })
      return []
    }
  },

  setSelectedYear: (year: string) => {
    set({ selectedYear: year })
  },

  refreshYears: async () => {
    await get().fetchAcademicYears()
  }
}))
