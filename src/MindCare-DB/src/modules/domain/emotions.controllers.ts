import type { Request, Response } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { patients, emotionLogs } from '../../db/schema/index.js'
import { AppError } from '../../shared/errors.js'
import { parseBody } from '../../shared/validate.js'
import { createEmotionLogSchema } from './schemas.js'
import * as services from './services.js'
import { emitMoodEntryCreated } from './socket-handlers.js'
import type { Server } from 'socket.io'

export async function createEmotionLogController(req: Request, res: Response) {
  const body = parseBody(createEmotionLogSchema, req.body)

  const patientList = await db
    .select()
    .from(patients)
    .where(eq(patients.userId, req.user!.id))

  if (patientList.length === 0) {
    throw new AppError(404, 'Perfil de paciente não encontrado')
  }

  const patientId = patientList[0]!.id
  const log = await services.createEmotionLog(patientId, body)

  if (!log) {
    throw new AppError(500, 'Erro ao criar registro de humor')
  }

  // Emite evento Socket.io dedicado para atualização em tempo real do gráfico
  const io: Server = (req as any).app.locals.io
  if (io) {
    emitMoodEntryCreated(io, patientId, log as unknown as Record<string, unknown>)
  }

  res.status(201).json(log)
}

export async function getMyEmotionLogsController(req: Request, res: Response) {
  const patientList = await db
    .select()
    .from(patients)
    .where(eq(patients.userId, req.user!.id))

  if (patientList.length === 0) {
    throw new AppError(404, 'Perfil de paciente não encontrado')
  }

  const days = req.query.days ? Number(req.query.days) : 7
  const logs = await services.getEmotionLogsByPatient(patientList[0]!.id, days)
  res.json(logs)
}

export async function getPatientEmotionLogsController(req: Request, res: Response) {
  const { patientId } = req.params
  const pid = Number(patientId)

  if (!Number.isFinite(pid)) {
    throw new AppError(400, 'patientId inválido')
  }

  const days = req.query.days ? Number(req.query.days) : 7
  const logs = await services.getEmotionLogsByPatient(pid, days)
  res.json(logs)
}
