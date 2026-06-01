import { useState, useEffect, useCallback } from 'react'
import * as patientService from '../services/patients.js'
import * as professionalService from '../services/professionals.js'

export function useMyPatientProfile(skip = false) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(!skip)
  const [error, setError] = useState(null)

  const fetchProfile = useCallback(async () => {
    if (skip) return
    setLoading(true)
    setError(null)
    try {
      const data = await patientService.getMyPatientProfile()
      setProfile(data)
    } catch (err) {
      if (err?.statusCode === 404) {
        try {
          const created = await patientService.createPatientProfile({})
          setProfile(created)
          setError(null)
        } catch {
          setError(err?.message || 'Perfil de paciente não encontrado')
          setProfile(null)
        }
      } else {
        setError(err?.message || 'Erro ao carregar perfil')
        setProfile(null)
      }
    } finally {
      setLoading(false)
    }
  }, [skip])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return { profile, loading, error, refetch: fetchProfile }
}

export function useMyProfessionalProfile(skip = false) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(!skip)
  const [error, setError] = useState(null)

  const fetchProfile = useCallback(async () => {
    if (skip) return
    setLoading(true)
    setError(null)
    try {
      const data = await professionalService.getMyProfessionalProfile()
      setProfile(data)
    } catch (err) {
      setError(err?.message || 'Erro ao carregar perfil')
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [skip])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return { profile, loading, error, refetch: fetchProfile }
}

export default { useMyPatientProfile, useMyProfessionalProfile }
