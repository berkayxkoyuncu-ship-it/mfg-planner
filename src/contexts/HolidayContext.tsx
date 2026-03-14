import { createContext, useContext, type ReactNode } from 'react'
import { useHolidays } from '../hooks/useHolidays'

type HolidayContextValue = ReturnType<typeof useHolidays>

const HolidayContext = createContext<HolidayContextValue | null>(null)

export function HolidayProvider({ children }: { children: ReactNode }) {
  const value = useHolidays()
  return <HolidayContext.Provider value={value}>{children}</HolidayContext.Provider>
}

export function useHolidayContext(): HolidayContextValue {
  const ctx = useContext(HolidayContext)
  if (!ctx) throw new Error('useHolidayContext must be used within HolidayProvider')
  return ctx
}
