import { Router } from 'express'
import { authGuard } from '../auth/auth.middleware.js'
import { requireRole } from '../auth/rbac.middleware.js'
import { asyncHandler } from '../../shared/async-handler.js'
import * as controllers from './controllers.js'

const router = Router()

/**
 * GET /reports
 * Lista todos os relatórios do profissional autenticado
 */
router.get(
  '/reports',
  authGuard,
  requireRole(['professional', 'admin']),
  asyncHandler(controllers.listReportsController),
)

/**
 * POST /reports
 * Cria um novo relatório
 */
router.post(
  '/reports',
  authGuard,
  requireRole(['professional']),
  asyncHandler(controllers.createReportController),
)

/**
 * PUT /reports/:id
 * Atualiza um relatório existente
 */
router.put(
  '/reports/:id',
  authGuard,
  requireRole(['professional']),
  asyncHandler(controllers.updateReportController),
)

/**
 * DELETE /reports/:id
 * Remove um relatório
 */
router.delete(
  '/reports/:id',
  authGuard,
  requireRole(['professional']),
  asyncHandler(controllers.deleteReportController),
)

export { router as reportsRouter }
