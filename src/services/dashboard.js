import { request } from './api.js'

export async function getDashboardSummary() {
  return request('/api/dashboard/summary')
}
