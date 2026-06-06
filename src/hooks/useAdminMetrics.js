import { useState, useEffect, useCallback } from 'react'
import * as adminService from '../services/admin.js'

export function useAdminMetrics() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getAdminMetrics()
      setMetrics(data)
    } catch (err) {
      setError(err?.message || 'Erro ao carregar métricas')
      setMetrics(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  return { metrics, loading, error, refetch: fetchMetrics }
}
