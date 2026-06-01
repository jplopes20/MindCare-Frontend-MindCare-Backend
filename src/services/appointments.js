import { request } from './api.js'

export async function getMyAppointments() {
  return request('/api/appointments/me')
}

export async function getAppointment(id) {
  return request(`/api/appointments/${id}`)
}

export async function createAppointment(data) {
  return request('/api/appointments', {
    method: 'POST',
    body: data,
  })
}

export async function cancelAppointment(id, cancellationReason) {
  return request(`/api/appointments/${id}/cancel`, {
    method: 'POST',
    body: { cancellationReason },
  })
}

export async function getAvailableSlots(professionalId, date) {
  const params = new URLSearchParams({ professionalId, date })
  return request(`/api/appointments/available-slots?${params}`)
}

export async function confirmAppointment(id) {
  return request(`/api/appointments/${id}/confirm`, { method: 'POST' })
}

export async function rescheduleAppointment(id, data) {
  return request(`/api/appointments/${id}/reschedule`, {
    method: 'POST',
    body: data,
  })
}

export async function acceptReschedule(id) {
  return request(`/api/appointments/${id}/accept-reschedule`, { method: 'POST' })
}

export async function rejectReschedule(id, message) {
  return request(`/api/appointments/${id}/reject-reschedule`, {
    method: 'POST',
    body: { message },
  })
}

export async function getAppointmentMessages(id) {
  return request(`/api/appointments/${id}/messages`)
}

export async function sendAppointmentMessage(id, message) {
  return request(`/api/appointments/${id}/messages`, {
    method: 'POST',
    body: { message },
  })
}

export default {
  getMyAppointments,
  getAppointment,
  createAppointment,
  cancelAppointment,
  getAvailableSlots,
  confirmAppointment,
  rescheduleAppointment,
  acceptReschedule,
  rejectReschedule,
  getAppointmentMessages,
  sendAppointmentMessage,
}
