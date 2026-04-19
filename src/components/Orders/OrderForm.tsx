import { useState } from 'react'
import type { Order, Line, Brand } from '../../lib/supabase'
import { calcDaysNeeded, calcEndDate } from '../../lib/calculations'
import { format } from 'date-fns'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#64748b', '#a855f7',
]

interface Props {
  order?: Order | null
  lines: Line[]
  brands: Brand[]
  onSave: (data: Partial<Order>) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}

export function OrderForm({ order, lines, brands, onSave, onDelete, onClose }: Props) {
  const [brand, setBrand] = useState(order?.brand ?? '')
  const [style, setStyle] = useState(order?.style ?? '')
  const [quantity, setQuantity] = useState(order?.quantity?.toString() ?? '')
  const [dailyCap, setDailyCap] = useState(order?.daily_capacity?.toString() ?? '')
  const [targetShip, setTargetShip] = useState(order?.target_ship_date ?? '')
  const [color, setColor] = useState(order?.color ?? PRESET_COLORS[0])
  const [status, setStatus] = useState<Order['status']>(order?.status ?? 'planned')
  const [anaMarka, setAnaMarka] = useState(order?.ana_marka ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const qty = parseInt(quantity) || 0
  const cap = parseInt(dailyCap) || 0
  const daysNeeded = calcDaysNeeded(qty, cap)
  const endDate = order?.start_date && daysNeeded > 0 ? calcEndDate(order.start_date, daysNeeded) : null

  const handleSave = async () => {
    if (!brand.trim()) { setError('Marka zorunludur'); return }
    if (!style.trim()) { setError('Model zorunludur'); return }
    if (qty <= 0) { setError("Miktar 0'dan büyük olmalıdır"); return }
    if (cap <= 0) { setError("Günlük kapasite 0'dan büyük olmalıdır"); return }
    setSaving(true); setError('')
    try {
      await onSave({ brand: brand.trim(), style: style.trim(), quantity: qty, daily_capacity: cap, target_ship_date: targetShip || null, color, status, ana_marka: anaMarka || null })
      onClose()
    } catch (e: any) {
      setError(e.message ?? 'Kayıt başarısız')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm('Bu sipariş silinsin mi? Bu işlem geri alınamaz.')) return
    setDeleting(true)
    try { await onDelete(); onClose() }
    catch (e: any) { setError(e.message ?? 'Silme başarısız') }
    finally { setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-800">
            {order ? 'Siparişi Düzenle' : 'Yeni Sipariş'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Ana MARKA</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={anaMarka}
              onChange={(e) => setAnaMarka(e.target.value)}
            >
              <option value="">— Seçiniz —</option>
              {brands.map((b) => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Marka *</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="ör. Nike"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Model / SKU *</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={style} onChange={(e) => setStyle(e.target.value)} placeholder="ör. Tişört XL"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Sipariş Miktarı *</label>
              <input
                type="number" min="1"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="5000"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Günlük Kapasite *</label>
              <input
                type="number" min="1"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={dailyCap} onChange={(e) => setDailyCap(e.target.value)} placeholder="500"
              />
            </div>
          </div>

          {daysNeeded > 0 && (
            <div className="bg-indigo-50 rounded-lg px-3 py-2 flex gap-4 text-sm">
              <div>
                <span className="text-indigo-400 text-xs">Gereken gün</span>
                <div className="font-semibold text-indigo-700">{daysNeeded}</div>
              </div>
              {order?.start_date && endDate && (
                <>
                  <div>
                    <span className="text-indigo-400 text-xs">Başlangıç</span>
                    <div className="font-semibold text-indigo-700">{format(new Date(order.start_date), 'dd MMM')}</div>
                  </div>
                  <div>
                    <span className="text-indigo-400 text-xs">Bitiş</span>
                    <div className="font-semibold text-indigo-700">{format(new Date(endDate), 'dd MMM')}</div>
                  </div>
                </>
              )}
              {order?.line_id && (
                <div>
                  <span className="text-indigo-400 text-xs">Hat</span>
                  <div className="font-semibold text-indigo-700">
                    {lines.find((l) => l.id === order.line_id)?.name ?? '—'}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Hedef Sevk Tarihi</label>
              <input
                type="date"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={targetShip} onChange={(e) => setTargetShip(e.target.value)}
              />
            </div>
            {order && (
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Durum</label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={status} onChange={(e) => setStatus(e.target.value as Order['status'])}
                >
                  <option value="planned">Planlandı</option>
                  <option value="in_progress">Devam Ediyor</option>
                  <option value="completed">Tamamlandı</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-2 block">Blok Rengi</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
        </div>

        <div className="flex items-center gap-3 mt-6">
          {order && onDelete && (
            <button
              onClick={handleDelete} disabled={deleting}
              className="text-sm text-red-600 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              {deleting ? 'Siliniyor…' : 'Sil'}
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50">
              İptal
            </button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60">
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
