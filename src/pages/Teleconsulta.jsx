import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { request } from '../services/api.js'
import {
  connectSocket,
  disconnectSocket,
  sendChatMessage,
  sendSignalMessage,
} from '../services/telemedicine.js'

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

export default function Teleconsulta() {
  const loc = useLocation()
  const qs = new URLSearchParams(loc.search)
  const apptId = qs.get('apptId')
  const { user } = useAuth()

  const [roomInfo, setRoomInfo] = useState(null)
  const [roomStatus, setRoomStatus] = useState('waiting')
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [callActive, setCallActive] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [remoteIsScreenSharing, setRemoteIsScreenSharing] = useState(false)

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const socketRef = useRef(null)
  const pcRef = useRef(null)
  const messagesEndRef = useRef(null)
  const mountedRef = useRef(true)
  const roomCodeRef = useRef(null)
  const localStreamRef = useRef(null)

  const socketUser = user
    ? { userId: user.id, email: user.email, role: user.role }
    : null

  // ----------------------------------------------------------------
  // Initialize: create/get room → connect socket → join room
  // ----------------------------------------------------------------
  useEffect(() => {
    mountedRef.current = true

    if (!apptId || !user) {
      setLoading(false)
      return
    }

    request('/api/telemedicine/rooms', {
      method: 'POST',
      body: { appointmentId: Number(apptId) },
    })
      .then((room) => {
        if (!mountedRef.current) return
        setRoomInfo(room)
        setRoomStatus(room.status)
        roomCodeRef.current = room.roomCode

        const socket = connectSocket()
        socketRef.current = socket

        socket.on('connect', () => {
          socket.emit('join_room', {
            roomCode: room.roomCode,
            user: socketUser,
          })
        })

        socket.on('joined_room', (data) => {
          if (!mountedRef.current) return
          setRoomStatus(data.status)
        })

        socket.on('receive_message', (msg) => {
          if (!mountedRef.current) return
          try {
            const parsed = JSON.parse(typeof msg.content === 'string' ? msg.content : '')
            if (parsed.type === 'chat') {
              setMessages((prev) => [
                ...prev,
                { id: msg.id, user: msg.user, text: parsed.text, timestamp: msg.timestamp },
              ])
            } else if (parsed.type === 'signal') {
              handleIncomingSignal(msg.user, parsed.signalData)
            } else if (parsed.type === 'screen_sharing_status') {
              setRemoteIsScreenSharing(parsed.isSharing)
            }
          } catch {
            setMessages((prev) => [
              ...prev,
              { id: msg.id, user: msg.user, text: msg.content, timestamp: msg.timestamp },
            ])
          }
        })

        socket.on('room_status_changed', (data) => {
          if (!mountedRef.current) return
          setRoomStatus(data.status)
        })

        socket.on('error', (err) => {
          if (!mountedRef.current) return
          setError(err.message)
        })
      })
      .catch((err) => {
        if (!mountedRef.current) return
        setError(err.message || 'Erro ao criar sala')
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false)
      })

    return () => {
      mountedRef.current = false

      const rc = roomCodeRef.current
      if (socketRef.current) {
        if (rc && socketUser) {
          socketRef.current.emit('leave_room', {
            roomCode: rc,
            user: socketUser,
          })
        }
        disconnectSocket()
        socketRef.current = null
      }

      if (pcRef.current) {
        pcRef.current.close()
        pcRef.current = null
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop())
        localStreamRef.current = null
      }
    }
  }, [apptId, user])

  // ----------------------------------------------------------------
  // Incoming WebRTC signal handler (runs inside the effect closure)
  // ----------------------------------------------------------------
  const handleIncomingSignal = useCallback(async (fromUser, signalData) => {
    if (signalData.type === 'offer') {
      if (!pcRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          })
          if (!mountedRef.current) return
          setLocalStream(stream)
          localStreamRef.current = stream
          createPeerConnection(stream)
          setCallActive(true)
        } catch {
          if (!mountedRef.current) return
          setError('Não foi possível acessar câmera/microfone.')
          return
        }
      }

      const pc = pcRef.current
      if (!pc) return

      await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      const rc = roomCodeRef.current
      if (rc && socketUser) {
        sendSignalMessage(rc, { type: 'answer', sdp: pc.localDescription }, socketUser)
      }
    } else if (signalData.type === 'answer') {
      const pc = pcRef.current
      if (!pc) return
      await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp))
    } else if (signalData.type === 'ice-candidate') {
      const pc = pcRef.current
      if (pc && signalData.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate))
        } catch {
          // ignore invalid candidates
        }
      }
    }
  }, [])

  // ----------------------------------------------------------------
  // Create RTCPeerConnection
  // ----------------------------------------------------------------
  const createPeerConnection = useCallback((stream) => {
    const pc = new RTCPeerConnection(RTC_CONFIG)
    pcRef.current = pc

    stream.getTracks().forEach((track) => pc.addTrack(track, stream))

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const rc = roomCodeRef.current
        if (rc && socketUser) {
          sendSignalMessage(rc, {
            type: 'ice-candidate',
            candidate: event.candidate.toJSON(),
          }, socketUser)
        }
      }
    }

    pc.ontrack = (event) => {
      if (mountedRef.current) {
        setRemoteStream(event.streams[0])
        setCallActive(true)
      }
    }

    pc.oniceconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.iceConnectionState)) {
        if (mountedRef.current) setCallActive(false)
      }
    }

    return pc
  }, [])

  // ----------------------------------------------------------------
  // Start local camera and initiate call
  // ----------------------------------------------------------------
  const startCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      if (!mountedRef.current) return
      setLocalStream(stream)
      localStreamRef.current = stream

      if (pcRef.current) {
        pcRef.current.close()
      }

      const pc = createPeerConnection(stream)

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const rc = roomCodeRef.current
      if (rc && socketUser) {
        sendSignalMessage(rc, { type: 'offer', sdp: pc.localDescription }, socketUser)
      }

      setCallActive(true)
    } catch {
      if (mountedRef.current) {
        setError('Não foi possível acessar câmera/microfone.')
      }
    }
  }, [createPeerConnection])

  // ----------------------------------------------------------------
  // Share screen
  // ----------------------------------------------------------------
  const shareScreen = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices
        .getDisplayMedia({ video: true, audio: true })
        .catch(() => navigator.mediaDevices.getDisplayMedia({ video: true }))

      if (!mountedRef.current) return

      setLocalStream(stream)
      localStreamRef.current = stream
      setIsScreenSharing(true)

      const rc = roomCodeRef.current
      if (rc && socketUser) {
        sendSignalMessage(rc, {
          type: 'screen_sharing_status',
          isSharing: true,
          userEmail: socketUser.email,
        }, socketUser)
      }

      if (pcRef.current) {
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video')
        if (sender) {
          await sender.replaceTrack(stream.getVideoTracks()[0])
        }
      }

      stream.getVideoTracks()[0]?.addEventListener('ended', async () => {
        if (!mountedRef.current) return

        setIsScreenSharing(false)

        const rc2 = roomCodeRef.current
        if (rc2 && socketUser) {
          sendSignalMessage(rc2, {
            type: 'screen_sharing_status',
            isSharing: false,
            userEmail: socketUser.email,
          }, socketUser)
        }

        try {
          const cam = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          if (!mountedRef.current) return
          setLocalStream(cam)
          localStreamRef.current = cam

          if (pcRef.current) {
            const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video')
            if (sender) {
              await sender.replaceTrack(cam.getVideoTracks()[0])
            }
          }
        } catch {
          // câmera não disponível após parar
        }
      })
    } catch {
      // Usuário cancelou a seleção de tela
    }
  }, [])

  const stopScreenShare = useCallback(async () => {
    if (!isScreenSharing) return

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => t.stop())
    }

    setIsScreenSharing(false)

    const rc = roomCodeRef.current
    if (rc && socketUser) {
      sendSignalMessage(rc, {
        type: 'screen_sharing_status',
        isSharing: false,
        userEmail: socketUser.email,
      }, socketUser)
    }

    try {
      const cam = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      if (!mountedRef.current) return
      setLocalStream(cam)
      localStreamRef.current = cam

      if (pcRef.current) {
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video')
        if (sender) {
          await sender.replaceTrack(cam.getVideoTracks()[0])
        }
      }
    } catch {
      // câmera não disponível
    }
  }, [isScreenSharing])

  // ----------------------------------------------------------------
  // Hang up
  // ----------------------------------------------------------------
  const hangUp = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
    setLocalStream(null)
    setRemoteStream(null)
    setCallActive(false)
  }, [])

  // ----------------------------------------------------------------
  // Send chat message
  // ----------------------------------------------------------------
  const handleSendMessage = useCallback(
    (e) => {
      e.preventDefault()
      if (!inputText.trim()) return
      const rc = roomCodeRef.current
      if (rc && socketUser) {
        sendChatMessage(rc, inputText.trim(), socketUser)
        setInputText('')
      }
    },
    [inputText],
  )

  // ----------------------------------------------------------------
  // Sync streams to video elements
  // ----------------------------------------------------------------
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // ----------------------------------------------------------------
  // Auto-scroll chat
  // ----------------------------------------------------------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ================================================================
  // RENDER
  // ================================================================
  if (loading) {
    return (
      <div>
        <h2>Teleconsulta</h2>
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p>Conectando à sala...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h2>Teleconsulta</h2>
        <div className="error-box">{error}</div>
        {!apptId && (
          <p style={{ opacity: 0.7, fontSize: 14, marginTop: 12 }}>
            Selecione um agendamento no painel para iniciar uma teleconsulta.
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      <h2>Teleconsulta</h2>

      <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 8 }}>
        Sala: {roomInfo?.roomCode || '---'} &middot; Status:{' '}
        <span className={`badge ${roomStatus === 'active' ? 'badge-scheduled' : ''}`}>
          {roomStatus === 'waiting' ? 'Aguardando' : roomStatus === 'active' ? 'Ativa' : roomStatus}
        </span>
        {apptId && (
          <>
            &middot; Consulta #{apptId}
          </>
        )}
      </div>

      <div className="teleconsulta-layout">
        {/* ---- Video section ---- */}
        <div className="video-section">
          <div className="video-grid">
            <div className="video-container" style={{ position: 'relative' }}>
              <video ref={localVideoRef} autoPlay muted playsInline />
              <div className="video-label">
                Você
                {isScreenSharing && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 11,
                      background: '#D2640A',
                      color: '#fff',
                      padding: '2px 6px',
                      borderRadius: 4,
                    }}
                  >
                    🖥️ Compartilhando
                  </span>
                )}
              </div>
            </div>
            <div className="video-container" style={{ position: 'relative' }}>
              <video ref={remoteVideoRef} autoPlay playsInline />
              <div className="video-label">
                Paciente / Profissional
                {remoteIsScreenSharing && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 11,
                      background: '#008080',
                      color: '#fff',
                      padding: '2px 6px',
                      borderRadius: 4,
                    }}
                  >
                    🖥️ Tela
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="controls">
            {!callActive ? (
              <button className="btn" onClick={startCall}>
                Iniciar Chamada
              </button>
            ) : (
              <button
                className="btn-ghost"
                style={{ color: '#ff8a80', borderColor: '#ff8a80' }}
                onClick={hangUp}
              >
                Encerrar Chamada
              </button>
            )}

            {!isScreenSharing ? (
              <button
                className="btn-ghost"
                onClick={shareScreen}
                disabled={!callActive}
                title={!callActive ? 'Inicie a chamada primeiro' : 'Compartilhar tela'}
                style={{ opacity: !callActive ? 0.5 : 1 }}
              >
                🖥️ Compartilhar Tela
              </button>
            ) : (
              <button
                className="btn-ghost"
                onClick={stopScreenShare}
                style={{ color: '#ff8a80', borderColor: '#ff8a80' }}
                title="Parar compartilhamento de tela"
              >
                ⏹ Parar Compartilhamento
              </button>
            )}
          </div>
        </div>

        {/* ---- Chat section ---- */}
        <div className="chat-section">
          <div className="chat-header">Chat</div>
          <div className="chat-messages">
            {messages.length === 0 && (
              <div style={{ opacity: 0.4, fontSize: 13, textAlign: 'center', padding: 20 }}>
                Nenhuma mensagem ainda
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`message ${msg.user?.email === user?.email ? 'own' : ''}`}
              >
                <div className="message-sender">
                  {msg.user?.email || 'Desconhecido'}
                </div>
                <div className="message-text">{msg.text}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form className="chat-input-area" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite sua mensagem..."
            />
            <button type="submit" className="btn" disabled={!inputText.trim()}>
              Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
