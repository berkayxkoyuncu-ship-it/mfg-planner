import { useDroppable, useDraggable } from '@dnd-kit/core'
import { format, parseISO } from 'date-fns'
import type { Order } from '../../lib/supabase'

interface UnassignedCardProps {
  order: Order
  onClick: (order: Order) => void
}

function UnassignedCard({ order, onClick }: UnassignedCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `unassigned-${order.id}`,
    data: { type: 'unassigned', order },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onClick(order)}
      className="cursor-grab active:cursor-grabbing select-none"
      style={{
        opacity: isDragging ? 0 : 1,
        borderRadius: '7px',
        border: '1px solid #e5e7eb',
        background: '#ffffff',
        padding: '9px 10px',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        fontFamily: "'DM Sans', sans-serif",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = '#bfdbfe'
        el.style.boxShadow = '0 2px 8px rgba(37,99,235,0.08)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = '#e5e7eb'
        el.style.boxShadow = 'none'
      }}
    >
      <div className="flex items-start gap-2">
        {/* Color indicator */}
        <div
          className="flex-shrink-0 rounded-sm mt-0.5"
          style={{ width: '3px', height: '36px', backgroundColor: order.color }}
        />
        <div className="min-w-0 flex-1">
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#111827', lineHeight: 1.3 }} className="truncate">{order.brand}</div>
          <div style={{ fontSize: '10px', color: '#6b7280', lineHeight: 1.4 }} className="truncate">{order.style}</div>
          <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px', fontFamily: "'JetBrains Mono', monospace" }}>
            {order.quantity.toLocaleString()} · {order.days_needed}g
          </div>
          {order.target_ship_date && (
            <div style={{ fontSize: '10px', color: '#9ca3af', fontFamily: "'JetBrains Mono', monospace" }}>
              ↗ {format(parseISO(order.target_ship_date), 'dd MMM')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface Props {
  orders: Order[]
  onOrderClick: (order: Order) => void
  onAddOrder: () => void
}

export function UnassignedOrders({ orders, onOrderClick, onAddOrder }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'unassigned-pool',
    data: { type: 'unassigned-pool' },
  })

  return (
    <div
      className="w-52 flex-shrink-0 flex flex-col"
      style={{ borderRight: '1px solid #e5e7eb', background: '#f7f8fa' }}
    >
      {/* Panel header */}
      <div
        className="px-3 flex items-center justify-between flex-shrink-0"
        style={{
          height: '44px',
          borderBottom: '1px solid #e5e7eb',
          background: '#ffffff',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Atanmamış
          </div>
          <div style={{ fontSize: '10px', color: '#9ca3af', fontFamily: "'JetBrains Mono', monospace" }}>
            {orders.length} sipariş
          </div>
        </div>
        <button
          onClick={onAddOrder}
          title="Yeni sipariş"
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 300,
            lineHeight: 1,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1d4ed8' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#2563eb' }}
        >
          +
        </button>
      </div>

      {/* Drop zone + cards */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto sidebar-scroll flex flex-col gap-1.5"
        style={{
          padding: '8px',
          background: isOver ? '#eff6ff' : '#f7f8fa',
          transition: 'background 0.15s',
        }}
      >
        {orders.length === 0 && (
          <div
            className="text-center py-8"
            style={{ fontSize: '11px', color: '#9ca3af', fontFamily: "'DM Sans', sans-serif" }}
          >
            Tüm siparişler atandı
          </div>
        )}
        {orders.map((order) => (
          <UnassignedCard key={order.id} order={order} onClick={onOrderClick} />
        ))}
      </div>
    </div>
  )
}
