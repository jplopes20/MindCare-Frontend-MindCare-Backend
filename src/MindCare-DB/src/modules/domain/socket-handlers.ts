import type { Server, Socket } from 'socket.io'
import { db } from '../../db/index.js'
import { telemedicineMessages, telemedicineRooms } from '../../db/schema/index.js'
import { eq } from 'drizzle-orm'

/**
 * Configuração e handlers de Socket.io para telemedicina em tempo real
 * 
 * Eventos:
 * - join_room: Usuário entra em uma sala
 * - send_message: Envia mensagem (broadcast para todos na sala)
 * - receive_message: Recebe mensagem (todos recebem)
 * - leave_room: Usuário sai da sala
 * - room_status_changed: Status da sala muda (waiting -> active -> closed)
 * - join_mood_room: Usuário entra na sala de mood para receber atualizações
 * - mood_entry_created: Nova emoção registrada (broadcast para a sala do paciente)
 * - send_message / receive_message: usado também para sinalização WebRTC (type: 'signal')
 *   e para notificações de estado de tela compartilhada (type: 'screen_sharing_status')
 */

interface SocketUser {
  userId: number
  email: string
  role: string
}

export function setupTelemedicineSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.io] Usuário conectado: ${socket.id}`)

    // ========================================================================
    // join_mood_room: Paciente entra na sala de mood
    // ========================================================================
    socket.on('join_mood_room', (data: { patientId: number }) => {
      const roomName = `mood:${data.patientId}`
      socket.join(roomName)
      console.log(`[Socket.io] Socket ${socket.id} entrou no mood room ${roomName}`)
    })

    // ========================================================================
    // leave_mood_room: Paciente sai da sala de mood
    // ========================================================================
    socket.on('leave_mood_room', (data: { patientId: number }) => {
      const roomName = `mood:${data.patientId}`
      socket.leave(roomName)
      console.log(`[Socket.io] Socket ${socket.id} saiu do mood room ${roomName}`)
    })

    // ========================================================================
    // join_room: Usuário entra em uma sala
    // ========================================================================
    socket.on(
      'join_room',
      async (data: { roomCode: string; user: SocketUser }) => {
        try {
          const { roomCode, user } = data

          // Busca a sala
          const room = await db.query.telemedicineRooms.findFirst({
            where: eq(telemedicineRooms.roomCode, roomCode),
          })

          if (!room) {
            socket.emit('error', { message: 'Sala não encontrada' })
            return
          }

          // Adiciona socket a uma "room" do Socket.io
          socket.join(roomCode)

          console.log(
            `[Socket.io] ${user.email} entrou na sala: ${roomCode}`,
          )

          // Atualiza status se for a primeira pessoa entrando
          if (room.status === 'waiting') {
            await db
              .update(telemedicineRooms)
              .set({ status: 'active' })
              .where(eq(telemedicineRooms.roomCode, roomCode))

            io.to(roomCode).emit('room_status_changed', { status: 'active' })
          }

          // Notifica outros usuários
          io.to(roomCode).emit('user_joined', {
            user,
            message: `${user.email} entrou na sala`,
            timestamp: new Date(),
          })

          socket.emit('joined_room', { roomCode, status: room.status })
        } catch (error) {
          console.error('[Socket.io] Erro ao entrar na sala:', error)
          socket.emit('error', { message: 'Erro ao entrar na sala' })
        }
      },
    )

    // ========================================================================
    // send_message: Envia mensagem (broadcast)
    // ========================================================================
    socket.on(
      'send_message',
      async (data: {
        roomCode: string
        content: string
        user: SocketUser
      }) => {
        try {
          const { roomCode, content, user } = data

          // Salva no DB
          const room = await db.query.telemedicineRooms.findFirst({
            where: eq(telemedicineRooms.roomCode, roomCode),
          })

          if (!room) {
            socket.emit('error', { message: 'Sala não encontrada' })
            return
          }

          const [message] = await db
            .insert(telemedicineMessages)
            .values({
              roomId: room.id,
              userId: user.userId,
              content,
            })
            .returning()

          // Envia para todos na sala (broadcast)
          io.to(roomCode).emit('receive_message', {
            id: message.id,
            user,
            content,
            timestamp: message.createdAt,
          })

          console.log(
            `[Socket.io] Mensagem em ${roomCode}: ${user.email} - ${content.substring(0, 50)}...`,
          )
        } catch (error) {
          console.error('[Socket.io] Erro ao enviar mensagem:', error)
          socket.emit('error', { message: 'Erro ao enviar mensagem' })
        }
      },
    )

    // ========================================================================
    // leave_room: Usuário sai
    // ========================================================================
    socket.on('leave_room', async (data: { roomCode: string; user: SocketUser }) => {
      try {
        const { roomCode, user } = data

        socket.leave(roomCode)

        io.to(roomCode).emit('user_left', {
          user,
          message: `${user.email} saiu da sala`,
          timestamp: new Date(),
        })

        console.log(`[Socket.io] ${user.email} saiu da sala: ${roomCode}`)
      } catch (error) {
        console.error('[Socket.io] Erro ao sair da sala:', error)
      }
    })

    // ========================================================================
    // disconnect: Desconexão do socket
    // ========================================================================
    socket.on('disconnect', () => {
      console.log(`[Socket.io] Usuário desconectado: ${socket.id}`)
    })
  })
}

export function emitMoodEntryCreated(io: Server, patientId: number, log: Record<string, unknown>) {
  io.to(`mood:${patientId}`).emit('mood_entry_created', log)
}

/**
 * Exemplo de uso em app.ts:
 * 
 * import { createServer } from 'http'
 * import { Server as SocketIOServer } from 'socket.io'
 * import app from './app'
 * import { setupTelemedicineSocket } from './modules/domain/socket-handlers'
 * 
 * const httpServer = createServer(app)
 * const io = new SocketIOServer(httpServer, {
 *   cors: {
 *     origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
 *     methods: ['GET', 'POST']
 *   }
 * })
 * 
 * setupTelemedicineSocket(io)
 * 
 * httpServer.listen(4000, () => {
 *   console.log('Server rodando em http://localhost:4000')
 * })
 */
