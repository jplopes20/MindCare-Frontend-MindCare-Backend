import type { Request, Response } from 'express'
import { eq, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import {
  users,
  patients,
  healthProfessionals,
  appointments,
} from '../../db/schema/index.js'
import { AppError } from '../../shared/errors.js'

export async function getAdminMetricsController(req: Request, res: Response) {
  const [patientCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(patients)

  const [professionalCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(healthProfessionals)

  const [appointmentCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(appointments)

  const statusRows = await db
    .select({
      status: appointments.status,
      count: sql<number>`count(*)::int`,
    })
    .from(appointments)
    .groupBy(appointments.status)

  const appointmentsByStatus: Record<string, number> = {
    requested: 0,
    scheduled: 0,
    confirmed: 0,
    rescheduled: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
  }
  for (const row of statusRows) {
    appointmentsByStatus[row.status] = row.count
  }

  const [last30DaysCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(appointments)
    .where(
      sql`${appointments.createdAt} >= now() - interval '30 days'`,
    )

  const [userCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)

  res.json({
    totalPatients: patientCount?.count ?? 0,
    totalProfessionals: professionalCount?.count ?? 0,
    totalAppointments: appointmentCount?.count ?? 0,
    appointmentsByStatus,
    appointmentsLast30Days: last30DaysCount?.count ?? 0,
    totalUsers: userCount?.count ?? 0,
  })
}

export async function getAdminUsersController(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
  const offset = (page - 1) * limit

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.id)
    .limit(limit)
    .offset(offset)

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)

  res.json({
    users: rows,
    total: totalResult?.count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((totalResult?.count ?? 0) / limit),
  })
}

export async function deleteUserController(req: Request, res: Response) {
  const { id } = req.params
  const userId = Number(id)

  if (!Number.isFinite(userId)) {
    throw new AppError(400, 'ID de usuário inválido')
  }

  if (userId === req.user!.id) {
    throw new AppError(403, 'Você não pode excluir a si mesmo')
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))

  if (!existing) {
    throw new AppError(404, 'Usuário não encontrado')
  }

  await db.delete(users).where(eq(users.id, userId))

  res.status(204).send()
}
