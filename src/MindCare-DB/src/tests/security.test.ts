import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { db } from '../db/index.js'
import { users, patients, specialties, healthProfessionals, medicalRecords, auditLogs } from '../db/schema/index.js'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { signTokenFor, expiredToken } from './helpers/auth.js'

let app: Express
let patientA: { id: number; email: string }
let patientB: { id: number; email: string }
let medicalRecordOfB: { id: number }

beforeAll(async () => {
  const mod = await import('../app.js')
  app = mod.default

  const hash = await bcrypt.hash('test1234', 4)

  // Create 2 patients
  const [uA] = await db.insert(users).values({ email: 'ct010-a@test.com', role: 'patient', passwordHash: hash }).returning()
  const [uB] = await db.insert(users).values({ email: 'ct010-b@test.com', role: 'patient', passwordHash: hash }).returning()
  patientA = { id: uA.id, email: uA.email }
  patientB = { id: uB.id, email: uB.email }

  const [pA] = await db.insert(patients).values({ userId: uA.id, name: 'Patient A' }).returning()
  const [pB] = await db.insert(patients).values({ userId: uB.id, name: 'Patient B' }).returning()

  // Create a professional user + profile (needed to create a medical record)
  const [profU] = await db.insert(users).values({ email: 'ct010-prof@test.com', role: 'professional', passwordHash: hash }).returning()
  const [spec] = await db.insert(specialties).values({ name: 'Test Specialty' }).returning()
  const [prof] = await db.insert(healthProfessionals).values({ userId: profU.id, crm: 'CRM-TEST-999', specialtyId: spec.id }).returning()

  // Create a medical record for patient B
  const [mr] = await db.insert(medicalRecords).values({
    patientId: pB.id,
    professionalId: prof.id,
    recordText: 'Registro de teste do paciente B',
  }).returning()
  medicalRecordOfB = mr
})

describe('CT010 — Acesso a prontuário de outro paciente', () => {
  it('deve retornar 403 quando paciente A tenta ler prontuário de B', async () => {
    const tokenA = signTokenFor({ ...patientA, role: 'patient' })
    const res = await request(app)
      .get(`/api/medical-records/${medicalRecordOfB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
    expect(res.status).toBe(403)
  })
})

describe('CT011 — Token JWT expirado', () => {
  it('deve retornar 401 quando o token está expirado', async () => {
    const dead = expiredToken({ ...patientA, role: 'patient' })
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${dead}`)
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/expirado|inválido/i)
  })

  it('deve retornar 401 quando o token está malformado', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer foo.bar.baz')
    expect(res.status).toBe(401)
  })
})

describe('CT012 — Solicitação de exclusão de dados (LGPD)', () => {
  let requestId: number
  let adminToken: string
  let adminUserId: number

  it('paciente solicita exclusão → 201 e cria registro pending', async () => {
    const token = signTokenFor({ ...patientA, role: 'patient' })
    const res = await request(app)
      .post('/api/lgpd/deletion-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Encerramento de tratamento' })
    expect(res.status).toBe(201)
    expect(res.body.status).toBe('pending')
    requestId = res.body.id
  })

  it('admin aprova → dados anonimizados + audit_log criado', async () => {
    const hash = await bcrypt.hash('admin1234', 4)
    const [admin] = await db.insert(users).values({
      email: `ct012-admin-${Date.now()}@test.com`, role: 'admin', passwordHash: hash,
    }).returning()
    adminUserId = admin.id
    adminToken = signTokenFor({ id: admin.id, email: admin.email, role: 'admin' })

    const approve = await request(app)
      .patch(`/api/lgpd/deletion-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ deletionType: 'anonymization' })
    expect(approve.status).toBe(200)

    // Verify anonymization
    const [updatedPatient] = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, patientA.id))
    expect(updatedPatient?.name).toMatch(/Anonimizado/)

    // Verify audit_log
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'LGPD_DELETION_EXECUTED'))
    expect(logs.length).toBeGreaterThan(0)
  })

  it('paciente NÃO consegue aprovar exclusão (RBAC)', async () => {
    const token = signTokenFor({ ...patientA, role: 'patient' })
    const res = await request(app)
      .patch(`/api/lgpd/deletion-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ deletionType: 'anonymization' })
    expect(res.status).toBe(403)
  })
})
