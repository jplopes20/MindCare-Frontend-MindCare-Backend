import { request } from './api.js'

export async function getPatients() {
  return request('/api/patients')
}

export async function getPatient(id) {
  return request(`/api/patients/${id}`)
}

export async function getMyPatientProfile() {
  return request('/api/patients/me')
}

export async function createPatientProfile(data) {
  return request('/api/patients', {
    method: 'POST',
    body: data,
  })
}

export async function updatePatientProfile(data) {
  return request('/api/patients/me', {
    method: 'PUT',
    body: data,
  })
}

export async function deletePatient(id) {
  return request(`/api/patients/${id}`, {
    method: 'DELETE',
  })
}

export default {
  getPatients,
  getPatient,
  getMyPatientProfile,
  createPatientProfile,
  updatePatientProfile,
  deletePatient,
}
