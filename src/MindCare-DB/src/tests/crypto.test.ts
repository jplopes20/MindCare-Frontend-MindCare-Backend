import { describe, it, expect, beforeAll } from 'vitest'

process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

const { encrypt, decrypt, encryptFields, decryptFields, hashField } = await import('../shared/crypto.js')

describe('crypto utils', () => {
  it('encrypt(x) and decrypt(encrypt(x)) === x', () => {
    const plain = '12345678901'
    const enc = encrypt(plain)
    expect(enc).toMatch(/^v1:/)
    expect(decrypt(enc)).toBe(plain)
  })

  it('decrypt(null) === null', () => {
    expect(decrypt(null)).toBe(null)
  })

  it('decrypt(undefined) === null', () => {
    expect(decrypt(undefined)).toBe(null)
  })

  it('legacy data without v1: prefix passes through', () => {
    expect(decrypt('legacy-value')).toBe('legacy-value')
  })

  it('encrypt("") returns null', () => {
    expect(encrypt('')).toBe(null)
  })

  it('encryptFields and decryptFields round-trip', () => {
    const obj = { cpf: '12345678901', phone: '11999999999', address: 'Rua X', name: 'João' }
    const enc = encryptFields(obj, ['cpf', 'phone', 'address'])
    expect(enc.cpf).toMatch(/^v1:/)
    expect(enc.phone).toMatch(/^v1:/)
    expect(enc.address).toMatch(/^v1:/)
    expect(enc.name).toBe('João')

    const dec = decryptFields(enc, ['cpf', 'phone', 'address'])
    expect(dec.cpf).toBe('12345678901')
    expect(dec.phone).toBe('11999999999')
    expect(dec.address).toBe('Rua X')
    expect(dec.name).toBe('João')
  })

  it('hashField produces consistent SHA-256', () => {
    const h1 = hashField('12345678901')
    const h2 = hashField('12345678901')
    expect(h1).toBe(h2)
    expect(h1).toHaveLength(64)
  })

  it('hashField(null) returns null', () => {
    expect(hashField(null)).toBe(null)
  })

  it('different inputs produce different hashes', () => {
    const h1 = hashField('abc')
    const h2 = hashField('xyz')
    expect(h1).not.toBe(h2)
  })
})
