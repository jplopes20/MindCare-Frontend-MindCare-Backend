import { request } from './api.js'

export async function getMedicalRecord(id) {
  return request(`/api/medical-records/${id}`)
}

export async function getMyMedicalRecords() {
  return request('/api/medical-records/me')
}

export async function createMedicalRecord(data) {
  return request('/api/medical-records', {
    method: 'POST',
    body: data,
  })
}

export async function addDiagnosis(recordId, data) {
  return request(`/api/medical-records/${recordId}/diagnoses`, {
    method: 'POST',
    body: data,
  })
}

export async function addPrescription(recordId, data) {
  return request(`/api/medical-records/${recordId}/prescriptions`, {
    method: 'POST',
    body: data,
  })
}

export async function getPatientMedicalRecords(patientId) {
  return request(`/api/patients/${patientId}/medical-records`)
}

export async function generateAiDraft(data) {
  return request('/api/medical-records/ai-draft', {
    method: 'POST',
    body: data,
  })
}

export async function improveAiText(data) {
  return request('/api/medical-records/ai-improve', {
    method: 'POST',
    body: data,
  })
}

export async function suggestAiDiagnosis(data) {
  return request('/api/medical-records/ai-diagnosis', {
    method: 'POST',
    body: data,
  })
}

export async function getMedicalRecordPdf(recordId) {
  return request(`/api/medical-records/${recordId}/pdf`)
}

export default {
  getMedicalRecord,
  getMyMedicalRecords,
  getPatientMedicalRecords,
  createMedicalRecord,
  addDiagnosis,
  addPrescription,
  getMedicalRecordPdf,
  generateAiDraft,
  improveAiText,
  suggestAiDiagnosis,
}
