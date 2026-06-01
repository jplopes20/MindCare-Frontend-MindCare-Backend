import { useState, useEffect, useCallback } from 'react'
import * as medicalRecordService from '../services/medicalRecords.js'

export function usePatientMedicalRecords(patientId) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchRecords = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    setError(null)
    try {
      const data = await medicalRecordService.getPatientMedicalRecords(patientId)
      setRecords(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || 'Erro ao carregar prontuários do paciente')
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  return { records, loading, error, refetch: fetchRecords }
}

export function useMedicalRecords(skip = false) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(!skip)
  const [error, setError] = useState(null)

  const fetchRecords = useCallback(async () => {
    if (skip) return
    setLoading(true)
    setError(null)
    try {
      const data = await medicalRecordService.getMyMedicalRecords()
      setRecords(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || 'Erro ao carregar prontuários')
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [skip])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  return { records, loading, error, refetch: fetchRecords }
}

export function useMedicalRecord(recordId) {
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(!!recordId)
  const [error, setError] = useState(null)

  const fetchRecord = useCallback(async () => {
    if (!recordId) return
    setLoading(true)
    setError(null)
    try {
      const data = await medicalRecordService.getMedicalRecord(recordId)
      setRecord(data)
    } catch (err) {
      setError(err?.message || 'Erro ao carregar prontuário')
      setRecord(null)
    } finally {
      setLoading(false)
    }
  }, [recordId])

  useEffect(() => {
    fetchRecord()
  }, [fetchRecord])

  return { record, loading, error, refetch: fetchRecord }
}

export default { useMedicalRecords, useMedicalRecord, usePatientMedicalRecords }
