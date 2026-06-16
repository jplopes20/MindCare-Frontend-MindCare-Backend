import { z } from 'zod'

export const consentEntrySchema = z.object({
  consentTermId: z.number().int().positive(),
  accepted: z.boolean().refine((v) => v === true, { message: 'Você precisa aceitar os termos de consentimento' }),
})

export const registerSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  role: z.enum(['patient', 'professional', 'admin']),
  consents: z.array(consentEntrySchema).min(1, 'É necessário aceitar os termos de consentimento'),
}).strict()

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
}).strict()
