import { Router } from 'express'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { dataDeletionRequests } from '../../db/schema/index.js'
import { authGuard } from '../auth/auth.middleware.js'
import { requireRole } from '../auth/rbac.middleware.js'
import { parseBody } from '../../shared/validate.js'
import { AppError } from '../../shared/errors.js'
import { asyncHandler } from '../../shared/async-handler.js'
import { logAudit } from '../../shared/audit.js'
import { anonymizePatient } from './lgpd.service.js'

const router = Router()

const requestSchema = z.object({ reason: z.string().max(1000).optional() }).strict()
const decisionSchema = z.object({
  deletionType: z.enum(['anonymization', 'physical']).default('anonymization'),
  rejectionReason: z.string().optional(),
}).strict()

router.post('/lgpd/deletion-requests', authGuard, requireRole(['patient']), asyncHandler(async (req, res) => {
  const body = parseBody(requestSchema, req.body)
  const [row] = await db.insert(dataDeletionRequests)
    .values({ patientUserId: req.user!.id, reason: body.reason })
    .returning()
  await logAudit(req, { action: 'LGPD_DELETION_REQUESTED', entity: 'patients', entityId: req.user!.id })
  res.status(201).json(row)
}))

router.get('/lgpd/deletion-requests', authGuard, requireRole(['admin']), asyncHandler(async (_req, res) => {
  const rows = await db.select().from(dataDeletionRequests)
  res.json(rows)
}))

router.patch('/lgpd/deletion-requests/:id/approve', authGuard, requireRole(['admin']), asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  const body = parseBody(decisionSchema, req.body)
  const [request] = await db.select().from(dataDeletionRequests).where(eq(dataDeletionRequests.id, id))
  if (!request) throw new AppError(404, 'Solicitação não encontrada')
  if (request.status !== 'pending') throw new AppError(409, 'Solicitação já processada')

  await anonymizePatient(request.patientUserId, body.deletionType)

  await db.update(dataDeletionRequests).set({
    status: 'completed',
    deletionType: body.deletionType,
    processedAt: new Date(),
    processedByUserId: req.user!.id,
  }).where(eq(dataDeletionRequests.id, id))

  await logAudit(req, {
    action: 'LGPD_DELETION_EXECUTED',
    entity: 'patients',
    entityId: request.patientUserId,
    metadata: { deletionType: body.deletionType, requestId: id },
  })
  res.json({ ok: true })
}))

router.patch('/lgpd/deletion-requests/:id/reject', authGuard, requireRole(['admin']), asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  const body = parseBody(decisionSchema, req.body)
  await db.update(dataDeletionRequests).set({
    status: 'rejected',
    rejectionReason: body.rejectionReason,
    processedAt: new Date(),
    processedByUserId: req.user!.id,
  }).where(eq(dataDeletionRequests.id, id))
  await logAudit(req, { action: 'LGPD_DELETION_REJECTED', entityId: id })
  res.json({ ok: true })
}))

export { router as lgpdRouter }
