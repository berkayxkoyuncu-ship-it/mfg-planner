import { useState, useCallback } from 'react'
import { useLines } from '../hooks/useLines'
import { useOrders } from '../hooks/useOrders'
import { useActuals } from '../hooks/useActuals'
import { useBrands } from '../hooks/useBrands'
import { GanttChart } from '../components/Gantt/GanttChart'
import { OrderForm } from '../components/Orders/OrderForm'
import type { Order } from '../lib/supabase'
import { calcDaysNeeded, addWorkingDays } from '../lib/calculations'
import { useHolidayContext } from '../contexts/HolidayContext'

export function PlanningPage() {
  const { lines, loading: linesLoading } = useLines()
  const { orders, loading: ordersLoading, createOrder, updateOrder, deleteOrder, assignToLine } = useOrders()
  const { brands } = useBrands()
  const { actuals } = useActuals()
  const { holidaySet } = useHolidayContext()
  const [editingOrder, setEditingOrder] = useState<Order | null | undefined>(undefined)

  const handleAssign = useCallback(async (orderId: string, lineId: string | null, startDate: string | null) => {
    await assignToLine(orderId, lineId, startDate)
  }, [assignToLine])

  const handleOrderClick = (order: Order) => setEditingOrder(order)
  const handleAddOrder = () => setEditingOrder(null)
  const handleClose = () => setEditingOrder(undefined)

  const handleSave = async (data: Partial<Order>) => {
    if (editingOrder === null) {
      await createOrder({
        brand: data.brand!,
        style: data.style!,
        quantity: data.quantity!,
        daily_capacity: data.daily_capacity!,
        target_ship_date: data.target_ship_date ?? null,
        line_id: null,
        start_date: null,
        status: 'planned',
        color: data.color ?? '#6366f1',
        ana_marka: data.ana_marka ?? null,
      })
    } else if (editingOrder) {
      const patch: Partial<Order> = { ...data }
      // Recalculate end_date if order is assigned and quantity/capacity changed
      if (editingOrder.start_date && (data.quantity !== undefined || data.daily_capacity !== undefined)) {
        const qty = data.quantity ?? editingOrder.quantity
        const cap = data.daily_capacity ?? editingOrder.daily_capacity
        const daysNeeded = calcDaysNeeded(qty, cap)
        patch.end_date = addWorkingDays(editingOrder.start_date, daysNeeded, holidaySet)
      }
      await updateOrder(editingOrder.id, patch)
    }
  }

  const handleDelete = async () => {
    if (editingOrder) await deleteOrder(editingOrder.id)
  }

  if (linesLoading || ordersLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Yükleniyor…</div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <GanttChart
        lines={lines}
        orders={orders}
        actuals={actuals}
        onOrderClick={handleOrderClick}
        onAddOrder={handleAddOrder}
        onAssign={handleAssign}
      />
      {editingOrder !== undefined && (
        <OrderForm
          order={editingOrder}
          lines={lines}
          brands={brands}
          onSave={handleSave}
          onDelete={editingOrder ? handleDelete : undefined}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
