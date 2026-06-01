import { Resend } from 'resend'
import {
  confirmationHtml,
  reminderHtml,
  cancellationHtml,
  requestHtml,
  rescheduleProposalHtml,
} from './email.templates.js'

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.EMAIL_FROM || 'MindCare <noreply@mindcare.local>'

function getClient(): Resend | null {
  if (!resendApiKey) {
    console.warn('[Email] RESEND_API_KEY not configured — emails disabled')
    return null
  }
  return new Resend(resendApiKey)
}

export const emailService = {
  async sendAppointmentConfirmation(opts: {
    to: string
    patientName: string
    professionalName: string
    specialty: string
    dateTime: string
  }) {
    const client = getClient()
    if (!client) return
    try {
      await client.emails.send({
        from: fromEmail,
        to: opts.to,
        subject: 'Consulta Confirmada - MindCare',
        html: confirmationHtml({
          patientName: opts.patientName,
          professionalName: opts.professionalName,
          specialty: opts.specialty,
          dateTime: opts.dateTime,
        }),
      })
      console.log(`[Email] Confirmation sent to ${opts.to}`)
    } catch (err) {
      console.error('[Email] Failed to send confirmation:', err)
    }
  },

  async sendAppointmentReminder(opts: {
    to: string
    patientName: string
    professionalName: string
    specialty: string
    dateTime: string
  }) {
    const client = getClient()
    if (!client) return
    try {
      await client.emails.send({
        from: fromEmail,
        to: opts.to,
        subject: 'Lembrete de Consulta - MindCare',
        html: reminderHtml({
          patientName: opts.patientName,
          professionalName: opts.professionalName,
          specialty: opts.specialty,
          dateTime: opts.dateTime,
        }),
      })
      console.log(`[Email] Reminder sent to ${opts.to}`)
    } catch (err) {
      console.error('[Email] Failed to send reminder:', err)
    }
  },

  async sendCancellationNotice(opts: {
    to: string
    patientName: string
    professionalName: string
    dateTime: string
    reason: string
  }) {
    const client = getClient()
    if (!client) return
    try {
      await client.emails.send({
        from: fromEmail,
        to: opts.to,
        subject: 'Consulta Cancelada - MindCare',
        html: cancellationHtml({
          patientName: opts.patientName,
          professionalName: opts.professionalName,
          dateTime: opts.dateTime,
          reason: opts.reason,
        }),
      })
      console.log(`[Email] Cancellation notice sent to ${opts.to}`)
    } catch (err) {
      console.error('[Email] Failed to send cancellation notice:', err)
    }
  },

  async sendAppointmentRequest(opts: {
    to: string
    professionalName: string
    patientName: string
    dateTime: string
  }) {
    const client = getClient()
    if (!client) return
    try {
      await client.emails.send({
        from: fromEmail,
        to: opts.to,
        subject: 'Nova Solicitação de Consulta - MindCare',
        html: requestHtml({
          professionalName: opts.professionalName,
          patientName: opts.patientName,
          dateTime: opts.dateTime,
        }),
      })
      console.log(`[Email] Appointment request sent to ${opts.to}`)
    } catch (err) {
      console.error('[Email] Failed to send appointment request:', err)
    }
  },

  async sendRescheduleProposal(opts: {
    to: string
    patientName: string
    professionalName: string
    dateTime: string
    message: string
  }) {
    const client = getClient()
    if (!client) return
    try {
      await client.emails.send({
        from: fromEmail,
        to: opts.to,
        subject: 'Proposta de Reagendamento - MindCare',
        html: rescheduleProposalHtml({
          patientName: opts.patientName,
          professionalName: opts.professionalName,
          dateTime: opts.dateTime,
          message: opts.message,
        }),
      })
      console.log(`[Email] Reschedule proposal sent to ${opts.to}`)
    } catch (err) {
      console.error('[Email] Failed to send reschedule proposal:', err)
    }
  },

  async sendAppointmentConfirmed(opts: {
    to: string
    patientName: string
    professionalName: string
    dateTime: string
  }) {
    const client = getClient()
    if (!client) return
    try {
      await client.emails.send({
        from: fromEmail,
        to: opts.to,
        subject: 'Consulta Confirmada - MindCare',
        html: confirmationHtml({
          patientName: opts.patientName,
          professionalName: opts.professionalName,
          specialty: '',
          dateTime: opts.dateTime,
        }),
      })
      console.log(`[Email] Confirmation sent to ${opts.to}`)
    } catch (err) {
      console.error('[Email] Failed to send confirmation:', err)
    }
  },
}
