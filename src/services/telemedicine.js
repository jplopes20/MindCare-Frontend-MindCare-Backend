import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000'

let socket = null

export function connectSocket(token) {
  if (socket?.connected) return socket

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  })

  socket.on('connect_error', (err) => {
    console.error('[Socket] connection error:', err.message)
  })

  return socket
}

export function getSocket() {
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
}

export function joinRoom(roomCode, user) {
  socket?.emit('join_room', { roomCode, user })
}

export function leaveRoom(roomCode, user) {
  socket?.emit('leave_room', { roomCode, user })
}

export function sendMessage(roomCode, content, user) {
  socket?.emit('send_message', { roomCode, content, user })
}

export function sendChatMessage(roomCode, text, user) {
  sendMessage(roomCode, JSON.stringify({ type: 'chat', text }), user)
}

export function sendSignalMessage(roomCode, signalData, user) {
  sendMessage(roomCode, JSON.stringify({ type: 'signal', signalData }), user)
}
