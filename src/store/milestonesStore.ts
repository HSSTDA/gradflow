import { create } from 'zustand'
import { api } from '@/lib/api'

export type MilestoneStatus = 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED'

export interface Milestone {
  id:          string
  workspaceId: string
  title:       string
  description: string | null
  dueDate:     string
  status:      MilestoneStatus
  createdAt:   string
}

interface MilestonesState {
  milestones:       Milestone[]
  loading:          boolean
  fetchMilestones:  (workspaceId: string) => Promise<void>
  addMilestone:     (workspaceId: string, data: { title: string; description?: string; dueDate: string }) => Promise<void>
  deleteMilestone:  (workspaceId: string, id: string) => Promise<void>
  updateMilestone:  (workspaceId: string, id: string, data: Partial<Pick<Milestone, 'title' | 'description' | 'dueDate' | 'status'>>) => Promise<void>
}

export const useMilestonesStore = create<MilestonesState>((set, get) => ({
  milestones: [],
  loading:    false,

  fetchMilestones: async (workspaceId) => {
    set({ loading: true })
    const res = await api.milestones.list(workspaceId)
    if (res.success) set({ milestones: res.data as Milestone[] })
    set({ loading: false })
  },

  addMilestone: async (workspaceId, data) => {
    const res = await api.milestones.create(workspaceId, data)
    if (res.success) {
      set(s => ({ milestones: [...s.milestones, res.data as Milestone] }))
    }
  },

  deleteMilestone: async (workspaceId, id) => {
    const res = await api.milestones.delete(workspaceId, id)
    if (res.success) {
      set(s => ({ milestones: s.milestones.filter(m => m.id !== id) }))
    }
  },

  updateMilestone: async (workspaceId, id, data) => {
    const res = await api.milestones.update(workspaceId, id, data)
    if (res.success) {
      set(s => ({
        milestones: s.milestones.map(m => m.id === id ? { ...m, ...(res.data as Milestone) } : m),
      }))
    }
  },
}))
