import { request } from './api.js'

export async function createEmotionLog(data) {
  return request('/api/emotions/me', {
    method: 'POST',
    body: data,
  })
}

export async function getMyEmotionLogs(days = 7) {
  return request(`/api/emotions/me?days=${days}`)
}

export async function getPatientEmotionLogs(patientId, days = 7) {
  return request(`/api/patients/${patientId}/emotions?days=${days}`)
}

export default {
  createEmotionLog,
  getMyEmotionLogs,
  getPatientEmotionLogs,
}
