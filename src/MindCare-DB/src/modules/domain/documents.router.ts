import { Router } from 'express'
import { authGuard } from '../auth/auth.middleware.js'
import { requireRole } from '../auth/rbac.middleware.js'
import { asyncHandler } from '../../shared/async-handler.js'
import { upload } from '../../shared/upload.js'
import * as controllers from './documents.controllers.js'

const router = Router()

router.post(
  '/documents/upload',
  authGuard,
  requireRole(['patient', 'professional', 'admin']),
  upload.single('file'),
  asyncHandler(controllers.uploadDocumentController),
)

router.post(
  '/documents/upload-from-url',
  authGuard,
  requireRole(['patient', 'professional', 'admin']),
  asyncHandler(controllers.uploadFromUrlController),
)

router.post(
  '/documents/upload-from-drive',
  authGuard,
  requireRole(['patient', 'professional', 'admin']),
  asyncHandler(controllers.uploadFromDriveController),
)

router.get(
  '/documents/me',
  authGuard,
  requireRole(['patient']),
  asyncHandler(controllers.listMyDocumentsController),
)

router.get(
  '/documents/patient/:patientId',
  authGuard,
  requireRole(['professional', 'admin']),
  asyncHandler(controllers.listPatientDocumentsController),
)

router.get(
  '/documents/:id',
  authGuard,
  asyncHandler(controllers.getDocumentController),
)

router.patch(
  '/documents/:id',
  authGuard,
  requireRole(['professional', 'admin']),
  asyncHandler(controllers.updateDocumentController),
)

router.patch(
  '/documents/:id/archive',
  authGuard,
  requireRole(['patient', 'professional', 'admin']),
  asyncHandler(controllers.archiveDocumentController),
)

router.delete(
  '/documents/:id',
  authGuard,
  requireRole(['patient', 'professional', 'admin']),
  asyncHandler(controllers.deleteDocumentController),
)

export { router as documentsRouter }
