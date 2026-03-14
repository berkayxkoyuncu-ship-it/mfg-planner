import { useState, useEffect, useCallback } from 'react'
import { supabase, type Line } from '../lib/supabase'

export function useLines() {
  const [lines, setLines] = useState<Line[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLines = useCallback(async () => {
    const { data, error } = await supabase
      .from('lines')
      .select('*')
      .order('sort_order')
    if (error) setError(error.message)
    else setLines(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchLines() }, [fetchLines])

  const addLine = useCallback(async (name: string) => {
    const maxOrder = lines.reduce((m, l) => Math.max(m, l.sort_order), 0)
    const { error } = await supabase
      .from('lines')
      .insert({ name, type: 'external', sort_order: maxOrder + 1, is_active: true })
    if (error) throw error
    await fetchLines()
  }, [lines, fetchLines])

  const updateLine = useCallback(async (id: string, patch: Partial<Pick<Line, 'name' | 'is_active'>>) => {
    const { error } = await supabase.from('lines').update(patch).eq('id', id)
    if (error) throw error
    await fetchLines()
  }, [fetchLines])

  const deleteLine = useCallback(async (id: string) => {
    const { error } = await supabase.from('lines').delete().eq('id', id)
    if (error) throw error
    await fetchLines()
  }, [fetchLines])

  return { lines, loading, error, refetch: fetchLines, addLine, updateLine, deleteLine }
}
