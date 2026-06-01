import type { RequestHandler } from 'express'
import { AppError } from '../../shared/errors.js'

/**
 * Middleware RBAC (Role-Based Access Control)
 * Verifica se o usuário autenticado tem um dos roles permitidos
 * @param allowedRoles Array de roles permitidos (ex: ['admin', 'professional'])
 */
export function requireRole(allowedRoles: string[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      throw new AppError(401, 'Usuário não autenticado')
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        403,
        `Acesso negado. Roles permitidos: ${allowedRoles.join(', ')}`,
      )
    }

    next()
  }
}
