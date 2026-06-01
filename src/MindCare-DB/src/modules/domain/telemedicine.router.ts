import { Router } from 'express'
import { authGuard } from '../auth/auth.middleware.js'
import { asyncHandler } from '../../shared/async-handler.js'
import * as controllers from './telemedicine.controllers.js'

const router = Router()

// ============================================================================
// TELEMEDICINE_ROOMS ROUTES
// ============================================================================

/**
 * POST /telemedicine/rooms
 * Cria uma sala de telemedicina para uma consulta (profissional ou admin)
 */
router.post(
  '/telemedicine/rooms',
  authGuard,
  asyncHandler(controllers.createTelemedicineRoomController),
)

/**
 * GET /telemedicine/rooms/:roomCode
 * Obtém informações de uma sala de telemedicina
 */
router.get(
  '/telemedicine/rooms/:roomCode',
  authGuard,
  asyncHandler(controllers.getTelemedicineRoomController),
)

/**
 * PUT /telemedicine/rooms/:roomCode/status
 * Atualiza o status de uma sala (waiting, active, closed)
 */
router.put(
  '/telemedicine/rooms/:roomCode/status',
  authGuard,
  asyncHandler(controllers.updateTelemedicineRoomStatusController),
)

/**
 * GET /telemedicine/rooms/:roomCode/messages
 * Lista todas as mensagens de uma sala
 */
router.get(
  '/telemedicine/rooms/:roomCode/messages',
  authGuard,
  asyncHandler(controllers.getTelemedicineMessagesController),
)

/**
 * POST /telemedicine/rooms/:roomCode/messages
 * Envia uma mensagem em uma sala (salva no DB)
 * Socket.io enviar/receber em tempo real (ver socket-handlers.ts)
 */
router.post(
  '/telemedicine/rooms/:roomCode/messages',
  authGuard,
  asyncHandler(controllers.saveTelemedicineMessageController),
)

export { router as telemedicineRouter }
