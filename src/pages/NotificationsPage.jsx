import React, { useState } from 'react'
import { useNotifications } from '../hooks/useNotifications.js'

const filters = [
  { key: '', label: 'Todas' },
  { key: 'unread', label: 'Não lidas' },
  { key: 'read', label: 'Lidas' },
  { key: 'archived', label: 'Arquivadas' },
]

const statusLabels = {
  unread: 'Não lida',
  read: 'Lida',
  archived: 'Arquivada',
}

function formatDateTime(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleString('pt-BR')
}

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    refetch,
    markAsRead,
    markAllAsRead,
    archiveNotification,
  } = useNotifications()

  const [filter, setFilter] = useState('')
  const [pageSize, setPageSize] = useState(30)

  const filtered = filter
    ? notifications.filter((n) => n.status === filter)
    : notifications

  const visible = filtered.slice(0, pageSize)
  const hasMore = filtered.length > pageSize

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="welcome-header">
        <h2>Notificações</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {unreadCount > 0 && (
            <button className="btn-ghost" onClick={markAllAsRead} style={{ fontSize: 12 }}>
              Marcar todas como lidas
            </button>
          )}
          <button className="btn-ghost" onClick={refetch} style={{ fontSize: 12 }}>
            Atualizar
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {filters.map((f) => (
          <button
            key={f.key}
            className={filter === f.key ? 'btn' : 'btn-ghost'}
            onClick={() => setFilter(f.key)}
            style={{ fontSize: 12, padding: '6px 14px' }}
          >
            {f.label}
            {f.key === 'unread' && unreadCount > 0 && (
              <span className="badge">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading && <div className="loading"><div className="loading-spinner" /><p>Carregando...</p></div>}
      {error && <div className="error-box">{error}</div>}

      {!loading && !error && visible.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 40, opacity: 0.6 }}>
          Nenhuma notificação encontrada
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.map((n) => (
          <div key={n.id} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <strong style={{ fontSize: 14 }}>{n.title}</strong>
                <span
                  className={`badge badge-${n.status}`}
                  style={{
                    background:
                      n.status === 'unread' ? 'rgba(0,212,255,0.15)' :
                      n.status === 'read' ? 'rgba(255,255,255,0.08)' :
                      'rgba(255,138,61,0.15)',
                    color:
                      n.status === 'unread' ? '#00d4ff' :
                      n.status === 'archived' ? '#ff8a3d' :
                      'rgba(255,255,255,0.6)',
                  }}
                >
                  {statusLabels[n.status]}
                </span>
              </div>
              <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>
                {n.message}
              </div>
              <div style={{ fontSize: 11, opacity: 0.4, display: 'flex', gap: 12 }}>
                <span>{formatDateTime(n.sentAt)}</span>
                <span>Tipo: {n.type}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {n.status === 'unread' && (
                <button
                  className="btn-ghost"
                  onClick={() => markAsRead(n.id)}
                  style={{ fontSize: 11, padding: '4px 8px' }}
                >
                  Ler
                </button>
              )}
              {n.status !== 'archived' && (
                <button
                  className="btn-ghost"
                  onClick={() => archiveNotification(n.id)}
                  style={{ fontSize: 11, padding: '4px 8px' }}
                >
                  Arquivar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            className="btn-ghost"
            onClick={() => setPageSize((p) => p + 30)}
            style={{ fontSize: 13 }}
          >
            Carregar mais ({filtered.length - pageSize} restantes)
          </button>
        </div>
      )}
    </div>
  )
}
