import type { Request, Response } from 'express'
import { eq, and, desc, sql, count } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { notifications } from '../../db/schema/index.js'
import { AppError } from '../../shared/errors.js'

export async function listNotificationsController(
  req: Request,
  res: Response,
) {
  const userId = req.user!.id
  const status = req.query.status as string | undefined

  const whereClause =
    status && ['unread', 'read', 'archived'].includes(status)
      ? and(eq(notifications.userId, userId), eq(notifications.status, status as 'unread' | 'read' | 'archived'))
      : eq(notifications.userId, userId)

  const rows = await db
    .select()
    .from(notifications)
    .where(whereClause)
    .orderBy(desc(notifications.sentAt))
    .limit(50)

  const [unreadResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.status, 'unread')),
    )

  res.json({
    notifications: rows,
    unreadCount: unreadResult?.count ?? 0,
  })
}

export async function markAsReadController(req: Request, res: Response) {
  const userId = req.user!.id
  const id = Number(req.params.id)

  if (!Number.isFinite(id)) {
    throw new AppError(400, 'ID inválido')
  }

  const [updated] = await db
    .update(notifications)
    .set({ status: 'read', readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning()

  if (!updated) {
    throw new AppError(404, 'Notificação não encontrada')
  }

  res.json(updated)
}

export async function markAllAsReadController(req: Request, res: Response) {
  const userId = req.user!.id

  const updated = await db
    .update(notifications)
    .set({ status: 'read', readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.status, 'unread')))
    .returning()

  res.json({ updated: updated.length })
}

export async function archiveNotificationController(
  req: Request,
  res: Response,
) {
  const userId = req.user!.id
  const id = Number(req.params.id)

  if (!Number.isFinite(id)) {
    throw new AppError(400, 'ID inválido')
  }

  const [updated] = await db
    .update(notifications)
    .set({ status: 'archived' })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning()

  if (!updated) {
    throw new AppError(404, 'Notificação não encontrada')
  }

  res.json(updated)
}
