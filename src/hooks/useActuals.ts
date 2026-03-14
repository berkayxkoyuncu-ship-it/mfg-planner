import { useState, useEffect, useCallback } from 'react'
import { supabase, type DailyActual } from '../lib/supabase'

export function useActuals(lineId?: string) {
  const [actuals, setActuals] = useState<DailyActual[]>([])
  const [loading, setLoading] = useState(true)

  const fetchActuals = useCallback(async () => {
    let q = supabase.from('daily_actuals').select('*').order('date')
    if (lineId) q = q.eq('line_id', lineId)
    const { data, error } = await q
    if (error) { console.error(error); return }
    setActuals(data ?? [])
    setLoading(false)
  }, [lineId])

  useEffect(() => { fetchActuals() }, [fetchActuals])

  const upsertActual = useCallback(async (orderId: string, actualLineId: string, date: string, qty: number) => {
    const { error } = await supabase.from('daily_actuals').upsert(
      { order_id: orderId, line_id: actualLineId, date, actual_qty: qty },
      { onConflict: 'order_id,line_id,date' }
    )
    if (error) throw error
    await fetchActuals()
  }, [fetchActuals])

  return { actuals, loading, refetch: fetchActuals, upsertActual }
}
