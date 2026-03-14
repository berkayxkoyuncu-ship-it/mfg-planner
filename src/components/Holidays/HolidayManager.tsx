import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useHolidayContext } from '../../contexts/HolidayContext'

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']

export function HolidayManager() {
  const { holidays, addHoliday, removeHoliday, loading } = useHolidayContext()
  const [showAdd, setShowAdd] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Group holidays by year
  const byYear = holidays.reduce<Record<number, typeof holidays>>((acc, h) => {
    const year = parseInt(h.date.slice(0, 4))
    if (!acc[year]) acc[year] = []
    acc[year].push(h)
    return acc
  }, {})
  const years = Object.keys(byYear).map(Number).sort()

  const handleAdd = async () => {
    if (!newDate) { setAddError('Tarih seçiniz'); return }
    if (!newName.trim()) { setAddError('Tatil adı giriniz'); return }
    setSubmitting(true)
    setAddError(null)
    const err = await addHoliday(newDate, newName.trim())
    setSubmitting(false)
    if (err) { setAddError(err); return }
    setNewDate('')
    setNewName('')
    setShowAdd(false)
  }

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        overflow: 'hidden',
        margin: '0 0 16px 0',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: showAdd ? '1px solid #e5e7eb' : undefined,
          background: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827', fontFamily: "'DM Sans', sans-serif" }}>
            Tatiller
          </span>
          <span style={{
            fontSize: '10px',
            fontWeight: 600,
            color: '#9ca3af',
            fontFamily: "'JetBrains Mono', monospace",
            background: '#f3f4f6',
            borderRadius: '4px',
            padding: '1px 5px',
          }}>
            {holidays.length}
          </span>
        </div>
        <button
          onClick={() => { setShowAdd(v => !v); setAddError(null) }}
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            background: showAdd ? '#f3f4f6' : '#2563eb',
            color: showAdd ? '#374151' : '#ffffff',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'DM Sans', sans-serif",
          }}
          title={showAdd ? 'İptal' : 'Tatil ekle'}
        >
          {showAdd ? '×' : '+'}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f7f8fa' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', fontWeight: 500, color: '#6b7280', fontFamily: "'DM Sans', sans-serif" }}>
                Tarih
              </label>
              <input
                type="date"
                value={newDate}
                onChange={e => { setNewDate(e.target.value); setAddError(null) }}
                style={{
                  border: `1px solid ${addError && !newDate ? '#fca5a5' : '#e5e7eb'}`,
                  borderRadius: '6px',
                  padding: '5px 8px',
                  fontSize: '12px',
                  fontFamily: "'JetBrains Mono', monospace",
                  color: '#374151',
                  background: '#ffffff',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '180px' }}>
              <label style={{ fontSize: '10px', fontWeight: 500, color: '#6b7280', fontFamily: "'DM Sans', sans-serif" }}>
                Ad
              </label>
              <input
                type="text"
                value={newName}
                onChange={e => { setNewName(e.target.value); setAddError(null) }}
                placeholder="Örn. Ulusal Egemenlik ve Çocuk Bayramı"
                onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                style={{
                  border: `1px solid ${addError && !newName.trim() ? '#fca5a5' : '#e5e7eb'}`,
                  borderRadius: '6px',
                  padding: '5px 8px',
                  fontSize: '12px',
                  fontFamily: "'DM Sans', sans-serif",
                  color: '#374151',
                  background: '#ffffff',
                  outline: 'none',
                }}
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={submitting}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: submitting ? 'default' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                opacity: submitting ? 0.7 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {submitting ? 'Ekleniyor…' : 'Ekle'}
            </button>
          </div>
          {addError && (
            <div style={{ marginTop: '6px', fontSize: '11px', color: '#dc2626', fontFamily: "'DM Sans', sans-serif" }}>
              {addError}
            </div>
          )}
        </div>
      )}

      {/* Holiday list */}
      {loading ? (
        <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '12px', fontFamily: "'DM Sans', sans-serif" }}>
          Yükleniyor…
        </div>
      ) : holidays.length === 0 ? (
        <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '12px', fontFamily: "'DM Sans', sans-serif" }}>
          Henüz tatil eklenmemiş
        </div>
      ) : (
        <div>
          {years.map(year => (
            <div key={year}>
              {/* Year group header */}
              <div style={{
                padding: '6px 16px',
                fontSize: '10px',
                fontWeight: 600,
                color: '#9ca3af',
                letterSpacing: '0.08em',
                background: '#f7f8fa',
                borderBottom: '1px solid #f0f1f3',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {year}
              </div>
              {byYear[year].map((holiday, idx) => {
                const date = parseISO(holiday.date)
                const dayName = DAY_NAMES[date.getDay()]
                const formattedDate = format(date, 'd MMMM yyyy', { locale: tr })
                const isLast = idx === byYear[year].length - 1 && year === years[years.length - 1]
                return (
                  <div
                    key={holiday.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 16px',
                      borderBottom: isLast ? 'none' : '1px solid #f0f1f3',
                      gap: '12px',
                    }}
                  >
                    {/* Holiday indicator */}
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#fca5a5',
                      flexShrink: 0,
                    }} />
                    {/* Date */}
                    <span style={{
                      fontSize: '11px',
                      fontFamily: "'JetBrains Mono', monospace",
                      color: '#374151',
                      minWidth: '120px',
                      flexShrink: 0,
                    }}>
                      {formattedDate}
                    </span>
                    {/* Day name */}
                    <span style={{
                      fontSize: '10px',
                      color: '#9ca3af',
                      fontFamily: "'DM Sans', sans-serif",
                      minWidth: '72px',
                      flexShrink: 0,
                    }}>
                      {dayName}
                    </span>
                    {/* Name */}
                    <span style={{
                      fontSize: '12px',
                      color: '#374151',
                      fontFamily: "'DM Sans', sans-serif",
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {holiday.name}
                    </span>
                    {/* Delete */}
                    <button
                      onClick={() => removeHoliday(holiday.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#d1d5db',
                        fontSize: '14px',
                        lineHeight: 1,
                        padding: '2px 4px',
                        borderRadius: '4px',
                        flexShrink: 0,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#d1d5db')}
                      title="Sil"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
