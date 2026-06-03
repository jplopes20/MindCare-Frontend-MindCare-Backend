import 'dotenv/config'

import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import app from './app.js'
import { setupTelemedicineSocket } from './modules/domain/socket-handlers.js'
import { sql } from 'drizzle-orm'
import { db } from './db/index.js'

// Captura erros não tratados (promises rejeitadas sem catch)
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED_REJECTION]', reason)
})

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT_EXCEPTION]', err.stack || err.message)
  process.exit(1)
})

// Validação de startup — falha rápido se faltar variável crítica
function getEnv(key: string): string | undefined {
  if (key === 'JWT_SECRET') {
    return process.env.JWT_SECRET || process.env['JWT-SECRET']
  }
  return process.env[key]
}

const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'] as const
for (const key of requiredEnvVars) {
  if (!getEnv(key)) {
    console.error(`[FATAL] Variável de ambiente "${key}" não configurada.`)
    process.exit(1)
  }
}

const port = Number(process.env.PORT) || 4000
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000'

// Cria servidor HTTP (necessário para Socket.io)
const httpServer = createServer(app)

// Configura Socket.io
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
  },
})

// Disponibiliza io para os controllers via app.locals
app.locals.io = io

// Setup de handlers de Socket.io para telemedicina
setupTelemedicineSocket(io)

// Testa conexão com o banco antes de subir
try {
  await db.execute(sql`SELECT 1`)
  console.log('✅ Banco de dados conectado')
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err)
  console.error('[FATAL] Erro ao conectar no banco de dados:', msg)
  process.exit(1)
}

httpServer.listen(port, () => {
  console.log(`🚀 MindCare API em http://localhost:${port}`)
  console.log(`🔌 Socket.io ativo (CORS: ${corsOrigin})`)
  console.log(`📚 Health check: GET http://localhost:${port}/health`)
})

