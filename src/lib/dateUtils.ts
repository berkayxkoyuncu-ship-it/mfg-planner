import {
  startOfMonth, endOfMonth, addMonths, eachDayOfInterval,
  format, parseISO, addDays, isWeekend, startOfWeek, isSameMonth,
  differenceInDays
} from 'date-fns'
import { tr } from 'date-fns/locale'

export type DayCell = {
  date: string        // yyyy-MM-dd
  label: string       // "10"
  isWeekend: boolean
  isToday: boolean
  isHoliday: boolean  // true when date is in the holiday map
  holidayName: string // e.g. "Kurban Bayramı 1. Günü" — empty string when not a holiday
  monthLabel: string  // "March 2026" — set only on first day of month
  weekLabel: string   // set only on first day of week
}

export function buildDayCells(
  viewStart: Date,
  viewEnd: Date,
  holidayMap: Map<string, string> = new Map(),  // date (yyyy-MM-dd) → holiday name
): DayCell[] {
  const today = format(new Date(), 'yyyy-MM-dd')
  const days = eachDayOfInterval({ start: viewStart, end: viewEnd })
  return days.map((d, i) => {
    const iso = format(d, 'yyyy-MM-dd')
    const prevDay = i > 0 ? days[i - 1] : null
    const isFirstOfMonth = !prevDay || !isSameMonth(d, prevDay)
    const isFirstOfWeek = d.getDay() === 1 // Monday
    return {
      date: iso,
      label: format(d, 'd'),
      isWeekend: isWeekend(d),
      isToday: iso === today,
      isHoliday: holidayMap.has(iso),
      holidayName: holidayMap.get(iso) ?? '',
      monthLabel: isFirstOfMonth ? format(d, 'MMMM yyyy', { locale: tr }) : '',
      weekLabel: isFirstOfWeek ? `W${format(d, 'w')}` : '',
    }
  })
}

export function defaultViewWindow(): { viewStart: Date; viewEnd: Date } {
  const now = new Date()
  const viewStart = startOfMonth(now)
  const viewEnd = endOfMonth(addMonths(now, 2))
  return { viewStart, viewEnd }
}

/** How many pixels wide should a date cell be */
export const DAY_WIDTH = 36

/** Given a date and viewStart, compute left offset in px */
export function dateToOffset(date: string, viewStart: Date): number {
  return differenceInDays(parseISO(date), viewStart) * DAY_WIDTH
}

/** Given an offset in px and viewStart, compute the date */
export function offsetToDate(offsetPx: number, viewStart: Date): string {
  const days = Math.round(offsetPx / DAY_WIDTH)
  return format(addDays(viewStart, days), 'yyyy-MM-dd')
}

/** Returns Monday and Friday (as yyyy-MM-dd) of the week containing the given date */
export function getWeekBounds(date: Date): { weekStart: string; weekEnd: string } {
  const monday = startOfWeek(date, { weekStartsOn: 1 })
  return {
    weekStart: format(monday, 'yyyy-MM-dd'),
    weekEnd: format(addDays(monday, 4), 'yyyy-MM-dd'),
  }
}
