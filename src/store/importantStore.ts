import { create } from 'zustand'
import { api } from '@/lib/api'

export interface PinnedItem {
  id:       string
  title:    string
  body:     string
  category: 'INSTRUCTIONS' | 'CRITICAL' | 'DECISION' | 'RESOURCES' | 'ANNOUNCEMENT'
  pinned:   boolean
  date:     string
  addedBy:  { id: string; name: string; avatarUrl?: string }
}

interface ImportantStore {
  items:      PinnedItem[]
  isLoading:  boolean
  fetchItems: (workspaceId: string) => Promise<void>
  addItem:    (workspaceId: string, data: { title: string; body: string; category: string }) => Promise<void>
  deleteItem: (workspaceId: string, itemId: string) => Promise<void>
  togglePin:  (workspaceId: string, itemId: string, pinned: boolean) => Promise<void>
}

export const useImportantStore = create<ImportantStore>((set) => ({
  items:     [],
  isLoading: false,

  fetchItems: async (workspaceId) => {
    set({ isLoading: true })
    const result = await api.pinned.list(workspaceId)
    if (result.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set({ items: (result.data as any).items, isLoading: false })
    } else {
      set({ isLoading: false })
    }
  },

  addItem: async (workspaceId, data) => {
    const result = await api.pinned.create(workspaceId, data)
    if (result.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const item = (result.data as any).item as PinnedItem
      set(state => ({ items: [item, ...state.items] }))
    }
  },

  deleteItem: async (workspaceId, itemId) => {
    await api.pinned.delete(workspaceId, itemId)
    set(state => ({ items: state.items.filter(i => i.id !== itemId) }))
  },

  togglePin: async (workspaceId, itemId, pinned) => {
    await api.pinned.update(workspaceId, itemId, { pinned })
    set(state => ({
      items: state.items.map(i => i.id === itemId ? { ...i, pinned } : i)
    }))
  },
}))
