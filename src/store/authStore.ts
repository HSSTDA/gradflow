import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'

interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

interface Workspace {
  id: string
  name: string
  slug: string
  description?: string
  myRole: string
  _count: { members: number; tasks: number }
}

interface AuthStore {
  user: User | null
  token: string | null
  currentWorkspace: Workspace | null
  workspaces: Workspace[]
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<boolean>
  signup: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  setCurrentWorkspace: (workspace: Workspace) => void
  fetchWorkspaces: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      currentWorkspace: null,
      workspaces: [],
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        const result = await api.auth.login({ email, password })
        if (!result.success) {
          set({ isLoading: false, error: result.error })
          return false
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { user, token } = (result.data as any)
        localStorage.setItem('gradflow_token', token)
        set({ user, token, isLoading: false })
        return true
      },

      signup: async (name, email, password) => {
        set({ isLoading: true, error: null })
        const result = await api.auth.signup({ name, email, password })
        if (!result.success) {
          set({ isLoading: false, error: result.error })
          return false
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { user, token } = (result.data as any)
        localStorage.setItem('gradflow_token', token)
        set({ user, token, isLoading: false })
        return true
      },

      logout: () => {
        localStorage.removeItem('gradflow_token')
        set({ user: null, token: null, currentWorkspace: null, workspaces: [] })
      },

      setCurrentWorkspace: (workspace) => {
        set({ currentWorkspace: workspace })
      },

      fetchWorkspaces: async () => {
        const result = await api.workspaces.list()
        if (result.success) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { workspaces } = result.data as any
          set({ workspaces })
          if (!get().currentWorkspace && workspaces.length > 0) {
            set({ currentWorkspace: workspaces[0] })
          }
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'gradflow_auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        currentWorkspace: state.currentWorkspace,
      }),
    }
  )
)
