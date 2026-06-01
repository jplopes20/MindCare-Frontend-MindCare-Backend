import type { RequestHandler } from 'express'
import { checkRateLimit, getRateLimitStatus } from './redis.js'
import { AppError } from './errors.js'

/**
 * Middleware de Rate Limiting com Redis
 * Limita requisições por IP/usuário
 * Default: 100 requisições por minuto
 */
export const rateLimitMiddleware: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    // Usa IP do cliente como identificador
    const identifier = (req.ip || req.socket.remoteAddress || 'unknown').toString()

    const allowed = await checkRateLimit(identifier)

    if (!allowed) {
      const status = await getRateLimitStatus(identifier)
      res.set('X-RateLimit-Limit', String(status.limit))
      res.set('X-RateLimit-Remaining', '0')
      res.set('X-RateLimit-Reset', String(Date.now() + 60000))

      throw new AppError(
        429,
        `Muitas requisições. Máximo: ${status.limit} por minuto`,
      )
    }

    const status = await getRateLimitStatus(identifier)
    res.set('X-RateLimit-Limit', String(status.limit))
    res.set('X-RateLimit-Remaining', String(status.remaining))

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Opcional: Rate limit por usuário autenticado (em vez de IP)
 */
export const rateLimitByUserMiddleware: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.user) {
      return next()
    }

    const identifier = `user:${req.user.id}`
    const allowed = await checkRateLimit(identifier)

    if (!allowed) {
      const status = await getRateLimitStatus(identifier)
      throw new AppError(
        429,
        `Muitas requisições. Máximo: ${status.limit} por minuto`,
      )
    }

    next()
  } catch (error) {
    next(error)
  }
}
