import React, { useState, useEffect, useCallback } from 'react'
import * as adminService from '../services/admin.js'
import { useAdminMetrics } from '../hooks/useAdminMetrics.js'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const statusLabels = {
  requested: 'Solicitada',
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  rescheduled: 'Reagendada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  no_show: 'Não compareceu',
}

const statusColors = {
  requested: 'rgba(0, 212, 255, 0.7)',
  scheduled: 'rgba(15, 185, 177, 0.7)',
  confirmed: 'rgba(34, 197, 94, 0.7)',
  rescheduled: 'rgba(250, 204, 21, 0.7)',
  completed: 'rgba(59, 130, 246, 0.7)',
  cancelled: 'rgba(239, 68, 68, 0.7)',
  no_show: 'rgba(168, 162, 158, 0.7)',
}

function MetricsCards({ metrics }) {
  return (
    <div className="kpi-row">
      <div className="kpi-card">
        <strong>{metrics.totalPatients}</strong>
        <span style={{ fontSize: 12, opacity: 0.7 }}>Pacientes</span>
      </div>
      <div className="kpi-card">
        <strong>{metrics.totalProfessionals}</strong>
        <span style={{ fontSize: 12, opacity: 0.7 }}>Profissionais</span>
      </div>
      <div className="kpi-card">
        <strong>{metrics.totalAppointments}</strong>
        <span style={{ fontSize: 12, opacity: 0.7 }}>Consultas (total)</span>
      </div>
      <div className="kpi-card">
        <strong>{metrics.appointmentsLast30Days}</strong>
        <span style={{ fontSize: 12, opacity: 0.7 }}>Consultas (30d)</span>
      </div>
      <div className="kpi-card">
        <strong>{metrics.totalUsers}</strong>
        <span style={{ fontSize: 12, opacity: 0.7 }}>Usuários</span>
      </div>
    </div>
  )
}

function StatusChart({ appointmentsByStatus }) {
  const entries = Object.entries(appointmentsByStatus || {})
  const labels = entries.map(([key]) => statusLabels[key] || key)
  const values = entries.map(([, val]) => val)
  const colors = entries.map(([key]) => statusColors[key] || 'rgba(255,255,255,0.3)')

  const data = {
    labels,
    datasets: [
      {
        label: 'Consultas por status',
        data: values,
        backgroundColor: colors,
        borderColor: colors.map((c) => c.replace('0.7', '1')),
        borderWidth: 1,
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Consultas por Status', color: '#fff' },
    },
    scales: {
      x: { ticks: { color: 'rgba(255,255,255,0.7)' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: 'rgba(255,255,255,0.7)' }, grid: { color: 'rgba(255,255,255,0.05)' } },
    },
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <Bar data={data} options={options} />
    </div>
  )
}

function UsersTable() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const limit = 20

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getAdminUsers(page, limit)
      setUsers(data.users || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err?.message || 'Erro ao carregar usuários')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  async function handleDelete(id, email) {
    if (!window.confirm(`Excluir usuário "${email}" (ID ${id})? Esta ação é irreversível.`)) return
    try {
      await adminService.deleteUser(id)
      fetchUsers()
    } catch (err) {
      alert(err?.message || 'Erro ao excluir usuário')
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="card" style={{ marginTop: 16, overflow: 'auto' }}>
      <h3 style={{ marginTop: 0 }}>Usuários</h3>
      {loading && <div className="loading">Carregando...</div>}
      {error && <div className="error-box">{error}</div>}
      {!loading && !error && (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                <th style={{ padding: '8px 6px' }}>ID</th>
                <th style={{ padding: '8px 6px' }}>Email</th>
                <th style={{ padding: '8px 6px' }}>Role</th>
                <th style={{ padding: '8px 6px' }}>Criado em</th>
                <th style={{ padding: '8px 6px' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px 6px' }}>{u.id}</td>
                  <td style={{ padding: '8px 6px' }}>{u.email}</td>
                  <td style={{ padding: '8px 6px' }}>
                    <span className={`badge badge-${u.role}`}>{u.role}</span>
                  </td>
                  <td style={{ padding: '8px 6px', opacity: 0.7, fontSize: 12 }}>
                    {new Date(u.createdAt).toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 12, padding: '4px 10px', color: '#ff8a80' }}
                      onClick={() => handleDelete(u.id, u.email)}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
              <button
                className="btn-ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ opacity: page <= 1 ? 0.4 : 1 }}
              >
                Anterior
              </button>
              <span style={{ fontSize: 13, alignSelf: 'center' }}>
                Página {page} de {totalPages}
              </span>
              <button
                className="btn-ghost"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{ opacity: page >= totalPages ? 0.4 : 1 }}
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function DashboardAdmin() {
  const { metrics, loading, error, refetch } = useAdminMetrics()

  return (
    <div>
      <div className="welcome-header">
        <h2>Dashboard Administrativo</h2>
        <button className="btn-ghost" onClick={refetch} style={{ fontSize: 12 }}>
          Atualizar
        </button>
      </div>

      {loading && <div className="loading"><div className="loading-spinner" /><p>Carregando métricas...</p></div>}
      {error && <div className="error-box">{error}</div>}
      {metrics && (
        <>
          <MetricsCards metrics={metrics} />
          <StatusChart appointmentsByStatus={metrics.appointmentsByStatus} />
        </>
      )}

      <UsersTable />
    </div>
  )
}
