import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { patients, healthProfessionals } from '../../db/schema/index.js'
import { authGuard } from '../auth/auth.middleware.js'
import { requireRole } from '../auth/rbac.middleware.js'
import { asyncHandler } from '../../shared/async-handler.js'
import { AppError } from '../../shared/errors.js'
import { auditAccess } from '../../shared/audit-access.middleware.js'
import * as controllers from './controllers.js'

const router = Router()

// ============================================================================
// PATIENTS ROUTES
// ============================================================================

/**
 * POST /patients
 * Cria um novo perfil de paciente (requer autenticação, paciente)
 */
router.post(
  '/patients',
  authGuard,
  requireRole(['patient']),
  asyncHandler(controllers.createPatientController),
)

/**
 * GET /patients/me
 * Obtém o perfil do paciente autenticado
 */
router.get(
  '/patients/me',
  authGuard,
  requireRole(['patient']),
  auditAccess('patients'),
  asyncHandler(controllers.getMyPatientProfileController),
)

/**
 * PUT /patients/me
 * Atualiza o perfil do paciente autenticado
 */
router.put(
  '/patients/me',
  authGuard,
  requireRole(['patient']),
  asyncHandler(controllers.updateMyPatientProfileController),
)

/**
 * GET /patients/:id
 * Obtém dados de um paciente por ID
 * Pacientes só veem a si mesmos, profissionais veem seus pacientes, admin vê todos
 */
router.get(
  '/patients/:id',
  authGuard,
  auditAccess('patients'),
  asyncHandler(async (req, res, next) => {
    const { id } = req.params
    const userId = Number(id)

    // Validação RBAC por controller
    if (req.user!.role === 'patient' && req.user!.id !== userId) {
      throw new Error('403') // Será capturado no middleware de erro
    }

    return controllers.getPatientByIdController(req, res)
  }),
)

/**
 * GET /patients
 * Lista todos os pacientes (apenas admin)
 */
router.get(
  '/patients',
  authGuard,
  requireRole(['admin']),
  auditAccess('patients'),
  asyncHandler(controllers.getAllPatientsController),
)

/**
 * DELETE /patients/:id
 * Deleta um paciente (admin ou o próprio paciente)
 */
router.delete(
  '/patients/:id',
  authGuard,
  asyncHandler(async (req, res, next) => {
    const { id } = req.params
    const patientId = Number(id)

    if (req.user!.role === 'patient') {
      // Verificar se é o próprio
      const patient = await db
        .select()
        .from(patients)
        .where(eq(patients.id, patientId))
        .limit(1)
      if (patient[0]?.userId !== req.user!.id) {
        throw new Error('403')
      }
    } else if (req.user!.role !== 'admin') {
      throw new Error('403')
    }

    return controllers.deletePatientController(req, res)
  }),
)

// ============================================================================
// HEALTH_PROFESSIONALS ROUTES
// ============================================================================

/**
 * POST /professionals
 * Cria um novo perfil de profissional de saúde (requer autenticação, professional)
 */
router.post(
  '/professionals',
  authGuard,
  requireRole(['professional']),
  asyncHandler(controllers.createHealthProfessionalController),
)

/**
 * GET /professionals/me
 * Obtém o perfil do profissional autenticado
 */
router.get(
  '/professionals/me',
  authGuard,
  requireRole(['professional']),
  auditAccess('health_professionals'),
  asyncHandler(controllers.getMyProfessionalProfileController),
)

/**
 * PUT /professionals/me
 * Atualiza o perfil do profissional autenticado
 */
router.put(
  '/professionals/me',
  authGuard,
  requireRole(['professional']),
  asyncHandler(controllers.updateMyProfessionalProfileController),
)

/**
 * GET /professionals/:id
 * Obtém dados de um profissional por ID (público)
 */
router.get(
  '/professionals/:id',
  auditAccess('health_professionals'),
  asyncHandler(controllers.getProfessionalByIdController),
)

/**
 * GET /professionals
 * Lista todos os profissionais (público)
 */
router.get(
  '/professionals',
  auditAccess('health_professionals'),
  asyncHandler(controllers.getAllProfessionalsController),
)

/**
 * GET /professionals/me/patients
 * Lista pacientes vinculados ao profissional autenticado
 */
router.get(
  '/professionals/me/patients',
  authGuard,
  requireRole(['professional']),
  auditAccess('patients'),
  asyncHandler(controllers.getMyPatientsController),
)

/**
 * GET /professionals/me/all-patients
 * Retorna todos os pacientes (com busca opcional) para o profissional
 */
router.get(
  '/professionals/me/all-patients',
  authGuard,
  requireRole(['professional', 'admin']),
  auditAccess('patients'),
  asyncHandler(controllers.getAllPatientsForProfessionalController),
)

/**
 * POST /professionals/link-patient
 * Vincula um paciente ao profissional autenticado
 */
router.post(
  '/professionals/link-patient',
  authGuard,
  requireRole(['professional']),
  asyncHandler(controllers.linkPatientController),
)

/**
 * GET /professionals/me/summary
 * Métricas agregadas do profissional autenticado
 */
router.get(
  '/professionals/me/summary',
  authGuard,
  requireRole(['professional']),
  auditAccess('health_professionals'),
  asyncHandler(controllers.getProfessionalSummaryController),
)

/**
 * DELETE /professionals/:id
 * Deleta um profissional (admin ou o próprio)
 */
router.delete(
  '/professionals/:id',
  authGuard,
  asyncHandler(async (req, res, next) => {
    const { id } = req.params
    const professionalId = Number(id)

    if (req.user!.role === 'professional') {
      // Verificar se é o próprio
      const prof = await db
        .select()
        .from(healthProfessionals)
        .where(eq(healthProfessionals.id, professionalId))
        .limit(1)
      if (prof[0]?.userId !== req.user!.id) {
        throw new Error('403')
      }
    } else if (req.user!.role !== 'admin') {
      throw new Error('403')
    }

    return controllers.deleteProfessionalController(req, res)
  }),
)

export { router as patientsProfessionalsRouter }
