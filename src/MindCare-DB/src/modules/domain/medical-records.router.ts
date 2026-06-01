import { Router } from 'express'
import { authGuard } from '../auth/auth.middleware.js'
import { requireRole } from '../auth/rbac.middleware.js'
import { asyncHandler } from '../../shared/async-handler.js'
import * as controllers from './medical-records.controllers.js'

const router = Router()

// ============================================================================
// MEDICAL_RECORDS ROUTES
// ============================================================================

/**
 * POST /medical-records
 * Cria um novo prontuário (profissional)
 */
router.post(
  '/medical-records',
  authGuard,
  requireRole(['professional']),
  asyncHandler(controllers.createMedicalRecordController),
)

/**
 * GET /medical-records/me
 * Lista prontuários do paciente autenticado
 * PRECISA vir antes de /:id para evitar que "me" seja capturado como :id
 */
router.get(
  '/medical-records/me',
  authGuard,
  requireRole(['patient']),
  asyncHandler(controllers.getMyMedicalRecordsController),
)

/**
 * GET /medical-records/:id
 * Obtém um prontuário por ID
 * Paciente só vê seu prontuário, profissional vê seus registros, admin vê todos
 */
router.get(
  '/medical-records/:id',
  authGuard,
  asyncHandler(controllers.getMedicalRecordController),
)

/**
 * GET /patients/:patientId/medical-records
 * Lista prontuários de um paciente (profissional)
 */
router.get(
  '/patients/:patientId/medical-records',
  authGuard,
  requireRole(['professional']),
  asyncHandler(controllers.getPatientMedicalRecordsController),
)

/**
 * POST /medical-records/:recordId/diagnoses
 * Adiciona diagnóstico a um prontuário (profissional)
 */
router.post(
  '/medical-records/:recordId/diagnoses',
  authGuard,
  requireRole(['professional']),
  asyncHandler(controllers.addDiagnosisController),
)

/**
 * POST /medical-records/:recordId/prescriptions
 * Adiciona prescrição a um prontuário (profissional)
 */
router.post(
  '/medical-records/:recordId/prescriptions',
  authGuard,
  requireRole(['professional']),
  asyncHandler(controllers.addPrescriptionController),
)

/**
 * GET /medical-records/:recordId/pdf
 * Gera PDF do prontuário
 * Retorna documento PDF para download
 */
router.get(
  '/medical-records/:recordId/pdf',
  authGuard,
  asyncHandler(controllers.generateMedicalRecordPdfController),
)

export { router as medicalRecordsRouter }
