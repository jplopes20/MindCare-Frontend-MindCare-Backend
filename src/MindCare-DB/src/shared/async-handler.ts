import type { RequestHandler } from 'express'
import type { Request, Response, NextFunction } from 'express'

/**
 * Wrapper para rotas assíncronas que faz catch automático de erros
 * Exemplo: router.get('/users', asyncHandler(async (req, res) => {...}))
 */
export const asyncHandler =
  (handler: RequestHandler): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
