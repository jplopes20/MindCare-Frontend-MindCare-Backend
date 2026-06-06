import React from 'react'
import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { useAuth } from './hooks/useAuth.js'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './pages/Login'
import DashboardPatient from './pages/DashboardPatient'
import DashboardProfessional from './pages/DashboardProfessional'
import Teleconsulta from './pages/Teleconsulta'
import EHR from './pages/EHR'
import DashboardAdmin from './pages/DashboardAdmin'
import NotificationBell from './components/NotificationBell.jsx'
import NotificationsPage from './pages/NotificationsPage'

function Topbar() {
  const { user, logout } = useAuth()

  return (
    <header className="topbar">
      <div className="logo">MindCare</div>
      <nav className="mini-nav">
        {!user && <Link to="/login">Login</Link>}
        {user?.role === 'patient' && <Link to="/patient">Paciente</Link>}
        {user?.role === 'professional' && <Link to="/professional">Profissional</Link>}
        {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
        {(user?.role === 'patient' || user?.role === 'admin') && (
          <Link to="/teleconsulta">Teleconsulta</Link>
        )}
        {(user?.role === 'patient' || user?.role === 'professional' || user?.role === 'admin') && (
          <Link to="/ehr">Prontuário</Link>
        )}
        {user?.role === 'professional' && (
          <Link to="/teleconsulta">Teleconsulta</Link>
        )}
      </nav>
      <div style={{ marginLeft: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        {user && <NotificationBell />}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 13 }}>
              {user.name || user.email} — {user.role}
            </div>
            <button className="btn-ghost" onClick={logout}>
              Sair
            </button>
          </div>
        ) : null}
      </div>
    </header>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Carregando...</p>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public routes — redirect authenticated users to their dashboard */}
      <Route
        path="/login"
        element={
          user ? (
            <Navigate
              to={user.role === 'admin' ? '/admin' : user.role === 'professional' ? '/professional' : '/patient'}
              replace
            />
          ) : (
            <Login />
          )
        }
      />
      <Route path="/" element={<Login />} />

      {/* Patient routes */}
      <Route
        path="/patient/*"
        element={
          <ProtectedRoute roles={['patient', 'admin']}>
            <DashboardPatient />
          </ProtectedRoute>
        }
      />

      {/* Professional routes */}
      <Route
        path="/professional/*"
        element={
          <ProtectedRoute roles={['professional', 'admin']}>
            <DashboardProfessional />
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute roles={['admin']}>
            <DashboardAdmin />
          </ProtectedRoute>
        }
      />

      {/* Teleconsulta */}
      <Route
        path="/teleconsulta"
        element={
          <ProtectedRoute roles={['patient', 'professional', 'admin']}>
            <Teleconsulta />
          </ProtectedRoute>
        }
      />

      {/* EHR — patient, professional, or admin */}
      <Route
        path="/ehr"
        element={
          <ProtectedRoute roles={['patient', 'professional', 'admin']}>
            <EHR />
          </ProtectedRoute>
        }
      />

      {/* Notifications */}
      <Route
        path="/notifications"
        element={
          <ProtectedRoute roles={['patient', 'professional', 'admin']}>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <div className="app-root">
        <Topbar />
        <main>
          <AppRoutes />
        </main>
      </div>
    </AuthProvider>
  )
}
