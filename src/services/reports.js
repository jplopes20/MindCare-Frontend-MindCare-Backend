import { request } from './api.js'

export async function getMyReports() {
  return request('/api/reports')
}

export async function createReport(data) {
  return request('/api/reports', {
    method: 'POST',
    body: data,
  })
}

export async function updateReport(id, data) {
  return request(`/api/reports/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deleteReport(id) {
  return request(`/api/reports/${id}`, {
    method: 'DELETE',
  })
}

export async function getProfessionalSummary() {
  return request('/api/professionals/me/summary')
}

export default {
  getMyReports,
  createReport,
  updateReport,
  deleteReport,
  getProfessionalSummary,
}
