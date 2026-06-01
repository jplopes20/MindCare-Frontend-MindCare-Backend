import { useState, useEffect, useCallback } from 'react'
import * as patientService from '../services/patients.js'

export function usePatients() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPatients = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await patientService.getPatients()
      setPatients(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || 'Erro ao carregar pacientes')
      setPatients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  return { patients, loading, error, refetch: fetchPatients }
}

export function usePatient(patientId) {
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(!!patientId)
  const [error, setError] = useState(null)

  const fetchPatient = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    setError(null)
    try {
      const data = await patientService.getPatient(patientId)
      setPatient(data)
    } catch (err) {
      setError(err?.message || 'Erro ao carregar paciente')
      setPatient(null)
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchPatient()
  }, [fetchPatient])

  return { patient, loading, error, refetch: fetchPatient }
}

export default { usePatients, usePatient }
