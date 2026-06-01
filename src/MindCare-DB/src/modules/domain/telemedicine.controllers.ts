import type { Request, Response } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import {
  telemedicineRooms,
  telemedicineMessages,
  appointments,
} from '../../db/schema/index.js'
import { AppError } from '../../shared/errors.js'
import { parseBody } from '../../shared/validate.js'
import { createTelemedicineRoomSchema, sendMessageSchema } from './schemas.js'

/**
 * Gera um código de sala único (8 caracteres)
 */
function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

// ============================================================================
// TELEMEDICINE_ROOMS CONTROLLERS
// ============================================================================

export async function createTelemedicineRoomController(
  req: Request,
  res: Response,
) {
  const body = parseBody(createTelemedicineRoomSchema, req.body)

  // Busca a consulta
  const apt = await db.query.appointments.findFirst({
    where: eq(appointments.id, body.appointmentId),
  })

  if (!apt) {
    throw new AppError(404, 'Consulta não encontrada')
  }

  // Verifica se está agendada
  if (apt.status !== 'scheduled') {
    throw new AppError(400, 'Consulta deve estar agendada para criar sala')
  }

  // Verifica se já existe sala para essa consulta
  const existing = await db.query.telemedicineRooms.findFirst({
    where: eq(telemedicineRooms.appointmentId, body.appointmentId),
  })

  if (existing) {
    return res.json(existing)
  }

  // Cria nova sala
  const roomCode = generateRoomCode()

  const [room] = await db
    .insert(telemedicineRooms)
    .values({
      appointmentId: body.appointmentId,
      roomCode,
      status: 'waiting',
    })
    .returning()

  res.status(201).json(room)
}

export async function getTelemedicineRoomController(req: Request, res: Response) {
  const { roomCode } = req.params

  const room = await db.query.telemedicineRooms.findFirst({
    where: eq(telemedicineRooms.roomCode, roomCode),
    with: {
      appointment: true,
      messages: {
        orderBy: telemedicineMessages.createdAt,
      },
    },
  })

  if (!room) {
    throw new AppError(404, 'Sala não encontrada')
  }

  res.json(room)
}

export async function updateTelemedicineRoomStatusController(
  req: Request,
  res: Response,
) {
  const { roomCode } = req.params
  const { status } = req.body

  if (!['waiting', 'active', 'closed'].includes(status)) {
    throw new AppError(400, 'Status inválido')
  }

  const [updated] = await db
    .update(telemedicineRooms)
    .set({
      status,
      closedAt: status === 'closed' ? new Date() : undefined,
    })
    .where(eq(telemedicineRooms.roomCode, roomCode))
    .returning()

  if (!updated) {
    throw new AppError(404, 'Sala não encontrada')
  }

  res.json(updated)
}

// ============================================================================
// TELEMEDICINE_MESSAGES CONTROLLERS (para histórico)
// ============================================================================

export async function getTelemedicineMessagesController(
  req: Request,
  res: Response,
) {
  const { roomCode } = req.params

  const room = await db.query.telemedicineRooms.findFirst({
    where: eq(telemedicineRooms.roomCode, roomCode),
  })

  if (!room) {
    throw new AppError(404, 'Sala não encontrada')
  }

  const msgs = await db.query.telemedicineMessages.findMany({
    where: eq(telemedicineMessages.roomId, room.id),
    orderBy: telemedicineMessages.createdAt,
  })

  res.json(msgs)
}

export async function saveTelemedicineMessageController(
  req: Request,
  res: Response,
) {
  const { roomCode } = req.params
  const body = parseBody(sendMessageSchema, req.body)

  const room = await db.query.telemedicineRooms.findFirst({
    where: eq(telemedicineRooms.roomCode, roomCode),
  })

  if (!room) {
    throw new AppError(404, 'Sala não encontrada')
  }

  const [message] = await db
    .insert(telemedicineMessages)
    .values({
      roomId: room.id,
      userId: req.user!.id,
      content: body.content,
    })
    .returning()

  res.status(201).json(message)
}
