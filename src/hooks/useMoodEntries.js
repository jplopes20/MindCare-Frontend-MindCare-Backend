import { useState, useEffect, useCallback, useRef } from 'react'
import * as emotionService from '../services/emotions.js'
import { getSocket } from '../services/socket.js'

export function useMoodEntries(days = 30) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const joinedPatientId = useRef(null)

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

  useEffect(() => {
    const socket = getSocket()

    const handleMoodUpdate = (log) => {
      setLogs((prev) => [log, ...prev])
    }

    socket.on('mood_entry_created', handleMoodUpdate)

    return () => {
      if (joinedPatientId.current) {
        socket.emit('leave_mood_room', { patientId: joinedPatientId.current })
      }
      socket.off('mood_entry_created', handleMoodUpdate)
    }
  }, [])

  const joinMoodRoom = useCallback((patientDbId) => {
    if (!patientDbId) return
    const socket = getSocket()
    if (joinedPatientId.current) {
      socket.emit('leave_mood_room', { patientId: joinedPatientId.current })
    }
    joinedPatientId.current = patientDbId
    socket.emit('join_mood_room', { patientId: patientDbId })
  }, [])

  const leaveMoodRoom = useCallback(() => {
    if (joinedPatientId.current) {
      const socket = getSocket()
      socket.emit('leave_mood_room', { patientId: joinedPatientId.current })
      joinedPatientId.current = null
    }
  }, [])

  return { logs, loading, error, refetch: fetchLogs, joinMoodRoom, leaveMoodRoom }
}
