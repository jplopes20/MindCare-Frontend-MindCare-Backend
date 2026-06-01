import React, { useState, useEffect, useRef } from 'react'
import { getAppointmentMessages, sendAppointmentMessage } from '../services/appointments.js'
import { getToken } from '../services/api.js'

export default function AppointmentChat({ appointmentId, currentUserId, currentUserName, onClose }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)

  useEffect(() => {
    loadMessages()
    connectSocket()
    return () => disconnectSocket()
  }, [appointmentId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function loadMessages() {
    setLoading(true)
    try {
      const data = await getAppointmentMessages(appointmentId)
      setMessages(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err)
    } finally {
      setLoading(false)
    }
  }

  function connectSocket() {
    const token = getToken()
    if (!token) return

    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
    const socket = new WebSocket(`${socketUrl.replace(/^http/, 'ws')}/ws?token=${token}`)

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'join', room: `appointment:${appointmentId}` }))
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'appointment:message') {
          setMessages((prev) => [...prev, data.message])
        }
      } catch (e) {
        // ignore
      }
    }

    socket.onclose = () => {
      // will reconnect
    }

    socketRef.current = socket
  }

  function disconnectSocket() {
    if (socketRef.current) {
      try {
        socketRef.current.send(JSON.stringify({ type: 'leave', room: `appointment:${appointmentId}` }))
        socketRef.current.close()
      } catch (e) {
        // ignore
      }
    }
  }

  async function handleSend() {
    if (!newMessage.trim()) return
    setSending(true)
    try {
      const msg = await sendAppointmentMessage(appointmentId, newMessage.trim())
      setMessages((prev) => [...prev, msg])
      setNewMessage('')
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err)
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 360,
        border: '1px solid rgba(0,212,255,0.2)',
        overflow: 'hidden',
        padding: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(0,0,0,0.1)',
        }}
      >
        <strong style={{ fontSize: 14 }}>Chat da Consulta</strong>
        <button className="btn-ghost" onClick={onClose} style={{ fontSize: 12 }}>
          Fechar
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {loading ? (
          <div className="loading" style={{ padding: 20 }}>Carregando...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', opacity: 0.5, padding: 24, fontSize: 13 }}>
            Nenhuma mensagem ainda. Envie uma mensagem para negociar o horário.
          </div>
        ) : (
          messages.map((msg, i) => {
            const isOwn = msg.senderId === currentUserId
            return (
              <div
                key={msg.id || i}
                style={{
                  background: isOwn ? 'rgba(15,185,177,0.15)' : 'rgba(255,255,255,0.06)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  maxWidth: '85%',
                  alignSelf: isOwn ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 2 }}>
                  {isOwn ? 'Você' : msg.senderId}
                </div>
                <div style={{ fontSize: 13, wordBreak: 'break-word' }}>{msg.message}</div>
                <div style={{ fontSize: 10, opacity: 0.3, marginTop: 4 }}>
                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('pt-BR') : ''}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '10px 14px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          style={{
            flex: 1,
            padding: '8px 10px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(0,0,0,0.2)',
            color: '#fff',
            fontSize: 13,
          }}
          disabled={sending}
        />
        <button
          className="btn"
          onClick={handleSend}
          disabled={sending || !newMessage.trim()}
          style={{ padding: '8px 14px', fontSize: 13 }}
        >
          {sending ? '...' : 'Enviar'}
        </button>
      </div>
    </div>
  )
}
