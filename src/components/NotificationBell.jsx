import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../hooks/useNotifications.js'

const statusColors = {
  unread: { dot: '#00d4ff', bg: 'rgba(0,212,255,0.06)' },
  read: { dot: 'rgba(255,255,255,0.3)', bg: 'transparent' },
  archived: { dot: '#ff8a3d', bg: 'rgba(255,138,61,0.06)' },
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin}min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, archiveNotification } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const nav = useNavigate()

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const recent = notifications.slice(0, 10)

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="btn-ghost"
        onClick={() => setOpen(!open)}
        style={{ position: 'relative', fontSize: 18, padding: '4px 8px', lineHeight: 1 }}
      >
        &#128276;
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              background: '#ff3b30',
              color: '#fff',
              borderRadius: '50%',
              width: 18,
              height: 18,
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            width: 360,
            maxHeight: 480,
            overflowY: 'auto',
            background: '#1a2a35',
            border: '1px solid rgba(0,212,255,0.3)',
            borderRadius: 10,
            boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
            zIndex: 1000,
            marginTop: 6,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <strong style={{ fontSize: 14 }}>Notificações</strong>
            <div style={{ display: 'flex', gap: 6 }}>
              {unreadCount > 0 && (
                <button
                  className="btn-ghost"
                  onClick={() => { markAllAsRead() }}
                  style={{ fontSize: 11, padding: '4px 8px' }}
                >
                  Ler todas
                </button>
              )}
            </div>
          </div>

          {recent.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', opacity: 0.5, fontSize: 13 }}>
              Nenhuma notificação
            </div>
          )}

          {recent.map((n) => {
            const colors = statusColors[n.status] || statusColors.unread
            return (
              <div
                key={n.id}
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: colors.bg,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  if (n.status === 'unread') markAsRead(n.id)
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: colors.dot,
                      marginTop: 5,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: n.status === 'unread' ? 700 : 400 }}>
                      {n.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.7,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {n.message.length > 60 ? n.message.slice(0, 60) + '...' : n.message}
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.4, marginTop: 2 }}>
                      {formatDate(n.sentAt)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {n.status === 'unread' && (
                      <button
                        className="btn-ghost"
                        onClick={(e) => { e.stopPropagation(); markAsRead(n.id) }}
                        style={{ fontSize: 10, padding: '2px 6px' }}
                        title="Marcar como lida"
                      >
                        ✓
                      </button>
                    )}
                    {n.status !== 'archived' && (
                      <button
                        className="btn-ghost"
                        onClick={(e) => { e.stopPropagation(); archiveNotification(n.id) }}
                        style={{ fontSize: 10, padding: '2px 6px' }}
                        title="Arquivar"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          <div
            style={{
              padding: '10px 14px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}
          >
            <button
              className="btn-ghost"
              onClick={() => { setOpen(false); nav('/notifications') }}
              style={{ fontSize: 12, width: '100%' }}
            >
              Ver todas
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
