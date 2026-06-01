import { io } from 'socket.io-client'
import { getToken } from './api.js'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

let socket = null

export function getSocket() {
  if (!socket) {
    socket = io(BASE_URL, {
      auth: { token: getToken() },
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
