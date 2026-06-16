import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { db } from '../db/index.js'
import { auditLogs, dataDeletionRequests, users, consentTerms, userConsents } from '../db/schema/index.js'
import { eq, inArray } from 'drizzle-orm'

let app: Express
let patientToken: string
let adminToken: string
let patientUserId: number
let adminUserId: number

const testEmail = `lgpd-test-${Date.now()}@mindcare.test`
const adminEmail = `lgpd-admin-${Date.now()}@mindcare.test`
const testPassword = 'senha1234'

beforeAll(async () => {
  const mod = await import('../app.js')
  app = mod.default

  // Register patient with consents
  const consentTermsList = await db.select({ id: consentTerms.id }).from(consentTerms).where(eq(consentTerms.isActive, true))
  const consents = consentTermsList.map(t => ({ consentTermId: t.id, accepted: true }))

  await request(app)
    .post('/auth/register')
    .send({ email: testEmail, password: testPassword, role: 'patient', consents })

  const patientLogin = await request(app)
    .post('/auth/login')
    .send({ email: testEmail, password: testPassword })
  patientToken = patientLogin.body.token
  patientUserId = patientLogin.body.user.id

  // Register admin
  await request(app)
    .post('/auth/register')
    .send({ email: adminEmail, password: testPassword, role: 'admin', consents })

  const adminLogin = await request(app)
    .post('/auth/login')
    .send({ email: adminEmail, password: testPassword })
  adminToken = adminLogin.body.token
  adminUserId = adminLogin.body.user.id
})

describe('RN011 — Minimização de Dados (.strict())', () => {
  it('deve rejeitar POST /api/patients com campo extra → 400', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ name: 'Teste', extra: 'nao-permitido' })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('RN011')
    expect(res.body.error).toContain('extra')
  })

  it('deve rejeitar POST /auth/register com campo extra → 400', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'extra@test.com', password: '12345678', role: 'patient', consents: [], extraField: 'x' })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('RN011')
  })

  it('deve aceitar POST /api/patients com dados válidos → 201', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ name: 'Paciente Válido' })

    expect(res.status).toBe(201)
  })
})

describe('RN013 — Logs de Acesso (DATA_ACCESS)', () => {
  it('deve registrar DATA_ACCESS ao acessar /api/medical-records/me', async () => {
    const before = await db.select({ id: auditLogs.id }).from(auditLogs).where(eq(auditLogs.action, 'DATA_ACCESS'))

    const res = await request(app)
      .get('/api/medical-records/me')
      .set('Authorization', `Bearer ${patientToken}`)

    expect(res.status).toBe(200)

    const after = await db.select({ id: auditLogs.id, action: auditLogs.action, entity: auditLogs.entity })
      .from(auditLogs)
      .where(eq(auditLogs.action, 'DATA_ACCESS'))

    expect(after.length).toBe(before.length + 1)
    expect(after[after.length - 1].entity).toBe('medical_records')
  })
})
