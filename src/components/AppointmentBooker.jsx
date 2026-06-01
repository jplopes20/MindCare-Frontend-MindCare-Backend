import React, { useState, useEffect, useCallback } from 'react'
import * as professionalService from '../services/professionals.js'
import * as appointmentService from '../services/appointments.js'

function formatSlotTime(isoStr) {
  const d = new Date(isoStr)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function AppointmentBooker({ onClose, onSuccess }) {
  const [professionals, setProfessionals] = useState([])
  const [selectedProf, setSelectedProf] = useState('')
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState([])
  const [loadingProfs, setLoadingProfs] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [selectedSlot, setSelectedSlot] = useState(null)
  const [message, setMessage] = useState('')
  const [step, setStep] = useState('select')

  useEffect(() => {
    setLoadingProfs(true)
    setError(null)
    professionalService
      .getProfessionals()
      .then((data) => {
        setProfessionals(Array.isArray(data) ? data : [])
      })
      .catch((err) => setError(err?.message || 'Erro ao carregar profissionais'))
      .finally(() => setLoadingProfs(false))
  }, [])

  const fetchSlots = useCallback(async () => {
    if (!selectedProf || !date) {
      setSlots([])
      return
    }
    setLoadingSlots(true)
    setError(null)
    try {
      const data = await appointmentService.getAvailableSlots(selectedProf, date)
      setSlots(data?.slots || [])
    } catch (err) {
      setError(err?.message || 'Erro ao carregar horários')
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }, [selectedProf, date])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  function handleSlotSelect(slotStart, slotEnd) {
    setSelectedSlot({ startTime: slotStart, endTime: slotEnd })
    setStep('confirm')
    setError(null)
  }

  async function handleSubmitRequest() {
    if (!selectedSlot) return
    setBooking(true)
    setError(null)
    setSuccess(null)
    try {
      await appointmentService.createAppointment({
        professionalId: Number(selectedProf),
        scheduledStartTime: selectedSlot.startTime,
        scheduledEndTime: selectedSlot.endTime,
      })

      if (message.trim()) {
        const apts = await appointmentService.getMyAppointments()
        const latest = Array.isArray(apts) ? apts[apts.length - 1] : null
        if (latest?.id) {
          await appointmentService.sendAppointmentMessage(latest.id, message.trim()).catch(() => {})
        }
      }

      setSuccess('Solicitação enviada! Aguardando confirmação do profissional.')
      setTimeout(() => {
        onSuccess?.()
        onClose?.()
      }, 2000)
    } catch (err) {
      setError(err?.message || 'Erro ao solicitar consulta')
    } finally {
      setBooking(false)
    }
  }

  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split('T')[0]
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 60)
  const maxDateStr = maxDate.toISOString().split('T')[0]

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0 }}>Nova Consulta</h3>
        <button className="btn-ghost" onClick={onClose} style={{ fontSize: 12 }}>Fechar</button>
      </div>

      {step === 'select' && (
        <>
          <div className="form-group">
            <label>Profissional</label>
            <select
              value={selectedProf}
              onChange={(e) => { setSelectedProf(e.target.value); setSuccess(null); setError(null); setSelectedSlot(null) }}
              disabled={loadingProfs}
            >
              <option value="">{loadingProfs ? 'Carregando...' : '— Selecione —'}</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.user?.name || p.user?.email || `Profissional #${p.id}`}
                  {p.specialty?.name ? ` — ${p.specialty.name}` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedProf && (
            <div className="form-group">
              <label>Data</label>
              <input
                type="date"
                value={date}
                min={minDateStr}
                max={maxDateStr}
                onChange={(e) => { setDate(e.target.value); setSuccess(null); setError(null); setSelectedSlot(null) }}
              />
            </div>
          )}

          {error && (
            <div style={{ color: '#ff8a80', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: 'rgba(255,138,128,0.1)', borderRadius: 8 }}>
              {error}
            </div>
          )}

          {selectedProf && date && (
            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
                Horários disponíveis para {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </label>
              {loadingSlots ? (
                <div className="loading" style={{ padding: 20, textAlign: 'center' }}>Carregando horários...</div>
              ) : slots.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', opacity: 0.5, border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 8 }}>
                  Nenhum horário disponível nesta data.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {slots.map((slot, i) => (
                    <button
                      key={i}
                      className="btn"
                      onClick={() => handleSlotSelect(slot.startTime, slot.endTime)}
                      style={{
                        minWidth: 90,
                        textAlign: 'center',
                        padding: '10px 16px',
                      }}
                    >
                      {formatSlotTime(slot.startTime)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!selectedProf && !loadingProfs && (
            <p style={{ opacity: 0.5, fontSize: 13, textAlign: 'center', marginTop: 16 }}>
              Selecione um profissional e uma data para ver os horários disponíveis.
            </p>
          )}
        </>
      )}

      {step === 'confirm' && selectedSlot && (
        <div>
          <div
            style={{
              padding: 16,
              borderRadius: 8,
              background: 'rgba(15,185,177,0.1)',
              border: '1px solid rgba(15,185,177,0.2)',
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 4 }}>Resumo da Solicitação</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {professionals.find((p) => String(p.id) === selectedProf)?.user?.name || 'Profissional'}
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              {new Date(selectedSlot.startTime).toLocaleString('pt-BR')}
            </div>
          </div>

          <div className="form-group">
            <label>Mensagem para o profissional (opcional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex.: Gostaria de saber se há disponibilidade pela manhã..."
              rows={3}
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

          {error && (
            <div style={{ color: '#ff8a80', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: 'rgba(255,138,128,0.1)', borderRadius: 8 }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ color: '#0fb9b1', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: 'rgba(15,185,177,0.1)', borderRadius: 8 }}>
              {success}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              className="btn"
              onClick={handleSubmitRequest}
              disabled={booking}
              style={{ flex: 1 }}
            >
              {booking ? 'Enviando...' : 'Solicitar Agendamento'}
            </button>
            <button
              className="btn-ghost"
              onClick={() => { setStep('select'); setSelectedSlot(null); setError(null) }}
              disabled={booking}
            >
              Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
