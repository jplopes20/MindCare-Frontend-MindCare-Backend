import { Router } from 'express'
import { desc } from 'drizzle-orm'
import { authGuard } from '../auth/auth.middleware.js'
import { requireRole } from '../auth/rbac.middleware.js'
import { asyncHandler } from '../../shared/async-handler.js'
import { db } from '../../db/index.js'
import { aiLogs } from '../../db/schema/index.js'
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

router.get(
  '/admin/ai-logs',
  authGuard,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page ?? 1))
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)))
    const offset = (page - 1) * limit

    const logs = await db
      .select()
      .from(aiLogs)
      .orderBy(desc(aiLogs.createdAt))
      .limit(limit)
      .offset(offset)

    res.json({ logs, page, limit })
  }),
)

export { router as adminRouter }
