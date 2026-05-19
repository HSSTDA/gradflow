import { create } from 'zustand'
import { api } from '@/lib/api'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  createdAt: string
  triggeredBy?: { id: string; name: string; avatarUrl?: string } | null
}

interface NotificationsStore {
  notifications: Notification[]
  unreadCount: number

  fetchNotifications: (workspaceId: string) => Promise<void>
  markAllRead: (workspaceId: string) => Promise<void>
}

export const useNotificationsStore = create<NotificationsStore>((set) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async (workspaceId) => {
    const result = await api.notifications.list(workspaceId)
    if (result.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { notifications, unreadCount } = result.data as any
      set({ notifications, unreadCount })
    }
  },

  markAllRead: async (workspaceId) => {
    await api.notifications.markAllRead(workspaceId)
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    }))
  },
}))
