import type { ZodType } from 'zod'
import { prettifyError } from 'zod'
import { AppError } from './errors.js'

export function parseBody<O = unknown, I = unknown>(
  schema: ZodType<O, I>,
  body: unknown,
): O {
  const result = schema.safeParse(body)
  if (!result.success) {
    throw new AppError(400, prettifyError(result.error))
  }
  return result.data
}
