import { useState, useEffect, useCallback } from 'react'
import { supabase, type Holiday } from '../lib/supabase'

export function useHolidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHolidays = useCallback(async () => {
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .order('date')
    if (error) setError(error.message)
    else setHolidays(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchHolidays() }, [fetchHolidays])

  const addHoliday = useCallback(async (date: string, name: string): Promise<string | null> => {
    const { error } = await supabase.from('holidays').insert({ date, name })
    if (error) {
      // Postgres unique constraint violation
      if (error.code === '23505') return 'Bu tarih zaten mevcut'
      return error.message
    }
    await fetchHolidays()
    return null
  }, [fetchHolidays])

  const removeHoliday = useCallback(async (id: string) => {
    const { error } = await supabase.from('holidays').delete().eq('id', id)
    if (error) throw error
    await fetchHolidays()
  }, [fetchHolidays])

  const holidaySet = new Set(holidays.map(h => h.date))
  const holidayMap = new Map(holidays.map(h => [h.date, h.name]))

  return { holidays, holidaySet, holidayMap, addHoliday, removeHoliday, loading, error }
}
