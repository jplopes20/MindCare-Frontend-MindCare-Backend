import { Router } from 'express'
import { authGuard } from '../auth/auth.middleware.js'
import { requireRole } from '../auth/rbac.middleware.js'
import { asyncHandler } from '../../shared/async-handler.js'
import * as controllers from './admin.controllers.js'

const router = Router()

router.get(
  '/admin/metrics',
  authGuard,
  requireRole(['admin']),
  asyncHandler(controllers.getAdminMetricsController),
)

router.get(
  '/admin/users',
  authGuard,
  requireRole(['admin']),
  asyncHandler(controllers.getAdminUsersController),
)

router.delete(
  '/admin/users/:id',
  authGuard,
  requireRole(['admin']),
  asyncHandler(controllers.deleteUserController),
)

export { router as adminRouter }
