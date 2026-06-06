import { request } from './api.js'

export async function getNotifications(status) {
  const query = status ? `?status=${status}` : ''
  return request(`/api/notifications${query}`)
}

export async function markAsRead(id) {
  return request(`/api/notifications/${id}/read`, { method: 'PATCH' })
}

export async function markAllAsRead() {
  return request('/api/notifications/read-all', { method: 'PATCH' })
}

export async function archiveNotification(id) {
  return request(`/api/notifications/${id}/archive`, { method: 'PATCH' })
}
