import { Router } from 'express'
import { authGuard } from '../auth/auth.middleware.js'
import { requireRole } from '../auth/rbac.middleware.js'
import { asyncHandler } from '../../shared/async-handler.js'
import * as controllers from './dashboard.controllers.js'

const router = Router()

router.get(
  '/dashboard/summary',
  authGuard,
  requireRole(['patient']),
  asyncHandler(controllers.getDashboardSummaryController),
)

export { router as dashboardRouter }
