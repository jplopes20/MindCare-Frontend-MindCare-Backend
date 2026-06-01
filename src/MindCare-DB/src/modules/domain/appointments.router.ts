import { Router } from 'express'
import { authGuard } from '../auth/auth.middleware.js'
import { requireRole } from '../auth/rbac.middleware.js'
import { asyncHandler } from '../../shared/async-handler.js'
import * as controllers from './appointments.controllers.js'

const router = Router()

// ============================================================================
// SPECIALTIES ROUTES
// ============================================================================

/**
 * GET /specialties
 * Lista todas as especialidades (público)
 */
router.get(
  '/specialties',
  asyncHandler(controllers.getSpecialtiesController),
)

/**
 * GET /specialties/:id
 * Obtém uma especialidade por ID (público)
 */
router.get(
  '/specialties/:id',
  asyncHandler(controllers.getSpecialtyByIdController),
)

/**
 * POST /specialties
 * Cria uma nova especialidade (admin)
 */
router.post(
  '/specialties',
  authGuard,
  requireRole(['admin']),
  asyncHandler(controllers.createSpecialtyController),
)

/**
 * PUT /specialties/:id
 * Atualiza uma especialidade (admin)
 */
router.put(
  '/specialties/:id',
  authGuard,
  requireRole(['admin']),
  asyncHandler(controllers.updateSpecialtyController),
)

/**
 * DELETE /specialties/:id
 * Deleta uma especialidade (admin)
 */
router.delete(
  '/specialties/:id',
  authGuard,
  requireRole(['admin']),
  asyncHandler(controllers.deleteSpecialtyController),
)

// ============================================================================
// WORKING_HOURS ROUTES
// ============================================================================

/**
 * GET /working-hours/me
 * Lista os horários de trabalho do profissional autenticado
 */
router.get(
  '/working-hours/me',
  authGuard,
  requireRole(['professional']),
  asyncHandler(controllers.getMyWorkingHoursController),
)

/**
 * GET /working-hours/professional/:professionalId
 * Lista horários de trabalho de um profissional (público)
 */
router.get(
  '/working-hours/professional/:professionalId',
  asyncHandler(controllers.getProfessionalWorkingHoursController),
)

/**
 * POST /working-hours
 * Cria horário de trabalho (profissional autenticado)
 */
router.post(
  '/working-hours',
  authGuard,
  requireRole(['professional']),
  asyncHandler(controllers.createWorkingHoursController),
)

/**
 * PUT /working-hours/:id
 * Atualiza horário de trabalho (profissional ou admin)
 */
router.put(
  '/working-hours/:id',
  authGuard,
  requireRole(['professional', 'admin']),
  asyncHandler(controllers.updateWorkingHoursController),
)

/**
 * DELETE /working-hours/:id
 * Deleta horário de trabalho (profissional ou admin)
 */
router.delete(
  '/working-hours/:id',
  authGuard,
  requireRole(['professional', 'admin']),
  asyncHandler(controllers.deleteWorkingHoursController),
)

// ============================================================================
// APPOINTMENTS ROUTES
// ============================================================================

/**
 * GET /appointments/available-slots
 * Query params: professionalId, date (YYYY-MM-DD)
 * Retorna slots disponíveis para agendar (público)
 */
router.get(
  '/appointments/available-slots',
  asyncHandler(controllers.getAvailableSlotsController),
)

/**
 * GET /appointments/me
 * Lista consultas do usuário autenticado (paciente ou profissional)
 */
router.get(
  '/appointments/me',
  authGuard,
  asyncHandler(controllers.getMyAppointmentsController),
)

/**
 * GET /appointments/:id
 * Obtém uma consulta por ID
 */
router.get(
  '/appointments/:id',
  authGuard,
  asyncHandler(controllers.getAppointmentController),
)

/**
 * POST /appointments
 * Cria uma nova consulta (paciente)
 */
router.post(
  '/appointments',
  authGuard,
  requireRole(['patient']),
  asyncHandler(controllers.createAppointmentController),
)

/**
 * POST /appointments/:id/cancel
 * Cancela uma consulta (paciente, profissional ou admin)
 */
router.post(
  '/appointments/:id/cancel',
  authGuard,
  requireRole(['patient', 'professional', 'admin']),
  asyncHandler(controllers.cancelAppointmentController),
)

// ============================================================================
// NEGOTIATION / CONFIRMATION ROUTES
// ============================================================================

/**
 * POST /appointments/:id/confirm
 * Confirma uma solicitação de consulta (profissional)
 */
router.post(
  '/appointments/:id/confirm',
  authGuard,
  requireRole(['professional']),
  asyncHandler(controllers.confirmAppointmentController),
)

/**
 * POST /appointments/:id/reschedule
 * Propõe novo horário (profissional)
 */
router.post(
  '/appointments/:id/reschedule',
  authGuard,
  requireRole(['professional']),
  asyncHandler(controllers.rescheduleAppointmentController),
)

/**
 * POST /appointments/:id/accept-reschedule
 * Aceita proposta de reagendamento (paciente)
 */
router.post(
  '/appointments/:id/accept-reschedule',
  authGuard,
  requireRole(['patient']),
  asyncHandler(controllers.acceptRescheduleController),
)

/**
 * POST /appointments/:id/reject-reschedule
 * Recusa proposta de reagendamento (paciente)
 */
router.post(
  '/appointments/:id/reject-reschedule',
  authGuard,
  requireRole(['patient']),
  asyncHandler(controllers.rejectRescheduleController),
)

/**
 * POST /appointments/:id/messages
 * Envia mensagem no chat da consulta (paciente ou profissional)
 */
router.post(
  '/appointments/:id/messages',
  authGuard,
  requireRole(['patient', 'professional']),
  asyncHandler(controllers.sendMessageController),
)

/**
 * GET /appointments/:id/messages
 * Lista mensagens do chat da consulta (paciente ou profissional)
 */
router.get(
  '/appointments/:id/messages',
  authGuard,
  requireRole(['patient', 'professional']),
  asyncHandler(controllers.getMessagesController),
)

export { router as appointmentsRouter }
