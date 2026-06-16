import crypto from 'node:crypto'

const ALGO = 'aes-256-gcm'
const KEY = Buffer.from(process.env.ENCRYPTION_KEY ?? '', 'hex')

if (KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY deve ter 32 bytes (64 caracteres hex). Gere com: openssl rand -hex 32')
}

export function encrypt(plain: string | null | undefined): string | null {
  if (plain == null || plain === '') return null
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, KEY, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`
}

export function decrypt(payload: string | null | undefined): string | null {
  if (!payload) return null
  if (!payload.startsWith('v1:')) return payload
  const [, ivHex, tagHex, dataHex] = payload.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(data), decipher.final()])
  return dec.toString('utf8')
}

export function encryptFields<T extends Record<string, unknown>>(obj: T, fields: (keyof T)[]): T {
  const out = { ...obj }
  for (const f of fields) {
    const val = out[f]
    if (typeof val === 'string') (out as any)[f] = encrypt(val)
  }
  return out
}

export function decryptFields<T extends Record<string, unknown>>(obj: T, fields: (keyof T)[]): T {
  const out = { ...obj }
  for (const f of fields) {
    const val = out[f]
    if (typeof val === 'string') (out as any)[f] = decrypt(val)
  }
  return out
}

export function hashField(value: string | null | undefined): string | null {
  if (!value) return null
  return crypto.createHash('sha256').update(value).digest('hex')
}
