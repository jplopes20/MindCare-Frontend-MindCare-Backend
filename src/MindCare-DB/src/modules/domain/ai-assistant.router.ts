import { Router } from 'express'
import { authGuard } from '../auth/auth.middleware.js'
import { requireRole } from '../auth/rbac.middleware.js'
import { asyncHandler } from '../../shared/async-handler.js'
import * as controllers from './ai-assistant.controllers.js'

const router = Router()

/**
 * POST /medical-records/ai-draft
 * Gera um rascunho de prontuário com IA (profissional)
 */
router.post(
  '/medical-records/ai-draft',
  authGuard,
  requireRole(['professional']),
  asyncHandler(controllers.generateDraftController),
)

/**
 * POST /medical-records/ai-improve
 * Melhora o texto de um prontuário com IA (profissional)
 */
router.post(
  '/medical-records/ai-improve',
  authGuard,
  requireRole(['professional']),
  asyncHandler(controllers.improveTextController),
)

/**
 * POST /medical-records/ai-diagnosis
 * Sugere diagnósticos estruturados com base no texto clínico (profissional)
 */
router.post(
  '/medical-records/ai-diagnosis',
  authGuard,
  requireRole(['professional']),
  asyncHandler(controllers.suggestDiagnosisController),
)

export { router as aiAssistantRouter }
