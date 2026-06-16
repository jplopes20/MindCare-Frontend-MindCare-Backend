import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

let app: Express
let authToken: string

const testEmail = `test-notif-${Date.now()}@mindcare.test`
const testPassword = 'senha1234'
const testConsents = [{ consentTermId: 1, accepted: true }, { consentTermId: 2, accepted: true }]

beforeAll(async () => {
  const mod = await import('../../app.js')
  app = mod.default

  const res = await request(app)
    .post('/auth/register')
    .send({ email: testEmail, password: testPassword, role: 'patient', consents: testConsents })

  const loginRes = await request(app)
    .post('/auth/login')
    .send({ email: testEmail, password: testPassword })

  authToken = loginRes.body.token
})

describe('GET /api/notifications', () => {
  it('deve rejeitar sem token → 401', async () => {
    const res = await request(app).get('/api/notifications')
    expect(res.status).toBe(401)
  })

  it('deve retornar lista vazia para usuário novo → 200', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('notifications')
    expect(res.body).toHaveProperty('unreadCount')
    expect(Array.isArray(res.body.notifications)).toBe(true)
    expect(res.body.unreadCount).toBe(0)
  })

  it('deve aceitar filtro ?status=unread → 200', async () => {
    const res = await request(app)
      .get('/api/notifications?status=unread')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('notifications')
    expect(res.body.notifications.length).toBe(0)
  })
})

describe('PATCH /api/notifications/read-all', () => {
  it('deve marcar todas como lidas → 200', async () => {
    const res = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('updated')
    expect(typeof res.body.updated).toBe('number')
  })
})
