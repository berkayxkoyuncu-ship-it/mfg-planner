import { useState } from 'react'
import { useBrands } from '../../hooks/useBrands'

export function BrandManager() {
  const { brands, loading, addBrand, deleteBrand } = useBrands()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleAdd = async () => {
    if (!newName.trim()) { setAddError('Marka adı boş olamaz'); return }
    if (brands.some(b => b.name.toLowerCase() === newName.trim().toLowerCase())) {
      setAddError('Bu marka zaten mevcut'); return
    }
    setSubmitting(true)
    setAddError(null)
    try {
      await addBrand(newName.trim())
      setNewName('')
      setShowAdd(false)
    } catch (e: any) {
      setAddError(e.message ?? 'Eklenemedi')
    } finally {
      setSubmitting(false)
    }
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
            Ana Markalar
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
            {brands.length}
          </span>
        </div>
        <button
          onClick={() => { setShowAdd(v => !v); setAddError(null); setNewName('') }}
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
          title={showAdd ? 'İptal' : 'Marka ekle'}
        >
          {showAdd ? '×' : '+'}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f7f8fa' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <label style={{ fontSize: '10px', fontWeight: 500, color: '#6b7280', fontFamily: "'DM Sans', sans-serif" }}>
                Marka Adı
              </label>
              <input
                type="text"
                value={newName}
                onChange={e => { setNewName(e.target.value); setAddError(null) }}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                placeholder="Örn. Levis"
                style={{
                  border: `1px solid ${addError ? '#fca5a5' : '#e5e7eb'}`,
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

      {/* Brand list */}
      {loading ? (
        <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '12px', fontFamily: "'DM Sans', sans-serif" }}>
          Yükleniyor…
        </div>
      ) : brands.length === 0 ? (
        <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '12px', fontFamily: "'DM Sans', sans-serif" }}>
          Henüz marka eklenmemiş
        </div>
      ) : (
        <div>
          {brands.map((brand, idx) => (
            <div
              key={brand.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 16px',
                borderBottom: idx < brands.length - 1 ? '1px solid #f0f1f3' : 'none',
                gap: '12px',
              }}
            >
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#93c5fd',
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: '12px',
                color: '#374151',
                fontFamily: "'DM Sans', sans-serif",
                flex: 1,
              }}>
                {brand.name}
              </span>
              <button
                onClick={() => deleteBrand(brand.id)}
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
          ))}
        </div>
      )}
    </div>
  )
}
