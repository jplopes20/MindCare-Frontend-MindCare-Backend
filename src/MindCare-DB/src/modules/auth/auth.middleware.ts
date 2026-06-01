import type { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import type { JwtPayload } from 'jsonwebtoken'
import { AppError } from '../../shared/errors.js'
import { getJwtSecret } from './jwt-secret.js'

export const authGuard: RequestHandler = (req, _res, next) => {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      throw new AppError(401, 'Token ausente')
    }
    const token = header.slice('Bearer '.length).trim()
    if (!token) {
      throw new AppError(401, 'Token ausente')
    }

    const payload = jwt.verify(token, getJwtSecret()) as JwtPayload & {
      email?: string
      role?: string
    }

    const id = Number(payload.sub)
    if (!Number.isFinite(id) || !payload.email || !payload.role) {
      throw new AppError(401, 'Token inválido')
    }

    if (
      payload.role !== 'patient' &&
      payload.role !== 'professional' &&
      payload.role !== 'admin'
    ) {
      throw new AppError(401, 'Token inválido')
    }

    req.user = {
      id,
      email: payload.email,
      role: payload.role,
    }
    next()
  } catch (err) {
    if (err instanceof AppError) {
      next(err)
      return
    }
    next(new AppError(401, 'Token inválido ou expirado'))
  }
}
