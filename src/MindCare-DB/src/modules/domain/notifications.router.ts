import { Router } from 'express'
import { authGuard } from '../auth/auth.middleware.js'
import { asyncHandler } from '../../shared/async-handler.js'
import * as controllers from './notifications.controllers.js'

const router = Router()

router.get(
  '/notifications',
  authGuard,
  asyncHandler(controllers.listNotificationsController),
)

router.patch(
  '/notifications/read-all',
  authGuard,
  asyncHandler(controllers.markAllAsReadController),
)

router.patch(
  '/notifications/:id/read',
  authGuard,
  asyncHandler(controllers.markAsReadController),
)

router.patch(
  '/notifications/:id/archive',
  authGuard,
  asyncHandler(controllers.archiveNotificationController),
)

export { router as notificationsRouter }
