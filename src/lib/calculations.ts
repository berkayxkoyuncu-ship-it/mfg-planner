import { addDays, isWeekend, differenceInDays, parseISO, format, startOfDay } from 'date-fns'
import type { Order } from './supabase'

/** Returns true if the date is a weekend or a holiday */
function isNonWorkingDay(d: Date, holidaySet?: Set<string>): boolean {
  return isWeekend(d) || (!!holidaySet && holidaySet.has(format(d, 'yyyy-MM-dd')))
}

export function calcDaysNeeded(quantity: number, dailyCapacity: number): number {
  if (!quantity || !dailyCapacity || dailyCapacity === 0) return 0
  return Math.ceil(quantity / dailyCapacity)
}

/** Hafta sonu veya tatile denk gelirse sonraki iş gününe atla */
export function snapToWorkingDay(dateStr: string, holidaySet?: Set<string>): string {
  let date = parseISO(dateStr)
  while (isNonWorkingDay(date, holidaySet)) date = addDays(date, 1)
  return format(date, 'yyyy-MM-dd')
}

/** startDate'ten itibaren workingDays iş günü ekle (hafta sonları ve tatilleri atla) */
export function addWorkingDays(startDateStr: string, workingDays: number, holidaySet?: Set<string>): string {
  let date = parseISO(startDateStr)
  // Başlangıç iş günü değilse ilerlet
  while (isNonWorkingDay(date, holidaySet)) date = addDays(date, 1)
  let added = 0
  while (added < workingDays - 1) {
    date = addDays(date, 1)
    if (!isNonWorkingDay(date, holidaySet)) added++
  }
  return format(date, 'yyyy-MM-dd')
}

/** OrderForm'da başlangıç+gün sayısından tahmini bitiş göster */
export function calcEndDate(startDate: string, daysNeeded: number): string {
  return addWorkingDays(startDate, daysNeeded)
}

/** Belirli bir tarihteki planlanmış miktarı döndür (hafta sonu veya tatil = 0) */
export function calcPlannedQtyForDate(order: Order, date: string, holidaySet?: Set<string>): number {
  if (!order.start_date || !order.end_date) return 0
  const d = parseISO(date)
  if (isNonWorkingDay(d, holidaySet)) return 0
  const start = parseISO(order.start_date)
  const end = parseISO(order.end_date)
  if (d < start || d > end) return 0
  return order.daily_capacity
}

export function ordersOverlapRange(
  start1: string, end1: string,
  start2: string, end2: string,
): boolean {
  return parseISO(start1) <= parseISO(end2) && parseISO(start2) <= parseISO(end1)
}

export function daysBetween(start: string, end: string): number {
  return differenceInDays(parseISO(end), parseISO(start)) + 1
}

/** Bugünden end_date'e kadar kalan iş günü sayısı (hafta sonları ve tatiller dahil değil) */
export function workingDaysRemaining(endDateStr: string, holidaySet?: Set<string>): number {
  const today = startOfDay(new Date())
  const end = parseISO(endDateStr)
  if (end < today) return 0
  let count = 0
  let d = today
  while (d <= end) {
    if (!isNonWorkingDay(d, holidaySet)) count++
    d = addDays(d, 1)
  }
  return count
}

/** startStr'den endStr'e kadar iş günü sayısı (her iki uç dahil, hafta sonları ve tatiller hariç) */
export function workingDaysBetween(startStr: string, endStr: string, holidaySet?: Set<string>): number {
  const start = parseISO(startStr)
  const end = parseISO(endStr)
  if (end < start) return 0
  let count = 0
  let d = start
  while (d <= end) {
    if (!isNonWorkingDay(d, holidaySet)) count++
    d = addDays(d, 1)
  }
  return count
}

/** Sipariş için kalan iş günü: başlamadıysa start→end arası, başladıysa bugün→end arası */
export function orderRemainingDays(startDateStr: string, endDateStr: string, holidaySet?: Set<string>): number {
  const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd')
  return startDateStr > todayStr
    ? workingDaysBetween(startDateStr, endDateStr, holidaySet)
    : workingDaysRemaining(endDateStr, holidaySet)
}

/**
 * Zamanında bitirmek için gereken günlük üretim miktarı.
 * startDateStr gelecekteyse planlanan pencereyi (start→end) kullanır;
 * aksi halde bugünden end_date'e kadar kalan günleri kullanır.
 */
export function calcDailyNeeded(
  totalQty: number,
  totalActual: number,
  endDateStr: string,
  startDateStr?: string,
  holidaySet?: Set<string>,
): number {
  const remaining = Math.max(0, totalQty - totalActual)
  if (remaining === 0) return 0
  const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd')
  const days =
    startDateStr && startDateStr > todayStr
      ? workingDaysBetween(startDateStr, endDateStr, holidaySet)
      : workingDaysRemaining(endDateStr, holidaySet)
  if (days === 0) return remaining // gecikmiş — tüm kalan
  return Math.ceil(remaining / days)
}
