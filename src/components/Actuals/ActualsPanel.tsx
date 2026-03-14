import { Fragment, useState } from 'react'
import { format, parseISO, addDays, startOfWeek } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { Line, Order, DailyActual } from '../../lib/supabase'
import { calcPlannedQtyForDate } from '../../lib/calculations'
import { getWeekBounds } from '../../lib/dateUtils'

interface Props {
  lines: Line[]
  orders: Order[]
  actuals: DailyActual[]
  onUpsert: (orderId: string, lineId: string, date: string, qty: number) => Promise<void>
}

const DAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum']

export function ActualsPanel({ lines, orders, actuals, onUpsert }: Props) {
  const [weekMonday, setWeekMonday] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  )
  const [saving, setSaving] = useState<string | null>(null)

  const { weekStart, weekEnd } = getWeekBounds(weekMonday)

  // Mon–Fri dates as yyyy-MM-dd strings
  const weekDays = Array.from({ length: 5 }, (_, i) =>
    format(addDays(parseISO(weekStart), i), 'yyyy-MM-dd'),
  )

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const sortedActiveLines = lines
    .filter((l) => l.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
  const internalLines = sortedActiveLines.filter((l) => l.type === 'internal')
  const externalLines = sortedActiveLines.filter((l) => l.type === 'external')

  // Orders that overlap with the current week for a given line
  const getWeekOrders = (lineId: string) =>
    orders.filter(
      (o) =>
        o.line_id === lineId &&
        o.start_date !== null &&
        o.end_date !== null &&
        o.start_date! <= weekEnd &&
        o.end_date! >= weekStart,
    )

  const getActualQty = (orderId: string, day: string): number | undefined =>
    actuals.find((a) => a.order_id === orderId && a.date === day)?.actual_qty

  const handleBlur = async (order: Order, day: string, value: string) => {
    const qty = parseInt(value)
    if (isNaN(qty) || qty < 0) return
    if (!order.line_id) return
    const key = `${order.id}-${day}`
    setSaving(key)
    try {
      await onUpsert(order.id, order.line_id, day, qty)
    } finally {
      setSaving(null)
    }
  }

  const shiftWeek = (dir: 1 | -1) => setWeekMonday((d) => addDays(d, dir * 7))
  const goThisWeek = () => setWeekMonday(startOfWeek(new Date(), { weekStartsOn: 1 }))

  const isCurrentWeek = weekStart === getWeekBounds(new Date()).weekStart
  const weekLabel = `${format(parseISO(weekStart), 'd MMM', { locale: tr })} – ${format(parseISO(weekEnd), 'd MMM yyyy', { locale: tr })}`

  // Render all lines in a group (internal or external)
  const renderGroup = (group: Line[]) =>
    group.map((line) => {
      const lineOrders = getWeekOrders(line.id)
      return (
        <Fragment key={line.id}>
          {/* Line header row */}
          <tr className="bg-slate-50 border-b border-slate-200">
            <td colSpan={7} className="px-4 py-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">{line.name}</span>
                {lineOrders.length === 0 && (
                  <span className="text-xs text-slate-400 ml-1">— bu hafta sipariş yok</span>
                )}
              </div>
            </td>
          </tr>

          {/* Order sub-rows */}
          {lineOrders.map((order) => {
            let weekActual = 0
            let weekPlanned = 0
            weekDays.forEach((day) => {
              weekPlanned += calcPlannedQtyForDate(order, day)
              weekActual += getActualQty(order.id, day) ?? 0
            })
            const pct = weekPlanned > 0 ? Math.round((weekActual / weekPlanned) * 100) : 0

            return (
              <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                {/* Order label */}
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: order.color }}
                    />
                    <div>
                      <div className="text-xs font-medium text-slate-700 truncate max-w-36">
                        {order.brand}
                      </div>
                      <div className="text-xs text-slate-400 truncate max-w-36">
                        {order.style}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Day cells */}
                {weekDays.map((day) => {
                  const planned = calcPlannedQtyForDate(order, day)
                  const actualQty = getActualQty(order.id, day)
                  const cellKey = `${order.id}-${day}`
                  const isSaving = saving === cellKey
                  const isActive = planned > 0
                  const isPast = day < todayStr
                  const isToday = day === todayStr

                  if (!isActive) {
                    return (
                      <td
                        key={day}
                        className={`px-2 py-2 text-center ${isToday ? 'bg-blue-50/40' : ''}`}
                      >
                        <span className="text-slate-200 text-xs">—</span>
                      </td>
                    )
                  }

                  const hasActual = actualQty !== undefined
                  const isGreen = hasActual && actualQty >= planned
                  const isRed = isPast && (!hasActual || actualQty < planned)

                  return (
                    <td
                      key={day}
                      className={`px-2 py-1.5 text-center ${isToday ? 'bg-blue-50/40' : ''}`}
                    >
                      <div className="text-xs text-slate-400 mb-0.5">
                        {planned.toLocaleString()}
                      </div>
                      <input
                        key={`${cellKey}-${actualQty ?? 'none'}`}
                        type="number"
                        min="0"
                        defaultValue={actualQty ?? ''}
                        placeholder="—"
                        onBlur={(e) => handleBlur(order, day, e.target.value)}
                        className={`w-16 border rounded-md px-1.5 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-colors ${
                          isSaving
                            ? 'bg-yellow-50 border-yellow-300'
                            : isGreen
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                              : isRed
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      />
                    </td>
                  )
                })}

                {/* Weekly total */}
                <td className="px-3 py-2 text-center">
                  <div className="text-xs">
                    <span
                      className={
                        weekActual >= weekPlanned && weekPlanned > 0
                          ? 'text-emerald-600 font-semibold'
                          : 'text-slate-700'
                      }
                    >
                      {weekActual.toLocaleString()}
                    </span>
                    <span className="text-slate-300 mx-0.5">/</span>
                    <span className="text-slate-400">{weekPlanned.toLocaleString()}</span>
                  </div>
                  {weekPlanned > 0 && (
                    <div
                      className={`text-xs font-medium mt-0.5 ${
                        pct >= 100
                          ? 'text-emerald-600'
                          : pct >= 80
                            ? 'text-blue-500'
                            : 'text-slate-400'
                      }`}
                    >
                      %{pct}
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </Fragment>
      )
    })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-slate-200 flex-shrink-0">
        <button
          onClick={() => shiftWeek(-1)}
          className="text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 text-sm"
        >
          ← Önceki
        </button>
        <span className="text-sm font-medium text-slate-700 min-w-52 text-center">
          Hafta: {weekLabel}
        </span>
        <button
          onClick={() => shiftWeek(1)}
          className="text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 text-sm"
        >
          Sonraki →
        </button>
        {!isCurrentWeek && (
          <button
            onClick={goThisWeek}
            className="ml-2 text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1 rounded-full font-medium"
          >
            Bu Hafta
          </button>
        )}
      </div>

      {/* Weekly grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="border-b-2 border-slate-200">
              <th className="text-left px-4 py-2.5 font-medium text-slate-600 text-xs w-48 min-w-48 bg-white">
                Hat / Sipariş
              </th>
              {weekDays.map((day, i) => (
                <th
                  key={day}
                  className={`px-2 py-2.5 text-center text-xs min-w-28 ${
                    day === todayStr ? 'bg-blue-50 text-blue-600' : 'text-slate-600'
                  }`}
                >
                  <div className="font-semibold">{DAY_LABELS[i]}</div>
                  <div
                    className={`font-normal ${
                      day === todayStr ? 'text-blue-500' : 'text-slate-400'
                    }`}
                  >
                    {format(parseISO(day), 'd MMM', { locale: tr })}
                  </div>
                </th>
              ))}
              <th className="px-3 py-2.5 text-center text-xs font-medium text-slate-500 min-w-24 bg-white">
                Haftalık
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Dahili Hatlar section */}
            {internalLines.length > 0 && (
              <Fragment key="internal">
                <tr className="bg-slate-100 border-b border-slate-300">
                  <td
                    colSpan={7}
                    className="px-4 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    Dahili Hatlar
                  </td>
                </tr>
                {renderGroup(internalLines)}
              </Fragment>
            )}

            {/* Harici Hatlar section */}
            {externalLines.length > 0 && (
              <Fragment key="external">
                <tr className="bg-slate-100 border-b border-slate-300">
                  <td
                    colSpan={7}
                    className="px-4 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    Harici Hatlar
                  </td>
                </tr>
                {renderGroup(externalLines)}
              </Fragment>
            )}
          </tbody>
        </table>

        {sortedActiveLines.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">Hat bulunamadı.</div>
        )}
      </div>
    </div>
  )
}
