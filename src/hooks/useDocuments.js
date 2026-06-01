import { useState, useEffect, useCallback } from 'react'
import * as documentService from '../services/documents.js'

export function useMyDocuments() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await documentService.getMyDocuments()
      setDocuments(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || 'Erro ao carregar documentos')
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  return { documents, loading, error, refetch: fetchDocuments }
}

export function usePatientDocuments(patientId) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(!!patientId)
  const [error, setError] = useState(null)

  const fetchDocuments = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    setError(null)
    try {
      const data = await documentService.getPatientDocuments(patientId)
      setDocuments(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || 'Erro ao carregar documentos')
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  return { documents, loading, error, refetch: fetchDocuments }
}

export default { useMyDocuments, usePatientDocuments }
