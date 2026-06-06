import { request } from './api.js'

export async function getAdminMetrics() {
  return request('/api/admin/metrics')
}

export async function getAdminUsers(page = 1, limit = 20) {
  return request(`/api/admin/users?page=${page}&limit=${limit}`)
}

export async function deleteUser(id) {
  return request(`/api/admin/users/${id}`, { method: 'DELETE' })
}
