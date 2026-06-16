import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

let app: Express
let authToken: string

const testEmail = `test-auth-${Date.now()}@mindcare.test`
const testPassword = 'senha1234'
const testConsents = [{ consentTermId: 1, accepted: true }, { consentTermId: 2, accepted: true }]

beforeAll(async () => {
  const mod = await import('../../app.js')
  app = mod.default
})

describe('POST /auth/register', () => {
  it('deve registrar com dados válidos → 201', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: testEmail, password: testPassword, role: 'patient', consents: testConsents })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('user')
    expect(res.body.user).toHaveProperty('id')
    expect(res.body.user.email).toBe(testEmail)
    expect(res.body.user.role).toBe('patient')
  })

  it('deve rejeitar email duplicado → 409', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: testEmail, password: testPassword, role: 'patient', consents: testConsents })

    expect(res.status).toBe(409)
  })

  it('deve rejeitar body inválido (sem email) → 400', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ password: testPassword, role: 'patient' })

    expect(res.status).toBe(400)
  })
})

describe('POST /auth/login', () => {
  it('deve logar com credenciais corretas → 200', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body).toHaveProperty('user')
    expect(res.body.user.email).toBe(testEmail)

    authToken = res.body.token
  })

  it('deve rejeitar senha errada → 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: testEmail, password: 'wrong-password' })

    expect(res.status).toBe(401)
  })

  it('deve rejeitar email não cadastrado → 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'never-registered@mindcare.test', password: testPassword })

    expect(res.status).toBe(401)
  })
})

describe('GET /auth/me', () => {
  it('deve rejeitar sem token → 401', async () => {
    const res = await request(app).get('/auth/me')
    expect(res.status).toBe(401)
  })

  it('deve retornar user com token válido → 200', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('user')
    expect(res.body.user).toHaveProperty('id')
    expect(res.body.user.email).toBe(testEmail)
    expect(res.body.user.role).toBe('patient')
  })
})
