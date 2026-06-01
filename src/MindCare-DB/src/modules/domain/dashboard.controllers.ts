import type { Request, Response } from 'express'
import { eq, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { patients, appointments, documents, emotionLogs } from '../../db/schema/index.js'
import { AppError } from '../../shared/errors.js'

export async function getDashboardSummaryController(req: Request, res: Response) {
  const patientList = await db
    .select()
    .from(patients)
    .where(eq(patients.userId, req.user!.id))

  if (patientList.length === 0) {
    throw new AppError(404, 'Perfil de paciente não encontrado')
  }

  const patientId = patientList[0]!.id

  const [apptResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(appointments)
    .where(eq(appointments.patientId, patientId))

  const [docResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documents)
    .where(eq(documents.patientId, patientId))

  const moodLogs = await db
    .select()
    .from(emotionLogs)
    .where(eq(emotionLogs.patientId, patientId))
    .orderBy(emotionLogs.createdAt)

  const uniqueMoodDays = new Set(
    moodLogs.map((l) => {
      const d = new Date(l.createdAt)
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    }),
  ).size

  res.json({
    appointmentsCount: apptResult?.count ?? 0,
    documentsCount: docResult?.count ?? 0,
    emotionDaysCount: uniqueMoodDays,
    emotionLogsCount: moodLogs.length,
  })
}
