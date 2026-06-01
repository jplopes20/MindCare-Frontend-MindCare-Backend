import { useState, useEffect, useCallback } from 'react'
import * as emotionService from '../services/emotions.js'

export function useMyEmotions(days = 7) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await emotionService.getMyEmotionLogs(days)
      setLogs(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || 'Erro ao carregar registros de humor')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return { logs, loading, error, refetch: fetchLogs }
}

export function usePatientEmotions(patientId, days = 7) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(!!patientId)
  const [error, setError] = useState(null)

  const fetchLogs = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    setError(null)
    try {
      const data = await emotionService.getPatientEmotionLogs(patientId, days)
      setLogs(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || 'Erro ao carregar registros de humor')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [patientId, days])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return { logs, loading, error, refetch: fetchLogs }
}

export default { useMyEmotions, usePatientEmotions }
