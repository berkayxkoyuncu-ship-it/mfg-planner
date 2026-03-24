import { useRef, useState, useCallback, useLayoutEffect } from 'react'
import {
  DndContext, DragOverlay, pointerWithin,
  PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent
} from '@dnd-kit/core'
import { format, addMonths, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns'
import type { Line, Order, DailyActual } from '../../lib/supabase'
import { buildDayCells, DAY_WIDTH, offsetToDate, defaultViewWindow } from '../../lib/dateUtils'
import { snapToWorkingDay, addWorkingDays, ordersOverlapRange } from '../../lib/calculations'
import { useHolidayContext } from '../../contexts/HolidayContext'
import { GanttRow } from './GanttRow'
import { UnassignedOrders } from './UnassignedOrders'

const LINE_LABEL_WIDTH = 144

// Explicit row heights so the label column and date column always align.
const MONTH_ROW_H = 25   // px — month label header row
const DAY_ROW_H = 22     // px — day number header row
const HEADER_H = MONTH_ROW_H + DAY_ROW_H
const SECTION_H = 33     // px — "DAHILI / HARICI HATLAR" divider row
// GanttRow uses h-14 = 56 px (enforced by Tailwind in GanttRow.tsx)

// ─── Label-column components (outside scroll container so they never disappear) ─────────────

function SectionLabelCell({ label, variant }: { label: string; variant: 'internal' | 'external' }) {
  return (
    <div
      style={{
        height: SECTION_H,
        background: '#f7f8fa',
        borderBottom: '1px solid #e5e7eb',
        borderLeft: `2px solid ${variant === 'internal' ? '#7c3aed' : '#059669'}`,
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <span style={{
        color: variant === 'internal' ? '#7c3aed' : '#059669',
        fontSize: '9px',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {label}
      </span>
    </div>
  )
}

function RowLabelCell({ name }: { name: string }) {
  return (
    <div
      style={{
        height: 56,
        borderBottom: '1px solid #f0f1f3',
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        background: '#ffffff',
      }}
    >
      <span style={{
        fontSize: '0.875rem',
        fontWeight: 500,
        color: '#374151',
        fontFamily: "'DM Sans', sans-serif",
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {name}
      </span>
    </div>
  )
}

// Spacer row in the DATE area that mirrors SectionLabelCell height/background.
function SectionDateDivider({ totalWidth }: { totalWidth: number }) {
  return (
    <div style={{
      height: SECTION_H,
      width: totalWidth,
      background: '#f7f8fa',
      borderBottom: '1px solid #e5e7eb',
      flexShrink: 0,
    }} />
  )
}

// ─── Main component ──────────────────────────────────────────────────────────────────────────

interface Props {
  lines: Line[]
  orders: Order[]
  actuals: DailyActual[]
  onOrderClick: (order: Order) => void
  onAddOrder: () => void
  onAssign: (orderId: string, lineId: string | null, startDate: string | null) => void
}

export function GanttChart({ lines, orders, actuals, onOrderClick, onAddOrder, onAssign }: Props) {
  const [viewStart, setViewStart] = useState(() => defaultViewWindow().viewStart)
  const [viewEnd, setViewEnd] = useState(() => defaultViewWindow().viewEnd)
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [dropError, setDropError] = useState<string | null>(null)

  const { holidays, holidaySet } = useHolidayContext()

  const scrollRef = useRef<HTMLDivElement>(null)
  /** Inner div of the label column — translated vertically to mirror gantt-scroll's scrollTop */
  const labelTranslateRef = useRef<HTMLDivElement>(null)

  const pendingTrimPxRef = useRef(0)
  const pendingAddPxRef = useRef(0)
  const pendingScrollToPxRef = useRef<number | null>(null)
  const isButtonNavRef = useRef(false)
  const viewStartRef = useRef(viewStart)
  const isScrollBusyRef = useRef(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const holidayMap = new Map(holidays.map(h => [h.date, h.name]))
  const dayCells = buildDayCells(viewStart, viewEnd, holidayMap)
  const totalWidth = dayCells.length * DAY_WIDTH
  const activeLines = lines.filter((l) => l.is_active)
  const internalLines = activeLines.filter((l) => l.type === 'internal')
  const externalLines = activeLines.filter((l) => l.type === 'external')

  const actualsMap = new Map<string, number>()
  for (const a of actuals) {
    actualsMap.set(a.order_id, (actualsMap.get(a.order_id) ?? 0) + a.actual_qty)
  }

  const unassigned = orders.filter((o) => !o.line_id)
  const assignedOrLine = (lineId: string) => orders.filter((o) => o.line_id === lineId)

  viewStartRef.current = viewStart

  const shiftMonth = (months: number) => {
    isButtonNavRef.current = true
    setViewStart((d) => startOfMonth(addMonths(d, months)))
    setViewEnd((d) => endOfMonth(addMonths(d, months)))
  }

  const goToToday = () => {
    const today = new Date()
    const monthStart = startOfMonth(today)
    const todayOffset = dateToOffset(format(today, 'yyyy-MM-dd'), monthStart)
    const clientWidth = scrollRef.current?.clientWidth ?? 0
    pendingScrollToPxRef.current = Math.max(0, todayOffset - clientWidth / 3)
    isButtonNavRef.current = true
    setViewStart(monthStart)
    setViewEnd(endOfMonth(addMonths(today, 2)))
  }

  /**
   * Symmetric sliding window — all three thresholds use the same EDGE (1080 px).
   * Trim is done in a single pass (multi-month) to avoid cascade re-renders.
   */
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return

    // Always sync label column vertical position (before busy check).
    if (labelTranslateRef.current) {
      labelTranslateRef.current.style.transform = `translateY(-${el.scrollTop}px)`
    }

    if (isScrollBusyRef.current) return

    const { scrollLeft, scrollWidth, clientWidth } = el
    const firstMonthPx = getDaysInMonth(viewStartRef.current) * DAY_WIDTH
    const EDGE = DAY_WIDTH * 30   // 1080 px

    if (scrollLeft + clientWidth >= scrollWidth - EDGE) {
      isScrollBusyRef.current = true
      setViewEnd((d) => endOfMonth(addMonths(d, 1)))
    } else if (scrollLeft < EDGE) {
      isScrollBusyRef.current = true
      pendingAddPxRef.current = getDaysInMonth(startOfMonth(addMonths(viewStartRef.current, -1))) * DAY_WIDTH
      setViewStart((d) => startOfMonth(addMonths(d, -1)))
    } else if (scrollLeft > firstMonthPx + EDGE) {
      // Multi-month trim: advance viewStart until post-trim scrollLeft is in safe range.
      isScrollBusyRef.current = true
      let trimDate = viewStartRef.current
      let totalTrimPx = 0
      let remainSL = scrollLeft
      let safety = 0
      while (remainSL > getDaysInMonth(trimDate) * DAY_WIDTH + EDGE && safety < 24) {
        const mPx = getDaysInMonth(trimDate) * DAY_WIDTH
        totalTrimPx += mPx
        remainSL -= mPx
        trimDate = startOfMonth(addMonths(trimDate, 1))
        safety++
      }
      pendingTrimPxRef.current = totalTrimPx
      setViewStart(() => trimDate)
    }
  }, [])

  useLayoutEffect(() => {
    isScrollBusyRef.current = false

    const trimPx = pendingTrimPxRef.current
    pendingTrimPxRef.current = 0
    if (trimPx > 0 && scrollRef.current) {
      scrollRef.current.scrollLeft -= trimPx
    }

    const addPx = pendingAddPxRef.current
    pendingAddPxRef.current = 0
    if (addPx > 0 && scrollRef.current) {
      scrollRef.current.scrollLeft += addPx
    }

    if (isButtonNavRef.current && scrollRef.current) {
      isScrollBusyRef.current = true
      const scrollTo = pendingScrollToPxRef.current ?? 0
      pendingScrollToPxRef.current = null
      scrollRef.current.scrollLeft = scrollTo
      isButtonNavRef.current = false
      requestAnimationFrame(() => {
        isScrollBusyRef.current = false
      })
    }
  }, [viewStart, viewEnd])

  const showError = (msg: string) => {
    setDropError(msg)
    setTimeout(() => setDropError(null), 3000)
  }

  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current
    if (data?.order) setActiveOrder(data.order)
  }

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveOrder(null)
    const { active, over } = event
    if (!over) return

    const activeData = active.data.current
    const overData = over.data.current
    const order: Order = activeData?.order
    if (!order) return

    if (overData?.type === 'row') {
      const lineId: string = overData.lineId

      const translatedLeft = event.active.rect.current.translated?.left ?? 0
      // gantt-scroll now contains only date cells (label column is a sibling div).
      // Its left edge IS the date area — no LINE_LABEL_WIDTH offset needed.
      const ganttRect = scrollRef.current?.getBoundingClientRect()
      const scrollLeft = scrollRef.current?.scrollLeft ?? 0

      let rawStart: string
      if (ganttRect) {
        const pixelOffset = translatedLeft - ganttRect.left + scrollLeft
        rawStart = offsetToDate(Math.max(0, pixelOffset), viewStart)
      } else if (order.start_date && order.line_id) {
        const currentOffset = (new Date(order.start_date).getTime() - viewStart.getTime()) / 86400000 * DAY_WIDTH
        rawStart = offsetToDate(Math.max(0, currentOffset + event.delta.x), viewStart)
      } else {
        rawStart = format(new Date(), 'yyyy-MM-dd')
      }

      const snappedStart = snapToWorkingDay(rawStart, holidaySet)
      const proposedEnd = addWorkingDays(snappedStart, order.days_needed, holidaySet)

      const conflicting = orders.find((o) =>
        o.id !== order.id &&
        o.line_id === lineId &&
        o.start_date && o.end_date &&
        ordersOverlapRange(snappedStart, proposedEnd, o.start_date, o.end_date)
      )

      if (conflicting) {
        showError(`Bu tarihte ${conflicting.brand} / ${conflicting.style} var — üst üste koyulamaz`)
        return
      }

      onAssign(order.id, lineId, snappedStart)
      return
    }

    if (overData?.type === 'unassigned-pool') {
      onAssign(order.id, null, null)
    }
  }, [viewStart, onAssign, orders])

  const monthGroups: { label: string; width: number }[] = []
  dayCells.forEach((cell) => {
    if (cell.monthLabel) {
      monthGroups.push({ label: cell.monthLabel, width: DAY_WIDTH })
    } else {
      monthGroups[monthGroups.length - 1].width += DAY_WIDTH
    }
  })

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full overflow-hidden" style={{ background: '#ffffff' }}>
        {/* Toolbar */}
        <div
          className="flex items-center gap-3 px-4 py-2 flex-shrink-0"
          style={{ background: '#ffffff', borderBottom: '1px solid #e5e7eb', height: '44px' }}
        >
          <button
            onClick={() => shiftMonth(-1)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all duration-150"
            style={{ color: '#6b7280', background: 'transparent', fontFamily: "'DM Sans', sans-serif" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#111827'; (e.currentTarget as HTMLElement).style.background = '#f3f4f6' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Önceki
          </button>
          <span
            className="text-center flex-1"
            style={{ color: '#374151', fontSize: '13px', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}
          >
            {format(viewStart, 'MMMM yyyy')} — {format(viewEnd, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => shiftMonth(1)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all duration-150"
            style={{ color: '#6b7280', background: 'transparent', fontFamily: "'DM Sans', sans-serif" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#111827'; (e.currentTarget as HTMLElement).style.background = '#f3f4f6' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            Sonraki
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2L8.5 6L4.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div style={{ width: '1px', height: '16px', background: '#e5e7eb', flexShrink: 0 }} />
          <button
            onClick={goToToday}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all duration-150"
            style={{ color: '#2563eb', background: '#eff6ff', fontFamily: "'DM Sans', sans-serif", border: '1px solid #bfdbfe' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#dbeafe' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#eff6ff' }}
          >
            Bugün
          </button>
        </div>

        {dropError && (
          <div
            className="px-4 py-2 text-xs flex items-center gap-2 flex-shrink-0"
            style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca', color: '#dc2626' }}
          >
            <span>⚠</span> {dropError}
          </div>
        )}

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          <UnassignedOrders orders={unassigned} onOrderClick={onOrderClick} onAddOrder={onAddOrder} />

          {/* Two-pane gantt: fixed label column + scrollable date area */}
          <div className="flex flex-1 overflow-hidden">

            {/* ── Fixed label column (never scrolls horizontally) ── */}
            <div
              className="flex flex-col flex-shrink-0 overflow-hidden"
              style={{
                width: LINE_LABEL_WIDTH,
                borderRight: '1px solid #e5e7eb',
                background: '#ffffff',
                zIndex: 20,
                position: 'relative',
              }}
            >
              {/* Header spacer — same height as the date header inside gantt-scroll */}
              <div
                className="flex-shrink-0"
                style={{
                  height: HEADER_H,
                  background: '#ffffff',
                  borderBottom: '1px solid #e5e7eb',
                }}
              />

              {/* Label rows — translated vertically by handleScroll to stay in sync */}
              <div
                ref={labelTranslateRef}
                style={{ flexShrink: 0, willChange: 'transform' }}
              >
                {internalLines.length > 0 && (
                  <>
                    <SectionLabelCell label="Dahili Hatlar" variant="internal" />
                    {internalLines.map((line) => (
                      <RowLabelCell key={line.id} name={line.name} />
                    ))}
                  </>
                )}
                {externalLines.length > 0 && (
                  <>
                    <SectionLabelCell label="Harici Hatlar" variant="external" />
                    {externalLines.map((line) => (
                      <RowLabelCell key={line.id} name={line.name} />
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* ── Scrollable date area ── */}
            <div
              className="flex-1 overflow-auto gantt-scroll"
              ref={scrollRef}
              onScroll={handleScroll}
            >
              {/* Date header — sticky to top, date cells only (no label area) */}
              <div
                className="sticky top-0 z-30"
                style={{ background: '#ffffff', borderBottom: '1px solid #e5e7eb' }}
              >
                {/* Month row */}
                <div className="flex" style={{ height: MONTH_ROW_H }}>
                  {monthGroups.map((m) => (
                    <div
                      key={m.label}
                      className="overflow-hidden whitespace-nowrap flex-shrink-0"
                      style={{
                        width: m.width,
                        borderRight: '1px solid #e5e7eb',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#374151',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {m.label}
                    </div>
                  ))}
                </div>
                {/* Day row */}
                <div className="flex" style={{ height: DAY_ROW_H }}>
                  {dayCells.map((cell) => (
                    <div
                      key={cell.date}
                      className="flex-shrink-0 text-center font-mono-data"
                      title={cell.holidayName || undefined}
                      style={{
                        width: DAY_WIDTH,
                        borderRight: '1px solid #f0f1f3',
                        padding: '3px 0',
                        fontSize: '10px',
                        fontWeight: cell.isToday ? 700 : 400,
                        color: cell.isHoliday ? '#dc2626' : cell.isToday ? '#1d4ed8' : cell.isWeekend ? '#d1d5db' : '#9ca3af',
                        background: cell.isHoliday ? '#fef2f2' : cell.isToday ? '#eff6ff' : cell.isWeekend ? '#f9fafb' : 'transparent',
                        borderTop: cell.isToday ? '2px solid #2563eb' : cell.isHoliday ? '2px solid #fecaca' : undefined,
                      }}
                    >
                      {cell.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Date rows — no label divs, aligned with label column */}
              <div>
                {internalLines.length > 0 && (
                  <>
                    <SectionDateDivider totalWidth={totalWidth} />
                    {internalLines.map((line) => (
                      <GanttRow
                        key={line.id}
                        line={line}
                        orders={assignedOrLine(line.id)}
                        dayCells={dayCells}
                        viewStart={viewStart}
                        actualsMap={actualsMap}
                        onOrderClick={onOrderClick}
                        onDrop={onAssign}
                        showLabel={false}
                      />
                    ))}
                  </>
                )}
                {externalLines.length > 0 && (
                  <>
                    <SectionDateDivider totalWidth={totalWidth} />
                    {externalLines.map((line) => (
                      <GanttRow
                        key={line.id}
                        line={line}
                        orders={assignedOrLine(line.id)}
                        dayCells={dayCells}
                        viewStart={viewStart}
                        actualsMap={actualsMap}
                        onOrderClick={onOrderClick}
                        onDrop={onAssign}
                        showLabel={false}
                      />
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeOrder && (
          <div
            className="rounded-lg px-3 py-2 text-white text-xs shadow-2xl"
            style={{
              backgroundColor: activeOrder.color,
              width: activeOrder.days_needed * DAY_WIDTH,
              opacity: 0.95,
              boxShadow: `0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)`,
            }}
          >
            <div className="font-semibold">{activeOrder.brand}</div>
            <div className="opacity-80">{activeOrder.style}</div>
            <div className="opacity-60 font-mono-data" style={{ fontSize: '10px' }}>{activeOrder.days_needed} iş günü</div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
