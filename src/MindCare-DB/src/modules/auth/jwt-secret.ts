import { AppError } from '../../shared/errors.js'

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new AppError(500, 'JWT_SECRET não configurado')
  }
  return secret
}
