import type { ZodType } from 'zod'
import { prettifyError } from 'zod'
import { AppError } from './errors.js'

function formatZodError(err: import('zod').ZodError): string {
  const unrecognized = err.issues.filter(i => i.code === 'unrecognized_keys')
  if (unrecognized.length > 0) {
    const keys = unrecognized.flatMap(i => (i as any).keys ?? [])
    return `Campos não permitidos: ${keys.join(', ')} (RN011 – minimização)`
  }
  return prettifyError(err)
}

export function parseBody<O = unknown, I = unknown>(
  schema: ZodType<O, I>,
  body: unknown,
): O {
  const result = schema.safeParse(body)
  if (!result.success) {
    throw new AppError(400, formatZodError(result.error))
  }
  return result.data
}
