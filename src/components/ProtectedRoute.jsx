import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

export function ProtectedRoute({ children, roles = [] }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Verificando autenticação...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    const home = user.role === 'professional' ? '/professional' : '/patient'
    return <Navigate to={home} replace />
  }

  return children
}

export default ProtectedRoute
