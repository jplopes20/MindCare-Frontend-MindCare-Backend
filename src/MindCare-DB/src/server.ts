import 'dotenv/config'

import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import app from './app.js'
import { setupTelemedicineSocket } from './modules/domain/socket-handlers.js'

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

httpServer.listen(port, () => {
  console.log(`🚀 MindCare API em http://localhost:${port}`)
  console.log(`🔌 Socket.io ativo (CORS: ${corsOrigin})`)
  console.log(`📚 Health check: GET http://localhost:${port}/health`)
})

