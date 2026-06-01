import { useState, useEffect, useCallback } from 'react'
import * as appointmentService from '../services/appointments.js'

export function useAppointments() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await appointmentService.getMyAppointments()
      setAppointments(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || 'Erro ao carregar consultas')
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  return { appointments, loading, error, refetch: fetchAppointments }
}

export function useAvailableSlots(professionalId, date) {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchSlots = useCallback(async () => {
    if (!professionalId || !date) return
    setLoading(true)
    setError(null)
    try {
      const data = await appointmentService.getAvailableSlots(professionalId, date)
      setSlots(data?.slots || [])
    } catch (err) {
      setError(err?.message || 'Erro ao carregar horários')
      setSlots([])
    } finally {
      setLoading(false)
    }
  }, [professionalId, date])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  return { slots, loading, error, refetch: fetchSlots }
}

export default { useAppointments, useAvailableSlots }
