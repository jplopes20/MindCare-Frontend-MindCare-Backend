import React, { useState, useMemo, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { useAppointments } from '../hooks/useAppointments.js'
import { useProfessionalPatients } from '../hooks/useProfessionalPatients.js'
import { useMyPatientProfile } from '../hooks/useMyProfile.js'
import {
  useMedicalRecords,
  usePatientMedicalRecords,
} from '../hooks/useMedicalRecord.js'
import * as medicalRecordService from '../services/medicalRecords.js'
import * as professionalService from '../services/professionals.js'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
import { getToken } from '../services/api.js'

function Section({ title, children }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="ehr-section">
      <div className="ehr-section-header" onClick={() => setOpen(!open)}>
        <strong>{title}</strong>
        <span>{open ? '▲' : '▼'}</span>
      </div>
      {open && <div className="ehr-section-body">{children}</div>}
    </div>
  )
}

const statusLabels = {
  scheduled: 'Agendada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  no_show: 'Não compareceu',
}

export default function EHR() {
  const loc = useLocation()
  const nav = useNavigate()
  const qs = new URLSearchParams(loc.search)
  const urlPatientId = qs.get('patientId')
  const { user } = useAuth()
  const role = user?.role

  const isPatient = role === 'patient'
  const isProfessional = role === 'professional'

  const { profile: myProfile, loading: loadingProfile } = useMyPatientProfile(!isPatient && !urlPatientId)
  const {
    patients: linkedPatients,
    loading: loadingLinkedPatients,
    searchTerm,
    setSearchTerm,
    refetch: refetchPatients,
  } = useProfessionalPatients(!isProfessional)
  const { appointments, loading: loadingAppts } = useAppointments()

  const [selectedId, setSelectedId] = useState('')
  const [text, setText] = useState('')
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [ehrMode, setEhrMode] = useState('traditional')
  const [suggestedDiagnosis, setSuggestedDiagnosis] = useState(null)
  const [aiChanges, setAiChanges] = useState(null)

  const {
    records: myRecords,
    loading: loadingMyRecords,
  } = useMedicalRecords(!isPatient && !urlPatientId)

  const {
    records: patientRecords,
    loading: loadingPatientRecords,
    refetch: refetchPatientRecords,
  } = usePatientMedicalRecords(isProfessional ? Number(selectedId) : null)

  const patients = useMemo(() => {
    if (isPatient && myProfile) {
      return [myProfile]
    }
    if (isProfessional && Array.isArray(linkedPatients)) {
      return linkedPatients
    }
    return []
  }, [isPatient, isProfessional, myProfile, linkedPatients])

  const patientAppointments = useMemo(() => {
    if (!isProfessional || !selectedId || !Array.isArray(appointments)) return []
    return appointments.filter(
      (a) => String(a.patientId) === String(selectedId) && a.status === 'scheduled',
    )
  }, [isProfessional, selectedId, appointments])

  const currentPatient = useMemo(() => {
    if (isPatient && myProfile) return myProfile
    if (isProfessional && selectedId && patients.length > 0) {
      return patients.find((p) => String(p.id) === String(selectedId))
    }
    return null
  }, [isPatient, isProfessional, myProfile, patients, selectedId])

  useEffect(() => {
    if (isPatient && myProfile) {
      setSelectedId(String(myProfile.id))
    } else if (urlPatientId && !isPatient) {
      setSelectedId(urlPatientId)
    }
  }, [isPatient, myProfile, urlPatientId])

  const records = isPatient ? myRecords : patientRecords

  async function handleCreateRecord() {
    if (!selectedId || !text.trim()) return
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      await medicalRecordService.createMedicalRecord({
        patientId: Number(selectedId),
        recordText: text.trim(),
        appointmentId: selectedAppointmentId ? Number(selectedAppointmentId) : undefined,
      })
      setSaveSuccess(true)
      setText('')
      setSelectedAppointmentId('')
      setSuggestedDiagnosis(null)
      setAiChanges(null)
      refetchPatientRecords()
    } catch (err) {
      setSaveError(err?.message || 'Erro ao salvar prontuário')
    } finally {
      setSaving(false)
    }
  }

  async function handleAiDraft() {
    setAiLoading(true)
    setAiError(null)
    try {
      const result = await medicalRecordService.generateAiDraft({
        patientName: currentPatient?.user?.name || currentPatient?.name || undefined,
        symptoms: undefined,
      })
      setText(result.recordText)
      if (result.suggestedDiagnosis && result.suggestedDiagnosis.length > 0) {
        setSuggestedDiagnosis(
          result.suggestedDiagnosis.map((d) => {
            const parts = d.split(' - ')
            return { cid: parts[0] || '', desc: parts[1] || d, confidence: 100 }
          }),
        )
      }
    } catch (err) {
      setAiError(err?.message || 'Erro ao gerar rascunho com IA')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleAiImprove() {
    if (!text.trim()) {
      setAiError('Escreva algo antes de melhorar com IA.')
      return
    }
    setAiLoading(true)
    setAiError(null)
    setAiChanges(null)
    try {
      const result = await medicalRecordService.improveAiText({
        currentText: text,
      })
      setText(result.improvedText)
      setAiChanges(result.changes)
    } catch (err) {
      setAiError(err?.message || 'Erro ao melhorar texto com IA')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSuggestDiagnosis() {
    if (!text.trim()) {
      setAiError('Escreva o texto clínico antes de sugerir diagnósticos.')
      return
    }
    setAiLoading(true)
    setAiError(null)
    try {
      const result = await medicalRecordService.suggestAiDiagnosis({
        clinicalText: text,
      })
      setSuggestedDiagnosis(result.diagnoses)
    } catch (err) {
      setAiError(err?.message || 'Erro ao sugerir diagnósticos')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleDownloadPdf(recordId) {
    try {
      const token = getToken()
      const url = `${BASE_URL}/api/medical-records/${recordId}/pdf`
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Erro ao baixar PDF')
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `prontuario_${recordId}.pdf`
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error(err)
    }
  }

  if (loadingProfile || loadingAppts || (isProfessional && loadingLinkedPatients)) {
    return <div className="loading">Carregando...</div>
  }

  const loadingRecords = loadingMyRecords || loadingPatientRecords

  const isViewOnly = isPatient

  return (
    <div>
      <h2>Prontuário Eletrônico</h2>

      {isProfessional && (
        <>
          <div className="form-group">
            <label>Buscar Paciente</label>
            <input
              type="text"
              placeholder="Digite nome ou CPF do paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'transparent',
                color: '#fff',
              }}
            />
          </div>
          <div className="form-group">
            <label>Selecione o Paciente</label>
            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value)
                setSaveSuccess(false)
                setSaveError(null)
                setSuggestedDiagnosis(null)
                setAiChanges(null)
                setText('')
              }}
            >
              <option value="">— Selecione —</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.user?.name || p.user?.email || `Paciente #${p.id}`}
                  {p.cpf ? ` (${p.cpf})` : ''}
                </option>
              ))}
            </select>
            {patients.length === 0 && !loadingLinkedPatients && (
              <p style={{ fontSize: 13, opacity: 0.6, marginTop: 8 }}>
                Nenhum paciente encontrado. {!searchTerm ? 'Use a busca acima para encontrar um paciente pelo nome ou CPF.' : 'Tente outro termo de busca.'}
              </p>
            )}
          </div>
        </>
      )}

      {isPatient && currentPatient && (
        <div className="card" style={{ marginBottom: 16, padding: 16, background: 'rgba(15,185,177,0.06)', border: '1px solid rgba(15,185,177,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: 15 }}>Meu Prontuário</strong>
              <p style={{ fontSize: 12, opacity: 0.6, margin: '4px 0 0' }}>
                Visualização de registros clínicos — apenas leitura
              </p>
            </div>
            <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 12, background: 'rgba(15,185,177,0.15)', color: '#0fb9b1', fontWeight: 600 }}>
              LEITURA
            </span>
          </div>
        </div>
      )}

      {currentPatient && (
        <>
          <Section title="Dados do Paciente">
            <div className="form-group">
              <label>Nome</label>
              <input
                defaultValue={currentPatient.name || currentPatient.user?.email || user?.email || ''}
                readOnly
              />
            </div>
            <div className="form-group">
              <label>Data de Nascimento</label>
              <input
                type="date"
                defaultValue={
                  currentPatient.dateOfBirth
                    ? new Date(currentPatient.dateOfBirth).toISOString().split('T')[0]
                    : ''
                }
                readOnly
              />
            </div>
            {currentPatient.cpf && (
              <div className="form-group">
                <label>CPF</label>
                <input defaultValue={currentPatient.cpf} readOnly />
              </div>
            )}
            {currentPatient.phone && (
              <div className="form-group">
                <label>Telefone</label>
                <input defaultValue={currentPatient.phone} readOnly />
              </div>
            )}
          </Section>

          {loadingRecords ? (
            <div className="loading">Carregando prontuários...</div>
          ) : records && records.length > 0 ? (
            records.map((record) => (
              <Section key={record.id} title={`Prontuário — ${new Date(record.recordDateTime || record.createdAt).toLocaleDateString('pt-BR')}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {record.professional?.user?.name && (
                      <span>Profissional: <strong>{record.professional.user.name}</strong></span>
                    )}
                    {record.professional?.specialty?.name && (
                      <span> — {record.professional.specialty.name}</span>
                    )}
                  </div>
                  <button
                    className="btn-ghost"
                    onClick={() => handleDownloadPdf(record.id)}
                    style={{ fontSize: 12, padding: '4px 10px' }}
                    title="Baixar PDF"
                  >
                    PDF
                  </button>
                </div>

                <p style={{ whiteSpace: 'pre-wrap' }}>{record.recordText || 'Sem conteúdo'}</p>

                {record.diagnoses && record.diagnoses.length > 0 && (
                  <div style={{ marginTop: 12, padding: 12, background: 'rgba(255,152,0,0.08)', borderRadius: 8, border: '1px solid rgba(255,152,0,0.15)' }}>
                    <strong style={{ fontSize: 13, color: '#e65100' }}>Diagnósticos</strong>
                    {record.diagnoses.map((d, i) => (
                      <p key={i} style={{ fontSize: 12, margin: '4px 0' }}>
                        {d.cidCode && <span style={{ fontWeight: 600 }}>[{d.cidCode}] </span>}
                        {d.description}
                      </p>
                    ))}
                  </div>
                )}

                {record.prescriptions && record.prescriptions.length > 0 && (
                  <div style={{ marginTop: 12, padding: 12, background: 'rgba(46,125,50,0.06)', borderRadius: 8, border: '1px solid rgba(46,125,50,0.15)' }}>
                    <strong style={{ fontSize: 13, color: '#2e7d32' }}>Prescrições</strong>
                    {record.prescriptions.map((p, i) => (
                      <div key={i} style={{ fontSize: 12, margin: '6px 0', padding: '6px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 6 }}>
                        <strong>{p.medication}</strong> — {p.dosage}
                        {p.instructions && <div style={{ opacity: 0.7, marginTop: 2 }}>{p.instructions}</div>}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8 }}>
                  Criado em: {new Date(record.createdAt || record.recordDateTime).toLocaleString('pt-BR')}
                  {record.recordDateTime && record.recordDateTime !== record.createdAt && (
                    <> | Atendimento: {new Date(record.recordDateTime).toLocaleString('pt-BR')}</>
                  )}
                </div>
              </Section>
            ))
          ) : (
            <div className="card" style={{ padding: 24, textAlign: 'center' }}>
              <p style={{ opacity: 0.6 }}>Nenhum prontuário encontrado.</p>
              <p style={{ fontSize: 12, opacity: 0.4, marginTop: 4 }}>
                Os registros clínicos aparecerão aqui após as consultas.
              </p>
            </div>
          )}

          {isProfessional && (
            <>
              <div style={{ marginTop: 24, borderTop: '2px solid rgba(15,185,177,0.2)', paddingTop: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <strong style={{ fontSize: 15 }}>Edição</strong>
                  <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 10, background: 'rgba(255,152,0,0.15)', color: '#ff8a65', fontWeight: 600 }}>
                    PROFISSIONAL
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <button
                    className="btn"
                    onClick={() => setEhrMode('traditional')}
                    style={{
                      background: ehrMode === 'traditional' ? '#0fb9b1' : 'transparent',
                      color: ehrMode === 'traditional' ? '#fff' : '#4a5568',
                      border: '1px solid #0fb9b1',
                    }}
                  >
                    Prontuário Tradicional
                  </button>
                  <button
                    className="btn"
                    onClick={() => setEhrMode('intelligent')}
                    style={{
                      background: ehrMode === 'intelligent' ? '#0fb9b1' : 'transparent',
                      color: ehrMode === 'intelligent' ? '#fff' : '#4a5568',
                      border: '1px solid #0fb9b1',
                    }}
                  >
                    Prontuário Inteligente
                  </button>
                </div>

                {saveSuccess && (
                  <div style={{ color: '#2e7d32', marginBottom: 8, fontSize: 13 }}>
                    Prontuário salvo com sucesso!
                  </div>
                )}
                {saveError && (
                  <div style={{ color: '#c62828', marginBottom: 8, fontSize: 13 }}>
                    {saveError}
                  </div>
                )}
                {aiError && (
                  <div style={{ color: '#ff8a80', marginBottom: 8, fontSize: 13 }}>
                    {aiError}
                  </div>
                )}

                {ehrMode === 'traditional' && (
                  <Section title="Novo Registro">
                    <div className="form-group">
                      <label>Texto do Prontuário</label>
                      <textarea
                        rows={8}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Descreva o atendimento, diagnóstico, prescrições..."
                      />
                    </div>

                    <button
                      className="btn"
                      onClick={handleCreateRecord}
                      disabled={saving || !text.trim()}
                      style={{ marginTop: 8 }}
                    >
                      {saving ? 'Salvando...' : 'Salvar Prontuário'}
                    </button>
                  </Section>
                )}

                {ehrMode === 'intelligent' && (
                  <Section title="Prontuário Inteligente">
                    {patientAppointments.length > 0 && (
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label>Vincular a uma consulta (opcional)</label>
                        <select
                          value={selectedAppointmentId}
                          onChange={(e) => setSelectedAppointmentId(e.target.value)}
                        >
                          <option value="">Sem vínculo</option>
                          {patientAppointments.map((a) => (
                            <option key={a.id} value={a.id}>
                              {new Date(a.scheduledStartTime).toLocaleString('pt-BR')} — {statusLabels[a.status] || a.status}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                      <button
                        className="btn"
                        onClick={handleAiDraft}
                        disabled={aiLoading}
                        style={{ opacity: aiLoading ? 0.7 : 1 }}
                      >
                        {aiLoading ? 'Gerando...' : 'Gerar rascunho com IA'}
                      </button>
                      <button
                        className="btn-ghost"
                        onClick={handleAiImprove}
                        disabled={aiLoading || !text.trim()}
                        style={{ opacity: aiLoading ? 0.7 : 1 }}
                      >
                        {aiLoading ? 'Melhorando...' : 'Melhorar texto com IA'}
                      </button>
                      <button
                        className="btn-ghost"
                        onClick={handleSuggestDiagnosis}
                        disabled={aiLoading || !text.trim()}
                        style={{ opacity: aiLoading ? 0.7 : 1 }}
                      >
                        {aiLoading ? 'Analisando...' : 'Sugerir diagnóstico'}
                      </button>
                    </div>

                    {aiChanges && (
                      <div style={{ marginBottom: 12, padding: 12, background: 'rgba(15,185,177,0.1)', borderRadius: 8, fontSize: 12 }}>
                        <strong style={{ fontSize: 13 }}>Melhorias aplicadas</strong>
                        <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                          {aiChanges.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="form-group">
                      <label>Texto do Prontuário</label>
                      <textarea
                        rows={10}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Use 'Gerar rascunho com IA' para criar um texto inicial ou digite manualmente..."
                      />
                    </div>

                    {suggestedDiagnosis && (
                      <div style={{ marginBottom: 12, padding: 12, background: 'rgba(15,185,177,0.1)', borderRadius: 8 }}>
                        <strong style={{ fontSize: 13 }}>Sugestões de Diagnóstico (IA)</strong>
                        {suggestedDiagnosis.map((d, i) => (
                          <div key={i} style={{ fontSize: 12, marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                            <span>[{d.cid}] {d.desc || d.description}</span>
                            <span style={{ opacity: 0.7 }}>{d.confidence}%</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      className="btn"
                      onClick={handleCreateRecord}
                      disabled={saving || !text.trim()}
                      style={{ marginTop: 8 }}
                    >
                      {saving ? 'Salvando...' : 'Salvar Prontuário'}
                    </button>
                  </Section>
                )}
              </div>
            </>
          )}
        </>
      )}

      {!currentPatient && isProfessional && (
        <p style={{ opacity: 0.7, marginTop: 16 }}>
          Selecione um paciente para visualizar ou criar o prontuário.
        </p>
      )}
    </div>
  )
}
