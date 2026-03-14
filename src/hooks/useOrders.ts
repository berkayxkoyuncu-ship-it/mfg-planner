import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, type Order } from '../lib/supabase'
import { snapToWorkingDay, addWorkingDays } from '../lib/calculations'
import { useHolidayContext } from '../contexts/HolidayContext'

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { holidays, holidaySet } = useHolidayContext()

  // Stable string key that only changes value when the set of holiday dates changes.
  // useEffect compares primitive strings by value, so this fires exactly when holidays are added/removed.
  const holidaysKey = holidays.map(h => h.date).sort().join(',')

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at')
    if (error) setError(error.message)
    else setOrders(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // When holidays change (add or remove), recalculate end_date for all assigned orders.
  // Skip on the initial mount — orders haven't loaded yet and this is not a user-triggered change.
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const recalculate = async () => {
      // Fetch latest orders fresh so we're not working off stale state
      const { data } = await supabase.from('orders').select('*').order('created_at')
      const current: Order[] = data ?? []

      const toUpdate = current.filter(o => o.start_date && o.end_date && o.line_id)
      if (toUpdate.length === 0) return

      // Build updated holidaySet from current holidays (the one in scope is already latest)
      const updates = toUpdate
        .map(o => ({
          id: o.id,
          newEndDate: addWorkingDays(o.start_date!, o.days_needed, holidaySet),
        }))
        .filter(({ id, newEndDate }) => {
          const o = current.find(x => x.id === id)
          return o?.end_date !== newEndDate
        })

      if (updates.length === 0) return

      await Promise.all(
        updates.map(({ id, newEndDate }) =>
          supabase.from('orders').update({ end_date: newEndDate }).eq('id', id)
        )
      )
      await fetchOrders()
    }
    recalculate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holidaysKey])

  const createOrder = useCallback(async (order: Omit<Order, 'id' | 'days_needed' | 'end_date' | 'created_at'>) => {
    const { error } = await supabase.from('orders').insert(order)
    if (error) throw error
    await fetchOrders()
  }, [fetchOrders])

  const updateOrder = useCallback(async (id: string, patch: Partial<Omit<Order, 'id' | 'days_needed' | 'created_at'>>) => {
    const { error } = await supabase.from('orders').update(patch).eq('id', id)
    if (error) throw error
    await fetchOrders()
  }, [fetchOrders])

  const deleteOrder = useCallback(async (id: string) => {
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (error) throw error
    await fetchOrders()
  }, [fetchOrders])

  const assignToLine = useCallback(async (id: string, lineId: string | null, startDate: string | null) => {
    const order = orders.find((o) => o.id === id)
    const snappedStart = startDate ? snapToWorkingDay(startDate, holidaySet) : null
    const endDate = snappedStart && order
      ? addWorkingDays(snappedStart, order.days_needed, holidaySet)
      : null

    const { error } = await supabase.from('orders').update({
      line_id: lineId,
      start_date: snappedStart,
      end_date: endDate,
    }).eq('id', id)
    if (error) throw error
    await fetchOrders()
  }, [fetchOrders, orders, holidaySet])

  return { orders, loading, error, refetch: fetchOrders, createOrder, updateOrder, deleteOrder, assignToLine }
}
