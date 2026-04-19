import { useState, useEffect, useCallback } from 'react'
import { supabase, type Brand } from '../lib/supabase'

export function useBrands() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBrands = useCallback(async () => {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('sort_order')
      .order('created_at')
    if (!error) setBrands(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchBrands() }, [fetchBrands])

  const addBrand = useCallback(async (name: string) => {
    const maxOrder = brands.reduce((m, b) => Math.max(m, b.sort_order), 0)
    const { error } = await supabase
      .from('brands')
      .insert({ name, sort_order: maxOrder + 1 })
    if (error) throw error
    await fetchBrands()
  }, [brands, fetchBrands])

  const deleteBrand = useCallback(async (id: string) => {
    const { error } = await supabase.from('brands').delete().eq('id', id)
    if (error) throw error
    await fetchBrands()
  }, [fetchBrands])

  return { brands, loading, addBrand, deleteBrand }
}
