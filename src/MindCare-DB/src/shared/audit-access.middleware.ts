import type { RequestHandler } from 'express'
import { logAudit } from './audit.js'

export function auditAccess(entity: string, idParam = 'id'): RequestHandler {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode < 400) {
        void logAudit(req, {
          action: 'DATA_ACCESS',
          entity,
          entityId: Number(req.params[idParam]) || undefined,
          metadata: { method: req.method, path: req.path, status: res.statusCode },
        })
      }
    })
    next()
  }
}
