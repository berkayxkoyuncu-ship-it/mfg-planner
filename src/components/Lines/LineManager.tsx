import { useState } from 'react'
import type { Line } from '../../lib/supabase'

interface Props {
  lines: Line[]
  onAdd: (name: string) => Promise<void>
  onUpdate: (id: string, patch: Partial<Pick<Line, 'name' | 'is_active'>>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function LineManager({ lines, onAdd, onUpdate, onDelete }: Props) {
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')

  const internalLines = lines.filter((l) => l.type === 'internal')
  const externalLines = lines.filter((l) => l.type === 'external')

  const handleAdd = async () => {
    if (!newName.trim()) { setError('Ad zorunludur'); return }
    setAdding(true); setError('')
    try { await onAdd(newName.trim()); setNewName('') }
    catch (e: any) { setError(e.message) }
    finally { setAdding(false) }
  }

  const startEdit = (line: Line) => { setEditingId(line.id); setEditName(line.name) }
  const saveEdit = async (id: string) => {
    if (!editName.trim()) return
    await onUpdate(id, { name: editName.trim() })
    setEditingId(null)
  }
  const toggleActive = async (line: Line) => onUpdate(line.id, { is_active: !line.is_active })
  const confirmDelete = async (line: Line) => {
    if (!confirm(`"${line.name}" silinsin mi? Bu hattaki siparişler atanmamış olacak.`)) return
    await onDelete(line.id)
  }

  const LineRow = ({ line }: { line: Line }) => (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-slate-100 ${!line.is_active ? 'opacity-50' : ''}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${line.type === 'internal' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
      {editingId === line.id ? (
        <input
          className="flex-1 border border-indigo-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(line.id); if (e.key === 'Escape') setEditingId(null) }}
          autoFocus
        />
      ) : (
        <span className="flex-1 text-sm text-slate-700">{line.name}</span>
      )}
      <div className="flex items-center gap-2">
        {editingId === line.id ? (
          <>
            <button onClick={() => saveEdit(line.id)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Kaydet</button>
            <button onClick={() => setEditingId(null)} className="text-xs text-slate-500 hover:text-slate-700">İptal</button>
          </>
        ) : (
          <>
            <button onClick={() => startEdit(line)} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100">
              Yeniden Adlandır
            </button>
            {line.type === 'external' && (
              <>
                <button
                  onClick={() => toggleActive(line)}
                  className={`text-xs px-2 py-1 rounded ${line.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}
                >
                  {line.is_active ? 'Pasifleştir' : 'Aktifleştir'}
                </button>
                <button onClick={() => confirmDelete(line)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">
                  Sil
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <h2 className="text-lg font-semibold text-slate-800 mb-6">Üretim Hatları</h2>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-sm font-medium text-slate-700">Dahili Hatlar</span>
            <span className="text-xs text-slate-400">({internalLines.length})</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Her zaman aktif. Yeniden adlandırabilirsiniz.</p>
        </div>
        {internalLines.map((line) => <LineRow key={line.id} line={line} />)}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-medium text-slate-700">Harici Hatlar</span>
            <span className="text-xs text-slate-400">({externalLines.filter((l) => l.is_active).length} aktif)</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Gerektiğinde ekleyip kaldırabilirsiniz. Pasif hatlar Gantt'ta gizlenir.</p>
        </div>
        {externalLines.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-slate-400">Henüz harici hat yok.</div>
        )}
        {externalLines.map((line) => <LineRow key={line.id} line={line} />)}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="text-sm font-medium text-slate-700 mb-3">Harici Hat Ekle</div>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="ör. Harici Hat A"
            value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button onClick={handleAdd} disabled={adding}
            className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60">
            {adding ? 'Ekleniyor…' : 'Ekle'}
          </button>
        </div>
        {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
      </div>
    </div>
  )
}
