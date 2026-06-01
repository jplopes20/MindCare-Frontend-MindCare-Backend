import { useState, useEffect, useCallback } from 'react'
import * as reportService from '../services/reports.js'

export function useProfessionalReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchReports = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await reportService.getMyReports()
      setReports(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || 'Erro ao carregar relatórios')
      setReports([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const create = useCallback(async (data) => {
    const report = await reportService.createReport(data)
    setReports((prev) => [report, ...prev])
    return report
  }, [])

  const update = useCallback(async (id, data) => {
    const updated = await reportService.updateReport(id, data)
    setReports((prev) => prev.map((r) => (r.id === id ? updated : r)))
    return updated
  }, [])

  const remove = useCallback(async (id) => {
    await reportService.deleteReport(id)
    setReports((prev) => prev.filter((r) => r.id !== id))
  }, [])

  return { reports, loading, error, refetch: fetchReports, create, update, remove }
}

export function useProfessionalSummary(pollInterval = 30000) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSummary = useCallback(async () => {
    try {
      const data = await reportService.getProfessionalSummary()
      setSummary(data)
      setError(null)
    } catch (err) {
      setError(err?.message || 'Erro ao carregar métricas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
    if (pollInterval > 0) {
      const id = setInterval(fetchSummary, pollInterval)
      return () => clearInterval(id)
    }
  }, [fetchSummary, pollInterval])

  return { summary, loading, error, refetch: fetchSummary }
}

export default { useProfessionalReports, useProfessionalSummary }
