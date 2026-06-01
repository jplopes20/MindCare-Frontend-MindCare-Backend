import { request } from './api.js'

export async function getProfessionals() {
  return request('/api/professionals')
}

export async function getProfessional(id) {
  return request(`/api/professionals/${id}`)
}

export async function getMyProfessionalProfile() {
  return request('/api/professionals/me')
}

export async function createProfessionalProfile(data) {
  return request('/api/professionals', {
    method: 'POST',
    body: data,
  })
}

export async function updateProfessionalProfile(id, data) {
  return request(`/api/professionals/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export async function getMyPatients() {
  return request('/api/professionals/me/patients')
}

export async function getAllPatients(searchTerm) {
  const params = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''
  return request(`/api/professionals/me/all-patients${params}`)
}

export async function linkPatient(patientId) {
  return request('/api/professionals/link-patient', {
    method: 'POST',
    body: { patientId },
  })
}

export async function getWorkingHours(professionalId) {
  return request(`/api/working-hours/professional/${professionalId}`)
}

export async function createWorkingHours(data) {
  return request('/api/working-hours', {
    method: 'POST',
    body: data,
  })
}

export default {
  getProfessionals,
  getProfessional,
  getMyProfessionalProfile,
  createProfessionalProfile,
  updateProfessionalProfile,
  getMyPatients,
  getAllPatients,
  linkPatient,
  getWorkingHours,
  createWorkingHours,
}
