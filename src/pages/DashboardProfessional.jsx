import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { useAppointments } from '../hooks/useAppointments.js'
import { useProfessionalPatients } from '../hooks/useProfessionalPatients.js'
import { useProfessionalReports, useProfessionalSummary } from '../hooks/useProfessionalReports.js'
import * as appointmentService from '../services/appointments.js'
import * as professionalService from '../services/professionals.js'
import AppointmentChat from '../components/AppointmentChat.jsx'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

function Sidebar() {
  return (
    <div className="sidebar">
      <Link className="nav-item" to="/professional?section=dashboard">Dashboard</Link>
      <Link className="nav-item" to="/professional?section=agenda">Agenda</Link>
      <Link className="nav-item" to="/professional?section=patients">Pacientes</Link>
      <Link className="nav-item" to="/ehr">Prontuários</Link>
      <Link className="nav-item" to="/professional?section=reports">Relatórios</Link>
    </div>
  )
}

function MiniCalendar() {
  const days = []
  for (let i = 0; i < 14; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    days.push(d)
  }
  return (
    <div className="mini-cal">
      {days.map((d, i) => (
        <div key={i} className={`cal-day${i === 0 ? ' today' : ''}`}>
          <div className="cal-num">{d.getDate()}</div>
          <div className="cal-name">{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</div>
        </div>
      ))}
    </div>
  )
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

function AppointmentCard({ appointment, onOpenEHR, onConfirm, onReschedule, onChat, chatOpen }) {
  const status = appointment.status || 'requested'
  return (
    <li style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 0',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div>
        <strong>{appointment.patient?.user?.name || appointment.patient?.user?.email || `Paciente #${appointment.patientId}`}</strong>
        <br />
        <span style={{ fontSize: 12 }}>
          {new Date(appointment.scheduledStartTime).toLocaleString('pt-BR')}
        </span>
        {appointment.scheduledEndTime && (
          <span style={{ fontSize: 12, opacity: 0.6, marginLeft: 8 }}>
            → {new Date(appointment.scheduledEndTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        {status === 'rescheduled' && (
          <div style={{ fontSize: 11, color: '#ff8a3d', marginTop: 2 }}>
            Proposta enviada — aguardando resposta do paciente
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontSize: 11,
          padding: '2px 8px',
          borderRadius: 10,
          fontWeight: 600,
          background: status === 'requested' ? 'rgba(232,169,23,0.15)' :
            status === 'confirmed' ? 'rgba(15,185,177,0.15)' :
            status === 'rescheduled' ? 'rgba(255,138,61,0.15)' :
            status === 'cancelled' ? 'rgba(198,40,40,0.15)' :
            status === 'completed' ? 'rgba(46,125,50,0.15)' : 'rgba(255,255,255,0.08)',
          color: status === 'requested' ? '#e8a917' :
            status === 'confirmed' ? '#0fb9b1' :
            status === 'rescheduled' ? '#ff8a3d' :
            status === 'cancelled' ? '#ef9a9a' :
            status === 'completed' ? '#66bb6a' : '#fff',
        }}>
          {statusLabels[status] || status}
        </span>
        {appointment.patient && (
          <button className="btn-ghost" onClick={() => onOpenEHR(appointment.patient.id)} style={{ fontSize: 11 }}>
            Prontuário
          </button>
        )}
        {(status === 'requested' || status === 'rescheduled') && (
          <>
            <button className="btn" onClick={() => onConfirm(appointment.id)} style={{ fontSize: 11, padding: '4px 10px' }}>
              Confirmar
            </button>
            <button className="btn-ghost" onClick={() => onReschedule(appointment)} style={{ fontSize: 11, padding: '4px 10px' }}>
              Reagendar
            </button>
          </>
        )}
        {status !== 'cancelled' && (
          <button className="btn-ghost" onClick={() => onChat(appointment.id)} style={{ fontSize: 11, padding: '4px 8px' }}>
            {chatOpen ? 'Fechar Chat' : 'Chat'}
          </button>
        )}
      </div>
    </li>
  )
}

export default function DashboardProfessional() {
  const { user } = useAuth()
  const { appointments, loading: loadingAppts, error: apptsError, refetch: refetchAppts } = useAppointments()
  const { patients, loading: loadingPatients, error: patientsError, refetch: refetchPatients } = useProfessionalPatients()
  const { reports, loading: loadingReports, error: reportsError, refetch: refetchReports, create: createReport, update: updateReport, remove: deleteReport } = useProfessionalReports()
  const { summary, loading: loadingSummary, error: summaryError } = useProfessionalSummary(30000)
  const nav = useNavigate()
  const loc = useLocation()
  const qs = new URLSearchParams(loc.search)
  const section = qs.get('section')

  const sortedAppointments = useMemo(() => {
    if (!Array.isArray(appointments)) return []
    return [...appointments].sort(
      (a, b) => new Date(b.scheduledStartTime) - new Date(a.scheduledStartTime),
    )
  }, [appointments])

  const weeklyCounts = useMemo(() => {
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const counts = [0, 0, 0, 0, 0, 0, 0]
    if (!Array.isArray(appointments)) return { labels: dayNames, counts }
    appointments.forEach((a) => {
      const d = new Date(a.scheduledStartTime)
      const dow = d.getDay()
      counts[dow] = (counts[dow] || 0) + 1
    })
    return { labels: dayNames, counts }
  }, [appointments])

  function PatientsView() {
    const [showLinkModal, setShowLinkModal] = useState(false)
    const [linkSearch, setLinkSearch] = useState('')
    const [linkResults, setLinkResults] = useState([])
    const [searching, setSearching] = useState(false)

    useEffect(() => {
      if (!showLinkModal || !linkSearch.trim()) {
        setLinkResults([])
        return
      }
      const t = setTimeout(async () => {
        setSearching(true)
        try {
          const data = await professionalService.getAllPatients(linkSearch)
          setLinkResults(Array.isArray(data) ? data : [])
        } catch {
          setLinkResults([])
        } finally {
          setSearching(false)
        }
      }, 300)
      return () => clearTimeout(t)
    }, [linkSearch, showLinkModal])

    async function handleLink(patientId) {
      try {
        await professionalService.linkPatient(patientId)
        setShowLinkModal(false)
        setLinkSearch('')
        refetchPatients()
      } catch (err) {
        alert(err?.message || 'Erro ao vincular paciente')
      }
    }

    if (loadingPatients) return <div className="loading">Carregando pacientes...</div>
    if (patientsError) return <div className="error-box">{patientsError}</div>
    return (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Pacientes</h3>
          <button className="btn" onClick={() => setShowLinkModal(true)} style={{ fontSize: 12, padding: '6px 14px' }}>
            + Vincular Paciente
          </button>
        </div>
        {patients.length === 0 ? (
          <p style={{ opacity: 0.7 }}>Nenhum paciente vinculado. Clique em "Vincular Paciente" para adicionar ou agende uma consulta para criar vínculo automaticamente.</p>
        ) : (
          <ul>
            {patients.map((p) => (
              <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{p.user?.name || p.user?.email || `Paciente #${p.id}`}</strong>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Nasc: {p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : '—'}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-ghost" onClick={() => nav(`/ehr?patientId=${p.id}`)}>Prontuário</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {showLinkModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000,
          }} onClick={() => setShowLinkModal(false)}>
            <div style={{
              background: '#1a202c', borderRadius: 12, padding: 24,
              maxWidth: 480, width: '90%', maxHeight: '80vh', overflow: 'auto',
            }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginTop: 0 }}>Vincular Paciente</h3>
              <input
                type="text"
                placeholder="Buscar paciente por nome ou CPF..."
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  marginBottom: 16,
                }}
              />
              {searching && <p style={{ opacity: 0.6 }}>Buscando...</p>}
              {!searching && linkSearch && linkResults.length === 0 && (
                <p style={{ opacity: 0.6 }}>Nenhum paciente encontrado.</p>
              )}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {linkResults.map((p) => (
                  <li key={p.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div>
                      <strong>{p.user?.name || p.user?.email || `#${p.id}`}</strong>
                      {p.cpf && <div style={{ fontSize: 12, opacity: 0.6 }}>CPF: {p.cpf}</div>}
                    </div>
                    <button className="btn" onClick={() => handleLink(p.id)} style={{ fontSize: 11, padding: '4px 12px' }}>
                      Vincular
                    </button>
                  </li>
                ))}
              </ul>
              <button className="btn-ghost" onClick={() => setShowLinkModal(false)} style={{ marginTop: 12, width: '100%' }}>
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  function AgendaView() {
    const [chatAppointmentId, setChatAppointmentId] = useState(null)
    const [rescheduling, setRescheduling] = useState(null)
    const [rescheduleDate, setRescheduleDate] = useState('')
    const [rescheduleTime, setRescheduleTime] = useState('')
    const [rescheduleMsg, setRescheduleMsg] = useState('')

    if (loadingAppts) return <div className="loading">Carregando agenda...</div>
    if (apptsError) return <div className="error-box">{apptsError}</div>

    const pending = sortedAppointments.filter((a) => a.status === 'requested')
    const rescheduled = sortedAppointments.filter((a) => a.status === 'rescheduled')
    const future = sortedAppointments.filter((a) => ['scheduled', 'confirmed'].includes(a.status))
    const past = sortedAppointments.filter((a) => ['completed', 'cancelled', 'no_show'].includes(a.status))

    async function handleConfirm(id) {
      try {
        await appointmentService.confirmAppointment(id)
        refetchAppts()
      } catch (err) {
        alert(err?.message || 'Erro ao confirmar')
      }
    }

    function openReschedule(apt) {
      setRescheduling(apt)
      setRescheduleDate('')
      setRescheduleTime('')
      setRescheduleMsg('')
    }

    async function handleRescheduleSubmit() {
      if (!rescheduling || !rescheduleDate || !rescheduleTime) {
        alert('Selecione data e horário')
        return
      }
      const startTime = new Date(`${rescheduleDate}T${rescheduleTime}:00`)
      const endTime = new Date(startTime)
      endTime.setMinutes(endTime.getMinutes() + 30)

      try {
        await appointmentService.rescheduleAppointment(rescheduling.id, {
          scheduledStartTime: startTime.toISOString(),
          scheduledEndTime: endTime.toISOString(),
          message: rescheduleMsg.trim() || undefined,
        })
        setRescheduling(null)
        refetchAppts()
      } catch (err) {
        alert(err?.message || 'Erro ao reagendar')
      }
    }

    return (
      <div>
        {pending.length > 0 && (
          <div className="card" style={{ border: '1px solid rgba(232,169,23,0.3)', marginBottom: 16 }}>
            <h3 style={{ color: '#e8a917' }}>Solicitações Pendentes ({pending.length})</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {pending.map((a) => (
                <AppointmentCard
                  key={a.id}
                  appointment={a}
                  onOpenEHR={(pid) => nav(`/ehr?patientId=${pid}`)}
                  onConfirm={handleConfirm}
                  onReschedule={openReschedule}
                  onChat={(id) => setChatAppointmentId(chatAppointmentId === id ? null : id)}
                  chatOpen={chatAppointmentId === a.id}
                />
              ))}
            </ul>
          </div>
        )}

        {rescheduled.length > 0 && (
          <div className="card" style={{ border: '1px solid rgba(255,138,61,0.3)', marginBottom: 16 }}>
            <h3 style={{ color: '#ff8a3d' }}>Aguardando Resposta do Paciente ({rescheduled.length})</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {rescheduled.map((a) => (
                <AppointmentCard
                  key={a.id}
                  appointment={a}
                  onOpenEHR={(pid) => nav(`/ehr?patientId=${pid}`)}
                  onConfirm={handleConfirm}
                  onReschedule={openReschedule}
                  onChat={(id) => setChatAppointmentId(chatAppointmentId === id ? null : id)}
                  chatOpen={chatAppointmentId === a.id}
                />
              ))}
            </ul>
          </div>
        )}

        <div className="card">
          <h3>Próximas Consultas</h3>
          {future.length === 0 && pending.length === 0 ? (
            <p>Nenhuma consulta futura.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {future.map((a) => (
                <AppointmentCard
                  key={a.id}
                  appointment={a}
                  onOpenEHR={(pid) => nav(`/ehr?patientId=${pid}`)}
                  onConfirm={handleConfirm}
                  onReschedule={openReschedule}
                  onChat={(id) => setChatAppointmentId(chatAppointmentId === id ? null : id)}
                  chatOpen={chatAppointmentId === a.id}
                />
              ))}
            </ul>
          )}

          {past.length > 0 && (
            <>
              <h3 style={{ marginTop: 24 }}>Consultas Anteriores</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {past.map((a) => (
                  <AppointmentCard
                    key={a.id}
                    appointment={a}
                    onOpenEHR={(pid) => nav(`/ehr?patientId=${pid}`)}
                    onConfirm={handleConfirm}
                    onReschedule={openReschedule}
                    onChat={(id) => setChatAppointmentId(chatAppointmentId === id ? null : id)}
                    chatOpen={chatAppointmentId === a.id}
                  />
                ))}
              </ul>
            </>
          )}
        </div>

        {rescheduling && (
          <div className="card" style={{ marginTop: 16, border: '1px solid rgba(255,138,61,0.4)' }}>
            <h3 style={{ color: '#ff8a3d' }}>Propor Novo Horário</h3>
            <p style={{ fontSize: 13, opacity: 0.7 }}>
              Paciente: {rescheduling.patient?.user?.name || `#${rescheduling.patientId}`}
            </p>
            <div className="form-group">
              <label>Nova Data</label>
              <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Novo Horário</label>
              <input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Mensagem (opcional)</label>
              <textarea
                value={rescheduleMsg}
                onChange={(e) => setRescheduleMsg(e.target.value)}
                placeholder="Explique o motivo do reagendamento..."
                rows={2}
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'transparent',
                  color: '#fff',
                  resize: 'vertical',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn" onClick={handleRescheduleSubmit}>Enviar Proposta</button>
              <button className="btn-ghost" onClick={() => setRescheduling(null)}>Cancelar</button>
            </div>
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
      </div>
    )
  }

  function ReportsView() {
    const [editing, setEditing] = useState(null)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ title: '', periodStart: '', periodEnd: '', observations: '' })
    const [saving, setSaving] = useState(false)

    function resetForm() {
      setForm({ title: '', periodStart: '', periodEnd: '', observations: '' })
      setEditing(null)
      setShowForm(false)
    }

    function startEdit(report) {
      setForm({
        title: report.title,
        periodStart: report.periodStart ? report.periodStart.slice(0, 16) : '',
        periodEnd: report.periodEnd ? report.periodEnd.slice(0, 16) : '',
        observations: report.observations || '',
      })
      setEditing(report)
      setShowForm(true)
    }

    async function handleSave(e) {
      e.preventDefault()
      if (!form.title.trim()) return
      setSaving(true)
      try {
        const payload = {
          title: form.title.trim(),
          observations: form.observations.trim() || undefined,
        }
        if (form.periodStart) payload.periodStart = new Date(form.periodStart).toISOString()
        if (form.periodEnd) payload.periodEnd = new Date(form.periodEnd).toISOString()
        if (editing) {
          await updateReport(editing.id, payload)
        } else {
          await createReport(payload)
        }
        resetForm()
      } catch (err) {
        alert(err?.message || 'Erro ao salvar relatório')
      } finally {
        setSaving(false)
      }
    }

    async function handleDelete(id) {
      if (!window.confirm('Tem certeza que deseja excluir este relatório?')) return
      try {
        await deleteReport(id)
      } catch (err) {
        alert(err?.message || 'Erro ao excluir relatório')
      }
    }

    return (
      <div>
        <div className="kpi-row" style={{ marginBottom: 16 }}>
          <div className="kpi-card"><strong>{summary?.totalPatients ?? patients.length}</strong> Pacientes</div>
          <div className="kpi-card"><strong>{summary?.totalAppointments ?? appointments.length}</strong> Consultas</div>
          <div className="kpi-card"><strong>{summary?.scheduledCount ?? appointments.filter(a => a.status === 'scheduled').length}</strong> Agendadas</div>
          <div className="kpi-card"><strong>{summary?.completedCount ?? appointments.filter(a => a.status === 'completed').length}</strong> Concluídas</div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Relatórios Salvos</h3>
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true) }}>
              + Novo Relatório
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSave} style={{ marginBottom: 24, padding: 16, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}>
              <h4>{editing ? 'Editar Relatório' : 'Novo Relatório'}</h4>
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr', marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Título *</label>
                  <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Título do relatório" required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Período início</label>
                  <input className="input" type="datetime-local" value={form.periodStart} onChange={e => setForm(f => ({ ...f, periodStart: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Período fim</label>
                  <input className="input" type="datetime-local" value={form.periodEnd} onChange={e => setForm(f => ({ ...f, periodEnd: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Observações</label>
                <textarea className="input" rows={3} value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))} placeholder="Observações opcionais..." style={{ width: '100%', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
                <button className="btn btn-ghost" type="button" onClick={resetForm}>Cancelar</button>
              </div>
            </form>
          )}

          {loadingReports ? (
            <div className="loading">Carregando relatórios...</div>
          ) : reportsError ? (
            <div className="error-box">{reportsError}</div>
          ) : reports.length === 0 ? (
            <p>Nenhum relatório criado ainda.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {reports.map((r) => (
                <li key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <strong>{r.title}</strong>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      {r.periodStart ? `${new Date(r.periodStart).toLocaleDateString('pt-BR')}` : 'Sem período'} 
                      {r.periodEnd ? ` — ${new Date(r.periodEnd).toLocaleDateString('pt-BR')}` : ''}
                      <span style={{ marginLeft: 12 }}>Criado em {new Date(r.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                    {r.observations && (
                      <div style={{ fontSize: 13, marginTop: 4, opacity: 0.8, maxWidth: 500 }}>{r.observations}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-ghost" onClick={() => startEdit(r)}>Editar</button>
                    <button className="btn-ghost" style={{ color: '#c62828' }} onClick={() => handleDelete(r.id)}>Excluir</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    )
  }

  function DashboardView() {
    const totalPats = summary?.totalPatients ?? patients.length
    const totalAppts = summary?.totalAppointments ?? appointments.length
    const scheduledCount = summary?.scheduledCount ?? appointments.filter(a => a.status === 'scheduled').length
    const completedCount = summary?.completedCount ?? appointments.filter(a => a.status === 'completed').length
    const cancelledCount = summary?.cancelledCount ?? appointments.filter(a => a.status === 'cancelled').length

    const statusData = {
      labels: ['Agendadas', 'Concluídas', 'Canceladas'],
      datasets: [{
        data: [scheduledCount, completedCount, cancelledCount],
        backgroundColor: ['#0fb9b1', '#2e7d32', '#c62828'],
        borderWidth: 0,
      }],
    }

    const statusOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#4a5568', padding: 16 } },
        title: { display: true, text: 'Consultas por Status', color: '#4a5568', font: { size: 14, weight: 600 } },
      },
    }

    const weeklyData = {
      labels: weeklyCounts.labels,
      datasets: [{
        label: 'Consultas',
        data: weeklyCounts.counts,
        backgroundColor: 'rgba(15, 185, 177, 0.7)',
        borderRadius: 6,
      }],
    }

    const weeklyOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Consultas por Dia da Semana', color: '#4a5568', font: { size: 14, weight: 600 } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#718096' } },
        y: { beginAtZero: true, ticks: { stepSize: 1, color: '#718096' }, grid: { color: 'rgba(0,0,0,0.05)' } },
      },
    }

    return (
      <>
        <div className="kpi-row">
          <div className="kpi-card"><strong>{totalPats}</strong> Pacientes</div>
          <div className="kpi-card"><strong>{totalAppts}</strong> Consultas</div>
          <div className="kpi-card"><strong>{scheduledCount}</strong> Agendadas</div>
          <div className="kpi-card"><strong>{completedCount}</strong> Concluídas</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ height: 260 }}>
              <Doughnut data={statusData} options={statusOptions} />
            </div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ height: 260 }}>
              <Bar data={weeklyData} options={weeklyOptions} />
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-panel">
        <div className="welcome-header">
          <h2>Olá, {user?.name || user?.email || 'Profissional'}</h2>
        </div>

        <div className="card">
          <MiniCalendar />
        </div>

        {(!section || section === 'dashboard') && <DashboardView />}
        {section === 'agenda' && <AgendaView />}
        {section === 'patients' && <PatientsView />}
        {section === 'ehrs' && (
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <p style={{ opacity: 0.6 }}>Acesse os prontuários pelo menu ou pelo link abaixo.</p>
            <Link className="btn" to="/ehr" style={{ marginTop: 12, display: 'inline-block' }}>
              Ir para Prontuário Eletrônico
            </Link>
          </div>
        )}
        {section === 'reports' && <ReportsView />}
      </div>
    </div>
  )
}
