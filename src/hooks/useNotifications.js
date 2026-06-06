import { useState, useEffect, useCallback, useRef } from 'react'
import * as notificationService from '../services/notifications.js'

export function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)

  const fetchNotifications = useCallback(async () => {
    setError(null)
    try {
      const data = await notificationService.getNotifications()
      setNotifications(Array.isArray(data.notifications) ? data.notifications : [])
      setUnreadCount(data.unreadCount ?? 0)
    } catch (err) {
      setError(err?.message || 'Erro ao carregar notificações')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    intervalRef.current = setInterval(fetchNotifications, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchNotifications])

  const markAsRead = useCallback(async (id) => {
    try {
      await notificationService.markAsRead(id)
      await fetchNotifications()
    } catch (err) {
      console.error('Erro ao marcar como lida:', err)
    }
  }, [fetchNotifications])

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead()
      await fetchNotifications()
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err)
    }
  }, [fetchNotifications])

  const archiveNotification = useCallback(async (id) => {
    try {
      await notificationService.archiveNotification(id)
      await fetchNotifications()
    } catch (err) {
      console.error('Erro ao arquivar:', err)
    }
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
    archiveNotification,
  }
}
