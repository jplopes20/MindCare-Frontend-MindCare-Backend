import { useState, useEffect, useCallback, useRef } from 'react'
import * as professionalService from '../services/professionals.js'

export function useProfessionalPatients(skip = false) {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(!skip)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const debounceRef = useRef(null)

  const fetchPatients = useCallback(async (search) => {
    setLoading(true)
    setError(null)
    try {
      let data
      if (search) {
        data = await professionalService.getAllPatients(search)
      } else {
        data = await professionalService.getMyPatients()
      }
      setPatients(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || 'Erro ao carregar pacientes')
      setPatients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (skip) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      fetchPatients(searchTerm)
    }, searchTerm ? 300 : 0)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [skip, searchTerm, fetchPatients])

  const refetch = useCallback(() => {
    fetchPatients(searchTerm)
  }, [fetchPatients, searchTerm])

  return { patients, loading, error, searchTerm, setSearchTerm, refetch }
}

export default { useProfessionalPatients }
