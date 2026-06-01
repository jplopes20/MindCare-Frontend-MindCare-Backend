import React, { useState, useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { useAppointments } from '../hooks/useAppointments.js'
import { useMyDocuments } from '../hooks/useDocuments.js'
import { useMyPatientProfile } from '../hooks/useMyProfile.js'
import { updatePatientProfile } from '../services/patients.js'
import { useMoodEntries } from '../hooks/useMoodEntries.js'
import * as appointmentService from '../services/appointments.js'
import * as documentService from '../services/documents.js'
import EmotionDiary from '../components/EmotionDiary.jsx'
import MoodChart from '../components/MoodChart.jsx'
import AppointmentBooker from '../components/AppointmentBooker.jsx'
import DocumentUploader from '../components/DocumentUploader.jsx'

function Sidebar({ patientId }) {
  return (
    <div className="sidebar">
      <Link className="nav-item" to="/patient?section=dashboard">Dashboard</Link>
      <Link className="nav-item" to="/patient?section=profile">Perfil</Link>
      <Link className="nav-item" to={patientId ? `/ehr?patientId=${patientId}` : '/patient?section=ehr'}>Prontuário</Link>
      <Link className="nav-item" to="/patient?section=appointments">Agendamentos</Link>
      <Link className="nav-item" to={`/teleconsulta${patientId ? `?patientId=${patientId}` : ''}`}>Teleconsulta</Link>
      <Link className="nav-item" to="/patient?section=documents">Documentos</Link>
      <Link className="nav-item" to="/patient?section=emotions">Diário das Emoções</Link>
    </div>
  )
}

export default function DashboardPatient() {
  const { user } = useAuth()
  const { profile: patient, loading: loadingPatient, error: patientError } = useMyPatientProfile()
  const { appointments, loading: loadingAppts, error: apptsError, refetch: refetchAppts } = useAppointments()
  const { documents, loading: loadingDocs, error: docsError, refetch: refetchDocs } = useMyDocuments()
  const { logs: emotionLogs, loading: loadingMood, joinMoodRoom, leaveMoodRoom } = useMoodEntries()
  const loc = useLocation()
  const qs = new URLSearchParams(loc.search)
  const section = qs.get('section')
  const [showBooker, setShowBooker] = useState(false)
  const [cancellingId, setCancellingId] = useState(null)
  const [cancelMsg, setCancelMsg] = useState(null)

  const patientId = patient?.id

  const uniqueMoodDays = useMemo(() => {
    if (!Array.isArray(emotionLogs) || emotionLogs.length === 0) return 0
    const days = new Set(
      emotionLogs.map((l) => {
        const d = new Date(l.createdAt)
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      }),
    )
    return days.size
  }, [emotionLogs])

  useEffect(() => {
    if (patientId) {
      joinMoodRoom(patientId)
    }
    return () => {
      leaveMoodRoom()
    }
  }, [patientId, joinMoodRoom, leaveMoodRoom])

  function ProfileView() {
    const [form, setForm] = useState({ name: '', cpf: '', phone: '', dateOfBirth: '' })
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState(null)

    useEffect(() => {
      if (patient) {
        setForm({
          name: patient.name || '',
          cpf: patient.cpf || '',
          phone: patient.phone || '',
          dateOfBirth: patient.dateOfBirth
            ? new Date(patient.dateOfBirth).toISOString().split('T')[0]
            : '',
        })
      }
    }, [patient])

    async function handleSave() {
      setSaving(true)
      setMsg(null)
      try {
        const body = {
          name: form.name || undefined,
          cpf: form.cpf || undefined,
          phone: form.phone || undefined,
          dateOfBirth: form.dateOfBirth
            ? new Date(form.dateOfBirth).toISOString()
            : undefined,
        }
        await updatePatientProfile(body)
        setMsg({ type: 'success', text: 'Perfil atualizado com sucesso!' })
      } catch (err) {
        setMsg({ type: 'error', text: err?.message || 'Erro ao salvar' })
      } finally {
        setSaving(false)
      }
    }

    return (
      <div className="card">
        <h3>Meu Perfil</h3>
        <div className="form-group">
          <label>Nome</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Seu nome completo" />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input defaultValue={user?.email || ''} readOnly />
        </div>
        <div className="form-group">
          <label>CPF</label>
          <input value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} placeholder="Apenas números, 11 dígitos" maxLength={11} />
        </div>
        <div className="form-group">
          <label>Telefone</label>
          <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(XX) XXXXX-XXXX" />
        </div>
        <div className="form-group">
          <label>Data de Nascimento</label>
          <input type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} />
        </div>
        {msg && (
          <div style={{ color: msg.type === 'error' ? '#ff8a80' : '#0fb9b1', fontSize: 13, marginTop: 8 }}>
            {msg.text}
          </div>
        )}
        <button className="btn" onClick={handleSave} disabled={saving} style={{ marginTop: 12 }}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    )
  }

  async function handleCancel(appointmentId) {
    setCancellingId(appointmentId)
    setCancelMsg(null)
    try {
      await appointmentService.cancelAppointment(appointmentId, 'Cancelado pelo paciente')
      setCancelMsg({ type: 'success', text: 'Consulta cancelada com sucesso.' })
      refetchAppts()
    } catch (err) {
      setCancelMsg({ type: 'error', text: err?.message || 'Erro ao cancelar' })
    } finally {
      setCancellingId(null)
    }
  }

  function AppointmentsView() {
    const statusColors = {
      requested: { bg: 'rgba(232,169,23,0.15)', color: '#e8a917' },
      scheduled: { bg: 'rgba(15,185,177,0.15)', color: '#0fb9b1' },
      confirmed: { bg: 'rgba(46,125,50,0.15)', color: '#4caf50' },
      rescheduled: { bg: 'rgba(255,138,61,0.15)', color: '#ff8a3d' },
      completed: { bg: 'rgba(46,125,50,0.15)', color: '#66bb6a' },
      cancelled: { bg: 'rgba(198,40,40,0.15)', color: '#ef9a9a' },
      no_show: { bg: 'rgba(255,152,0,0.15)', color: '#ffb74d' },
    }
    const statusLabels = {
      requested: 'Solicitada',
      scheduled: 'Agendada',
      confirmed: 'Confirmada',
      rescheduled: 'Reagendada',
      completed: 'Concluída',
      cancelled: 'Cancelada',
      no_show: 'Não compareceu',
    }

    const [chatAppointmentId, setChatAppointmentId] = useState(null)

    if (loadingAppts) return <div className="loading">Carregando consultas...</div>
    if (apptsError) return <div className="error-box">{apptsError}</div>
    return (
      <>
        {cancelMsg && (
          <div style={{ color: cancelMsg.type === 'error' ? '#ff8a80' : '#0fb9b1', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: cancelMsg.type === 'error' ? 'rgba(255,138,128,0.1)' : 'rgba(15,185,177,0.1)', borderRadius: 8 }}>
            {cancelMsg.text}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Meus Agendamentos</h3>
          <button className="btn" onClick={() => setShowBooker(true)} style={{ fontSize: 13 }}>
            + Nova Consulta
          </button>
        </div>

        {showBooker && (
          <AppointmentBooker
            onClose={() => setShowBooker(false)}
            onSuccess={() => refetchAppts()}
          />
        )}

        {appointments.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 24 }}>
            <p style={{ opacity: 0.6 }}>Nenhuma consulta agendada.</p>
            <p style={{ fontSize: 12, opacity: 0.4, marginTop: 4 }}>
              Clique em "+ Nova Consulta" para agendar.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {appointments.map((a) => {
              const sc = statusColors[a.status] || statusColors.requested
              const sl = statusLabels[a.status] || a.status
              const canCancel = ['requested', 'scheduled', 'confirmed'].includes(a.status)
              const past = new Date(a.scheduledStartTime) < new Date()

              return (
                <div key={a.id} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <strong>{a.professional?.user?.name || a.professional?.user?.email || 'Profissional'}</strong>
                      {a.professional?.specialty?.name && (
                        <span style={{ fontSize: 12, opacity: 0.6 }}>({a.professional.specialty.name})</span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.8 }}>
                      {new Date(a.scheduledStartTime).toLocaleString('pt-BR')}
                      {a.status === 'rescheduled' && a.proposedStartTime && (
                        <div style={{ color: '#ff8a3d', fontSize: 12, marginTop: 2 }}>
                          Proposta: {new Date(a.proposedStartTime).toLocaleString('pt-BR')}
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.color, fontWeight: 600 }}>
                        {sl}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {a.status === 'rescheduled' && !past && (
                      <>
                        <button
                          className="btn"
                          onClick={async () => {
                            try {
                              await appointmentService.acceptReschedule(a.id)
                              refetchAppts()
                            } catch (err) {
                              alert(err?.message || 'Erro ao aceitar')
                            }
                          }}
                          style={{ fontSize: 11, padding: '6px 12px' }}
                        >
                          Aceitar novo horário
                        </button>
                        <button
                          className="btn-ghost"
                          onClick={async () => {
                            const reason = prompt('Motivo da recusa (opcional):')
                            try {
                              await appointmentService.rejectReschedule(a.id, reason || '')
                              refetchAppts()
                            } catch (err) {
                              alert(err?.message || 'Erro ao recusar')
                            }
                          }}
                          style={{ fontSize: 11, padding: '6px 12px', color: '#ff8a80', borderColor: 'rgba(239,154,154,0.3)' }}
                        >
                          Recusar
                        </button>
                      </>
                    )}
                    {canCancel && !past && (
                      <button
                        className="btn-ghost"
                        onClick={() => handleCancel(a.id)}
                        disabled={cancellingId === a.id}
                        style={{ fontSize: 12, color: '#ef9a9a', borderColor: 'rgba(239,154,154,0.3)', whiteSpace: 'nowrap' }}
                      >
                        {cancellingId === a.id ? 'Cancelando...' : 'Cancelar'}
                      </button>
                    )}
                    <button
                      className="btn-ghost"
                      onClick={() => setChatAppointmentId(chatAppointmentId === a.id ? null : a.id)}
                      style={{ fontSize: 11, padding: '4px 8px' }}
                    >
                      Chat
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {chatAppointmentId && (
          <div style={{ marginTop: 16 }}>
            <AppointmentChat
              appointmentId={chatAppointmentId}
              currentUserId={user?.id}
              currentUserName={user?.name || user?.email}
              onClose={() => setChatAppointmentId(null)}
            />
          </div>
        )}
      </>
    )
  }

  function DocumentsView() {
    const [filter, setFilter] = useState('active')
    const [archivingId, setArchivingId] = useState(null)
    const [actionMsg, setActionMsg] = useState(null)
    const [showUploader, setShowUploader] = useState(false)

    const filtered = documents.filter((d) =>
      filter === 'active' ? !d.isArchived : d.isArchived,
    )

    async function handleToggleArchive(doc) {
      setArchivingId(doc.id)
      setActionMsg(null)
      try {
        const newState = !doc.isArchived
        await documentService.toggleDocumentArchive(doc.id, newState)
        setActionMsg({
          type: 'success',
          text: newState ? 'Documento arquivado.' : 'Documento restaurado.',
        })
        refetchDocs()
      } catch (err) {
        setActionMsg({ type: 'error', text: err?.message || 'Erro ao arquivar documento' })
      } finally {
        setArchivingId(null)
      }
    }

    if (loadingDocs) return <div className="loading">Carregando documentos...</div>

    return (
      <div className="card">
        <h3>Documentos</h3>

        {docsError && (
          <div style={{ color: '#ff8a80', fontSize: 13, marginBottom: 12 }}>
            {docsError}
          </div>
        )}

        {actionMsg && (
          <div
            style={{
              color: actionMsg.type === 'error' ? '#ff8a80' : '#0fb9b1',
              fontSize: 13,
              marginBottom: 12,
              padding: '8px 12px',
              background:
                actionMsg.type === 'error'
                  ? 'rgba(255,138,128,0.1)'
                  : 'rgba(15,185,177,0.1)',
              borderRadius: 8,
            }}
          >
            {actionMsg.text}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn"
              onClick={() => setFilter('active')}
              style={{
                background: filter === 'active' ? '#0fb9b1' : 'transparent',
                color: filter === 'active' ? '#fff' : '#4a5568',
                border: '1px solid #0fb9b1',
                fontSize: 12,
                padding: '6px 14px',
              }}
            >
              Ativos
            </button>
            <button
              className="btn"
              onClick={() => setFilter('archived')}
              style={{
                background: filter === 'archived' ? '#0fb9b1' : 'transparent',
                color: filter === 'archived' ? '#fff' : '#4a5568',
                border: '1px solid #0fb9b1',
                fontSize: 12,
                padding: '6px 14px',
              }}
            >
              Arquivados
            </button>
          </div>
          <button
            className="btn"
            onClick={() => { setShowUploader(!showUploader); setActionMsg(null) }}
            style={{
              fontSize: 12,
              padding: '6px 14px',
              background: showUploader ? 'transparent' : undefined,
              color: showUploader ? '#ff8a3d' : '#052b2a',
              border: showUploader ? '1px solid #ff8a3d' : 'none',
            }}
          >
            {showUploader ? 'Cancelar' : '+ Upload'}
          </button>
        </div>

        {showUploader && (
          <DocumentUploader
            onClose={() => setShowUploader(false)}
            onSuccess={() => { setShowUploader(false); refetchDocs() }}
            patientId={patientId}
          />
        )}

        {filtered.length === 0 ? (
          <p style={{ opacity: 0.6, textAlign: 'center', padding: 16 }}>
            {filter === 'active'
              ? 'Nenhum documento ativo.'
              : 'Nenhum documento arquivado.'}
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {filtered.map((d) => (
              <li
                key={d.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div>
                  <strong>{d.title || d.name || 'Sem título'}</strong>
                  <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
                    {d.documentType || ''}
                    {d.createdAt && (
                      <> — {new Date(d.createdAt).toLocaleDateString('pt-BR')}</>
                    )}
                  </div>
                  {d.fileUrl && (
                    <a
                      href={d.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, opacity: 0.7 }}
                    >
                      Abrir arquivo
                    </a>
                  )}
                </div>
                <button
                  className="btn-ghost"
                  onClick={() => handleToggleArchive(d)}
                  disabled={archivingId === d.id}
                  style={{
                    fontSize: 12,
                    color: d.isArchived ? '#0fb9b1' : '#ff8a65',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {archivingId === d.id
                    ? '...'
                    : d.isArchived
                      ? 'Restaurar'
                      : 'Arquivar'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  function DashboardView() {
    return (
      <>
        <div className="kpi-row">
          <div className="kpi-card"><strong>{appointments.length}</strong> Consultas</div>
          <div className="kpi-card"><strong>{documents.length}</strong> Documentos</div>
          <div className="kpi-card"><strong>{uniqueMoodDays}</strong> Dias de humor</div>
        </div>
        <MoodChart logs={emotionLogs} loading={loadingMood} />
        <div className="card">
          <h3>Resumo Clínico</h3>
          <p>Paciente: {patient?.name || patient?.user?.name || user?.email || `#${patient?.id}`}</p>
          {patient?.dateOfBirth && (
            <p style={{ fontSize: 13, opacity: 0.7 }}>Nascimento: {new Date(patient.dateOfBirth).toLocaleDateString('pt-BR')}</p>
          )}
        </div>
      </>
    )
  }

  function EmotionsView() {
    return (
      <>
        <div className="card">
          <h3>Diário das Emoções</h3>
          <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 16 }}>
            Registre como você está se sentindo para acompanhar sua evolução emocional.
          </p>
        </div>
        <EmotionDiary />
        <MoodChart logs={emotionLogs} loading={loadingMood} />
      </>
    )
  }

  if (loadingPatient) {
    return (
      <div className="layout">
        <Sidebar patientId={null} />
        <div className="main-panel"><div className="loading">Carregando...</div></div>
      </div>
    )
  }

  if (patientError) {
    return (
      <div className="layout">
        <Sidebar patientId={null} />
        <div className="main-panel"><div className="error-box">{patientError}</div></div>
      </div>
    )
  }

  return (
    <div className="layout">
      <Sidebar patientId={patientId} />
      <div className="main-panel">
        <div className="welcome-header">
          <h2>Olá, {user?.name || user?.email || 'Paciente'}</h2>
          <Link className="btn" to={`/teleconsulta${patientId ? `?patientId=${patientId}` : ''}`}>
            Iniciar Teleconsulta
          </Link>
        </div>

        {(!section || section === 'dashboard') && <DashboardView />}
        {section === 'profile' && <ProfileView />}
        {section === 'appointments' && <AppointmentsView />}
        {section === 'documents' && <DocumentsView />}
        {section === 'emotions' && <EmotionsView />}
      </div>
    </div>
  )
}
