import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useDraggable } from '@dnd-kit/core'
import { differenceInDays, parseISO } from 'date-fns'
import type { Order } from '../../lib/supabase'
import { DAY_WIDTH, dateToOffset } from '../../lib/dateUtils'
import { workingDaysRemaining, calcDailyNeeded } from '../../lib/calculations'
import { useHolidayContext } from '../../contexts/HolidayContext'

interface Props {
  order: Order
  viewStart: Date
  totalActual: number
  onClick: (order: Order) => void
}

const TOOLTIP_WIDTH = 240
const TOOLTIP_HEIGHT_EST = 230
// Must match LINE_LABEL_WIDTH in GanttChart
const LABEL_COL_WIDTH = 144

export function GanttOrderBlock({ order, viewStart, totalActual, onClick }: Props) {
  const [isHovered, setIsHovered] = useState(false)
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; below: boolean } | null>(null)
  const blockRef = useRef<HTMLDivElement | null>(null)
  const textRef = useRef<HTMLDivElement | null>(null)

  const { holidaySet } = useHolidayContext()

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `block-${order.id}`,
    data: { type: 'block', order },
  })

  // Compute geometry unconditionally — hooks must run before any early returns.
  const hasNoDates = !order.start_date || !order.end_date
  const rawLeft = hasNoDates ? 0 : dateToOffset(order.start_date!, viewStart)
  const left = Math.max(0, rawLeft)
  const calendarDays = hasNoDates ? 0 : differenceInDays(parseISO(order.end_date!), parseISO(order.start_date!)) + 1
  const width = hasNoDates ? 0 : calendarDays * DAY_WIDTH + Math.min(0, rawLeft) - 2
  const visible = !hasNoDates && width > 0

  // Keep text visible at the left edge of the viewport as the block scrolls off-screen.
  // We update the text's `left` style imperatively (no React re-render) on every scroll.
  const applyTextOffset = (scrollLeft: number) => {
    if (!textRef.current || !visible) return
    // How far the viewport's left edge (after the label column) is from the block's left edge.
    const desired = scrollLeft + LABEL_COL_WIDTH + 8 - left
    const newLeft = Math.max(8, desired)
    // If there's less than 56px remaining for text (right:8 fixed), hide it — block is mostly off-screen.
    if (width - newLeft - 8 < 56) {
      textRef.current.style.visibility = 'hidden'
    } else {
      textRef.current.style.visibility = ''
      textRef.current.style.left = `${newLeft}px`
    }
  }

  // Apply immediately after each render (before paint) to avoid a flash.
  useLayoutEffect(() => {
    if (!visible) return
    const scrollEl = blockRef.current?.closest('.gantt-scroll') as HTMLElement | null
    if (scrollEl) applyTextOffset(scrollEl.scrollLeft)
  }, [left, width, visible]) // re-run whenever block position/size changes

  // Subscribe to scroll events (no React re-render — pure DOM update).
  useEffect(() => {
    if (!visible) return
    const scrollEl = blockRef.current?.closest('.gantt-scroll') as HTMLElement | null
    if (!scrollEl) return
    const onScroll = () => applyTextOffset(scrollEl.scrollLeft)
    scrollEl.addEventListener('scroll', onScroll, { passive: true })
    return () => scrollEl.removeEventListener('scroll', onScroll)
  }, [left, width, visible])

  // Safe to return null now — all hooks have been called unconditionally above.
  if (!visible) return null

  const pct = order.quantity > 0 ? Math.min(100, Math.round((totalActual / order.quantity) * 100)) : 0
  const remainingQty = Math.max(0, order.quantity - totalActual)
  const remDays = workingDaysRemaining(order.end_date!, holidaySet)
  const dailyNeeded = calcDailyNeeded(order.quantity, totalActual, order.end_date!, order.start_date ?? undefined, holidaySet)
  const isBehind = dailyNeeded > order.daily_capacity
  const isDone = pct >= 100

  const style: React.CSSProperties = {
    position: 'absolute',
    left,
    width,
    top: 6,
    height: 'calc(100% - 12px)',
    opacity: isDragging ? 0 : 1,
    zIndex: 10,
    cursor: 'grab',
  }

  const handleMouseEnter = () => {
    if (blockRef.current) {
      const rect = blockRef.current.getBoundingClientRect()
      const clampedLeft = Math.min(rect.left, window.innerWidth - TOOLTIP_WIDTH - 8)
      const below = rect.top < TOOLTIP_HEIGHT_EST + 8
      setTooltipPos({ top: below ? rect.bottom + 6 : rect.top - 6, left: clampedLeft, below })
    }
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setTooltipPos(null)
  }

  const showTooltip = isHovered && !isDragging && tooltipPos
  const monoStyle = { fontFamily: "'JetBrains Mono', monospace" }

  const tooltipEl = showTooltip ? (
    <div
      style={{
        position: 'fixed',
        top: tooltipPos.top,
        left: tooltipPos.left,
        transform: tooltipPos.below ? 'none' : 'translateY(-100%)',
        zIndex: 9999,
        width: TOOLTIP_WIDTH,
        pointerEvents: 'none',
        fontFamily: "'DM Sans', sans-serif",
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)',
        padding: '12px',
      }}
    >
      <div style={{ fontWeight: 700, color: '#111827', fontSize: '13px', lineHeight: 1.3 }}>{order.brand}</div>
      <div style={{ color: '#9ca3af', fontSize: '10px', marginBottom: '10px', marginTop: '2px', ...monoStyle }}>
        {order.style} · {order.days_needed}g
      </div>

      <div style={{ height: '3px', borderRadius: '2px', background: '#f3f4f6', marginBottom: '5px', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '2px', width: `${pct}%`, background: isDone ? '#10b981' : '#2563eb' }} />
      </div>
      <div style={{ fontSize: '10px', fontWeight: 600, marginBottom: '10px', color: isDone ? '#10b981' : '#6b7280', ...monoStyle }}>
        {isDone ? '✓ Tamamlandı' : `%${pct} tamamlandı`}
      </div>

      {[
        { label: 'Toplam sipariş', value: `${order.quantity.toLocaleString()} adet`, color: '#374151' },
        { label: 'Üretilen', value: `${totalActual.toLocaleString()} adet`, color: isDone ? '#10b981' : '#2563eb' },
        { label: 'Kalan', value: `${remainingQty.toLocaleString()} adet`, color: '#374151' },
      ].map(({ label, value, color }) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>{label}</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color, ...monoStyle }}>{value}</span>
        </div>
      ))}

      {!isDone && (
        <>
          <div style={{ borderTop: '1px solid #f3f4f6', margin: '8px 0' }} />
          {[
            { label: 'Kalan iş günü', value: `${remDays} gün`, color: '#374151' },
            { label: 'Gereken günlük', value: `${dailyNeeded.toLocaleString()} adet${isBehind ? ' ⚠' : ' ✓'}`, color: isBehind ? '#dc2626' : '#10b981' },
            { label: 'Plan kapasitesi', value: `${order.daily_capacity.toLocaleString()} adet/gün`, color: '#9ca3af' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>{label}</span>
              <span style={{ fontSize: '11px', fontWeight: 600, color, ...monoStyle }}>{value}</span>
            </div>
          ))}
        </>
      )}
    </div>
  ) : null

  return (
    <>
      <div
        ref={(el) => { setNodeRef(el); blockRef.current = el }}
        style={style}
        {...listeners}
        {...attributes}
        onClick={(e) => { e.stopPropagation(); onClick(order) }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="select-none"
      >
        <div className="rounded-md h-full w-full overflow-hidden relative">
          {/* Base color */}
          <div className="absolute inset-0 rounded-md" style={{ backgroundColor: order.color }} />
          {/* Depth gradient */}
          <div className="absolute inset-0 rounded-md" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.08) 100%)' }} />
          {/* Left accent bar */}
          <div className="absolute inset-y-0 left-0 rounded-l-md" style={{ width: '2px', background: 'rgba(255,255,255,0.4)' }} />
          {/* Progress bar at bottom */}
          {pct > 0 && (
            <div
              className="absolute bottom-0 left-0 rounded-bl-md"
              style={{ width: `${pct}%`, height: '2px', background: 'rgba(255,255,255,0.55)' }}
            />
          )}
          {/* Text — left offset updated imperatively to stay visible as block scrolls */}
          <div
            ref={textRef}
            className="absolute z-10 flex flex-col justify-center"
            style={{ top: 0, bottom: 0, right: 8, left: 8 }}
          >
            <div className="text-white font-semibold truncate leading-tight" style={{ fontSize: '11px', fontFamily: "'DM Sans', sans-serif" }}>{order.brand}</div>
            <div className="truncate leading-tight" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)', fontFamily: "'DM Sans', sans-serif" }}>{order.style}</div>
            {width > 92 && (
              <div className="truncate leading-tight font-mono-data" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
                {order.quantity.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {tooltipEl && createPortal(tooltipEl, document.body)}
    </>
  )
}
