import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { eq, inArray } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { users } from '../../db/schema/users.js'
import { patients, consentTerms, userConsents } from '../../db/schema/index.js'
import { AppError } from '../../shared/errors.js'
import { parseBody } from '../../shared/validate.js'
import { loginSchema, registerSchema } from './schemas.js'
import { authGuard } from './auth.middleware.js'
import { getJwtSecret } from './jwt-secret.js'

const router = Router()

function isUniqueViolation(err: unknown): boolean {
  const cause =
    typeof err === 'object' && err !== null && 'cause' in err
      ? (err as { cause: unknown }).cause
      : err
  if (typeof cause !== 'object' || cause === null) return false
  return (cause as { code?: string }).code === '23505'
}

function asyncRoute(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res, next).catch(next)
  }
}

router.post(
  '/register',
  asyncRoute(async (req, res) => {
    const body = parseBody(registerSchema, req.body)
    const passwordHash = await bcrypt.hash(body.password, 10)

    // Validate consent terms exist and are active
    const consentTermIds = body.consents.map((c) => c.consentTermId)
    const activeTerms = await db
      .select({ id: consentTerms.id })
      .from(consentTerms)
      .where(inArray(consentTerms.id, consentTermIds))

    if (activeTerms.length !== consentTermIds.length) {
      throw new AppError(400, 'Um ou mais termos de consentimento são inválidos')
    }

    try {
      const [row] = await db
        .insert(users)
        .values({
          email: body.email,
          role: body.role,
          passwordHash,
        })
        .returning({
          id: users.id,
          email: users.email,
          role: users.role,
        })

      if (!row) {
        throw new AppError(500, 'Falha ao criar usuário')
      }

      // Register consents
      await db.insert(userConsents).values(
        body.consents.map((c) => ({
          userId: row.id,
          consentTermId: c.consentTermId,
          accepted: c.accepted,
          ipAddress: req.ip,
        })),
      )

      // Auto-create patient profile (all fields optional)
      if (row.role === 'patient') {
        await db.insert(patients).values({ userId: row.id })
      }

      res.status(201).json({ user: row })
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new AppError(409, 'E-mail já cadastrado')
      }
      throw err
    }
  }),
)

router.post(
  '/login',
  asyncRoute(async (req, res) => {
    const body = parseBody(loginSchema, req.body)

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1)

    if (!user) {
      throw new AppError(401, 'Credenciais inválidas')
    }

    const match = await bcrypt.compare(body.password, user.passwordHash)
    if (!match) {
      throw new AppError(401, 'Credenciais inválidas')
    }

    const token = jwt.sign(
      {
        sub: String(user.id),
        email: user.email,
        role: user.role,
      },
      getJwtSecret(),
      { expiresIn: '24h' },
    )

    res.json({
      token,
      expiresIn: '24h',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    })
  }),
)

router.get('/me', authGuard, (req, res) => {
  res.json({ user: req.user })
})

export { router as authRouter }
