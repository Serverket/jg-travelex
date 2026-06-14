import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'

export function useApiUsageLogs() {
  const [stats, setStats] = useState({
    today: {},
    total: {},
    loading: true,
    error: null,
  })

  const fetchStats = useCallback(async () => {
    setStats((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const { data, error } = await supabase.rpc('get_api_usage_stats')
      if (error) throw error

      const today = {}
      const total = {}
      if (Array.isArray(data)) {
        data.forEach((row) => {
          today[row.service] = Number(row.today_count)
          total[row.service] = Number(row.total_count)
        })
      }

      setStats({ today, total, loading: false, error: null })
    } catch (err) {
      console.error('Failed to fetch API usage stats:', err)
      setStats((prev) => ({ ...prev, loading: false, error: err.message }))
    }
  }, [])

  const resetService = useCallback(async (service) => {
    try {
      const { error } = await supabase
        .from('api_usage_logs')
        .delete()
        .eq('service', service)
      if (error) throw error
      await fetchStats()
    } catch (err) {
      console.error('Failed to reset API usage:', err)
    }
  }, [fetchStats])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { ...stats, refresh: fetchStats, resetService }
}
