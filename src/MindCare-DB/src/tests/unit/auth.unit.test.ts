import { describe, it, expect } from 'vitest'
import { loginSchema, registerSchema } from '../../modules/auth/schemas.js'

describe('loginSchema', () => {
  it('deve aceitar email e senha válidos', () => {
    const result = loginSchema.safeParse({
      email: 'user@test.com',
      password: 'abc123',
    })
    expect(result.success).toBe(true)
  })

  it('deve rejeitar quando email está ausente', () => {
    const result = loginSchema.safeParse({ password: 'abc123' })
    expect(result.success).toBe(false)
  })

  it('deve rejeitar email malformado', () => {
    const result = loginSchema.safeParse({
      email: 'invalido',
      password: 'abc123',
    })
    expect(result.success).toBe(false)
  })

  it('deve rejeitar senha vazia', () => {
    const result = loginSchema.safeParse({
      email: 'user@test.com',
      password: '',
    })
    expect(result.success).toBe(false)
  })
})

const validConsents = [{ consentTermId: 1, accepted: true }]

describe('registerSchema', () => {
  it('deve aceitar registro válido com role patient', () => {
    const result = registerSchema.safeParse({
      email: 'new@test.com',
      password: '12345678',
      role: 'patient',
      consents: validConsents,
    })
    expect(result.success).toBe(true)
  })

  it('deve aceitar registro válido com role professional', () => {
    const result = registerSchema.safeParse({
      email: 'prof@test.com',
      password: '12345678',
      role: 'professional',
      consents: validConsents,
    })
    expect(result.success).toBe(true)
  })

  it('deve aceitar registro válido com role admin', () => {
    const result = registerSchema.safeParse({
      email: 'admin@test.com',
      password: '12345678',
      role: 'admin',
      consents: validConsents,
    })
    expect(result.success).toBe(true)
  })

  it('deve rejeitar role inválido', () => {
    const result = registerSchema.safeParse({
      email: 'user@test.com',
      password: '12345678',
      role: 'superuser',
      consents: validConsents,
    })
    expect(result.success).toBe(false)
  })

  it('deve rejeitar quando email está ausente', () => {
    const result = registerSchema.safeParse({
      password: '12345678',
      role: 'patient',
      consents: validConsents,
    })
    expect(result.success).toBe(false)
  })

  it('deve rejeitar senha com menos de 8 caracteres', () => {
    const result = registerSchema.safeParse({
      email: 'user@test.com',
      password: '123',
      role: 'patient',
      consents: validConsents,
    })
    expect(result.success).toBe(false)
  })

  it('deve rejeitar quando consents está ausente', () => {
    const result = registerSchema.safeParse({
      email: 'user@test.com',
      password: '12345678',
      role: 'patient',
    })
    expect(result.success).toBe(false)
  })

  it('deve rejeitar quando consents tem campo extra', () => {
    const result = registerSchema.safeParse({
      email: 'user@test.com',
      password: '12345678',
      role: 'patient',
      consents: validConsents,
      extraField: 'x',
    })
    expect(result.success).toBe(false)
  })
})
