import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { consentTerms, userConsents } from '../../db/schema/index.js'
import { authGuard } from '../auth/auth.middleware.js'
import { asyncHandler } from '../../shared/async-handler.js'

const router = Router()

router.get('/consents/active', asyncHandler(async (_req, res) => {
  const rows = await db
    .select()
    .from(consentTerms)
    .where(eq(consentTerms.isActive, true))
  res.json(rows)
}))

router.get('/consents/me', authGuard, asyncHandler(async (req, res) => {
  const rows = await db
    .select({
      id: userConsents.id,
      consentTermId: userConsents.consentTermId,
      accepted: userConsents.accepted,
      acceptedAt: userConsents.acceptedAt,
      title: consentTerms.title,
      type: consentTerms.type,
      version: consentTerms.version,
    })
    .from(userConsents)
    .innerJoin(consentTerms, eq(userConsents.consentTermId, consentTerms.id))
    .where(eq(userConsents.userId, req.user!.id))

  res.json(rows)
}))

export { router as consentRouter }
