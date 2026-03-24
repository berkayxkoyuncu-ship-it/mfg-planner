import { useDroppable } from '@dnd-kit/core'
import type { Line, Order } from '../../lib/supabase'
import type { DayCell } from '../../lib/dateUtils'
import { DAY_WIDTH } from '../../lib/dateUtils'
import { GanttOrderBlock } from './GanttOrderBlock'

interface Props {
  line: Line
  orders: Order[]
  dayCells: DayCell[]
  viewStart: Date
  actualsMap: Map<string, number>
  onOrderClick: (order: Order) => void
  onDrop: (orderId: string, lineId: string, startDate: string) => void
  /** When false, the 144 px label cell is omitted (used in two-pane layout) */
  showLabel?: boolean
}

export function GanttRow({ line, orders, dayCells, viewStart, actualsMap, onOrderClick, showLabel = true }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `row-${line.id}`,
    data: { type: 'row', lineId: line.id },
  })

  const totalWidth = dayCells.length * DAY_WIDTH

  return (
    <div className="flex" style={{ borderBottom: '1px solid #f0f1f3' }}>
      {showLabel && (
        <div
          className="w-36 min-w-36 flex-shrink-0 px-3 flex items-center"
          style={{ background: '#ffffff', borderRight: '1px solid #e5e7eb' }}
        >
          <span
            className="text-sm font-medium truncate"
            style={{ color: '#374151', fontFamily: "'DM Sans', sans-serif" }}
          >
            {line.name}
          </span>
        </div>
      )}

      {/* Drop zone + cells */}
      <div
        ref={setNodeRef}
        className={`relative h-14 flex-shrink-0 ${isOver ? 'drop-active' : ''}`}
        style={{
          width: totalWidth,
          minWidth: totalWidth,
          background: isOver ? '#eff6ff' : '#ffffff',
          transition: 'background 0.1s',
        }}
      >
        {/* Day columns */}
        {dayCells.map((cell, i) => (
          <div
            key={cell.date}
            className="absolute top-0 bottom-0"
            style={{
              left: i * DAY_WIDTH,
              width: DAY_WIDTH,
              borderRight: `1px solid ${cell.isHoliday ? '#fca5a5' : cell.isToday ? '#93c5fd' : cell.isWeekend ? '#d1d5db' : '#e5e7eb'}`,
              background: cell.isHoliday
                ? '#fde8e8'
                : cell.isToday
                ? '#dbeafe'
                : cell.isWeekend
                ? '#e8eaed'
                : '#ffffff',
            }}
          />
        ))}

        {/* Order blocks */}
        {orders.map((order) => (
          <GanttOrderBlock
            key={order.id}
            order={order}
            viewStart={viewStart}
            totalActual={actualsMap.get(order.id) ?? 0}
            onClick={onOrderClick}
          />
        ))}
      </div>
    </div>
  )
}
