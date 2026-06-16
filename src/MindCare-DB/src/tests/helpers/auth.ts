import jwt from 'jsonwebtoken'
import { getJwtSecret } from '../../modules/auth/jwt-secret.js'

export function signTokenFor(user: { id: number; email: string; role: 'patient' | 'professional' | 'admin' }, expiresIn = '24h') {
  return jwt.sign({ sub: String(user.id), email: user.email, role: user.role }, getJwtSecret(), { expiresIn })
}

export function expiredToken(user: { id: number; email: string; role: string }) {
  return jwt.sign(
    { sub: String(user.id), email: user.email, role: user.role, exp: Math.floor(Date.now() / 1000) - 60 },
    getJwtSecret(),
  )
}
