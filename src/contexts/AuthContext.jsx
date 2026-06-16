import React, { createContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import * as authService from '../services/auth.js'
import { setOnUnauthorized, getToken, isTokenExpired } from '../services/api.js'

export const AuthContext = createContext(null)

function useAuthProvider() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleLogout = useCallback(() => {
    authService.logout()
    setUser(null)
    setError(null)
    navigate('/login', { replace: true })
  }, [navigate])

  useEffect(() => {
    setOnUnauthorized(handleLogout)
  }, [handleLogout])

  useEffect(() => {
    const token = getToken()
    if (!token || isTokenExpired(token)) {
      authService.logout()
      setLoading(false)
      return
    }

    const stored = authService.getCurrentUser()
    if (stored) {
      setUser(stored)
    }

    authService
      .fetchMe()
      .then(setUser)
      .catch(() => {
        authService.logout()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    setError(null)
    try {
      const u = await authService.login(email, password)
      setUser(u)
      return u
    } catch (err) {
      const message = err?.message || 'Erro ao fazer login'
      setError(message)
      throw err
    }
  }, [])

  const register = useCallback(async (email, password, role, consents) => {
    setError(null)
    try {
      const u = await authService.register(email, password, role, consents)
      setUser(u)
      return u
    } catch (err) {
      const message = err?.message || 'Erro ao cadastrar'
      setError(message)
      throw err
    }
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
    setError(null)
    navigate('/login', { replace: true })
  }, [navigate])

  const clearError = useCallback(() => setError(null), [])

  return { user, loading, error, login, register, logout, clearError }
}

export function AuthProvider({ children }) {
  const value = useAuthProvider()

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
