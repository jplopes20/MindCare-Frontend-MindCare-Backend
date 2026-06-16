import type { Request } from 'express'
import { db } from '../db/index.js'
import { auditLogs } from '../db/schema/index.js'

export async function logAudit(req: Request, params: {
  action: string
  entity?: string
  entityId?: number
  metadata?: Record<string, unknown>
}) {
  await db.insert(auditLogs).values({
    userId: req.user?.id ?? null,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    ipAddress: (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0] || req.ip,
    userAgent: req.headers['user-agent'],
    metadata: params.metadata,
  })
}
