import { describe, it, expect } from 'vitest'
import { AppError } from '../../shared/errors.js'

describe('AppError', () => {
  it('deve criar instância com statusCode e message', () => {
    const err = new AppError(404, 'Não encontrado')
    expect(err.statusCode).toBe(404)
    expect(err.message).toBe('Não encontrado')
  })

  it('deve ser uma instância de Error', () => {
    const err = new AppError(500, 'Erro interno')
    expect(err).toBeInstanceOf(Error)
  })

  it('deve ter name igual a "AppError"', () => {
    const err = new AppError(400, 'Requisição inválida')
    expect(err.name).toBe('AppError')
  })

  it('deve funcionar com statusCode 0', () => {
    const err = new AppError(0, 'Desconhecido')
    expect(err.statusCode).toBe(0)
  })

  it('deve suportar mensagens vazias', () => {
    const err = new AppError(204, '')
    expect(err.message).toBe('')
    expect(err.statusCode).toBe(204)
  })
})
