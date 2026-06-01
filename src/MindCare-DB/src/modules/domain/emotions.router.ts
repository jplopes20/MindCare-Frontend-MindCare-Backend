import { Router } from 'express'
import { authGuard } from '../auth/auth.middleware.js'
import { requireRole } from '../auth/rbac.middleware.js'
import { asyncHandler } from '../../shared/async-handler.js'
import * as controllers from './emotions.controllers.js'

const router = Router()

/**
 * POST /emotions/me
 * Registra um novo registro de emoção/humor (paciente)
 */
router.post(
  '/emotions/me',
  authGuard,
  requireRole(['patient']),
  asyncHandler(controllers.createEmotionLogController),
)

/**
 * GET /emotions/me
 * Lista registros de emoção do paciente autenticado
 * Query: ?days=7 (default 7)
 */
router.get(
  '/emotions/me',
  authGuard,
  requireRole(['patient']),
  asyncHandler(controllers.getMyEmotionLogsController),
)

/**
 * GET /patients/:patientId/emotions
 * Lista registros de emoção de um paciente (profissional)
 * Query: ?days=7 (default 7)
 */
router.get(
  '/patients/:patientId/emotions',
  authGuard,
  requireRole(['professional']),
  asyncHandler(controllers.getPatientEmotionLogsController),
)

export { router as emotionsRouter }
