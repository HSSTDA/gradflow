import { create } from 'zustand'
import { api } from '@/lib/api'

export interface SubTask {
  id: string
  title: string
  assigneeId: string | null
  assignee?: { id: string; name: string; avatarUrl?: string }
  dueDate: string | null
  note: string | null
  done: boolean
  dependsOnId?: string | null
  dependsOn?: { id: string; title: string; done: boolean } | null
}

export interface ParentTask {
  id: string
  title: string
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  subtasks: SubTask[]
  createdBy?: { id: string; name: string }
}

interface TasksStore {
  tasks: ParentTask[]
  isLoading: boolean
  error: string | null

  fetchTasks: (workspaceId: string) => Promise<void>
  createTask: (workspaceId: string, data: { title: string; priority?: string }) => Promise<void>
  updateTask: (workspaceId: string, taskId: string, data: object) => Promise<void>
  deleteTask: (workspaceId: string, taskId: string) => Promise<void>
  toggleSubtask: (workspaceId: string, taskId: string, subtaskId: string, done: boolean) => Promise<void>
  createSubtask: (workspaceId: string, taskId: string, data: object) => Promise<void>
}

export const useTasksStore = create<TasksStore>((set) => ({
  tasks: [],
  isLoading: false,
  error: null,

  fetchTasks: async (workspaceId) => {
    set({ isLoading: true, error: null })
    const result = await api.tasks.list(workspaceId)
    if (result.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set({ tasks: (result.data as any).tasks, isLoading: false })
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set({ error: (result as any).error, isLoading: false })
    }
  },

  createTask: async (workspaceId, data) => {
    const result = await api.tasks.create(workspaceId, data)
    if (result.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newTask = (result.data as any).task
      set((state) => ({ tasks: [newTask, ...state.tasks] }))
    }
  },

  updateTask: async (workspaceId, taskId, data) => {
    const result = await api.tasks.update(workspaceId, taskId, data)
    if (result.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated = (result.data as any).task
      set((state) => ({
        tasks: state.tasks.map((t) => t.id === taskId ? updated : t)
      }))
    }
  },

  deleteTask: async (workspaceId, taskId) => {
    const result = await api.tasks.delete(workspaceId, taskId)
    if (result.success) {
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== taskId)
      }))
    }
  },

  toggleSubtask: async (workspaceId, taskId, subtaskId, done) => {
    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id !== taskId ? t : {
          ...t,
          subtasks: t.subtasks.map((s) =>
            s.id !== subtaskId ? s : { ...s, done }
          )
        }
      )
    }))

    const result = await api.tasks.updateSubtask(workspaceId, taskId, subtaskId, { done })

    // Revert on failure
    if (!result.success) {
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id !== taskId ? t : {
            ...t,
            subtasks: t.subtasks.map((s) =>
              s.id !== subtaskId ? s : { ...s, done: !done }
            )
          }
        )
      }))
    }
  },

  createSubtask: async (workspaceId, taskId, data) => {
    const result = await api.tasks.createSubtask(workspaceId, taskId, data)
    if (result.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newSubtask = (result.data as any).subtask
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id !== taskId ? t : {
            ...t,
            subtasks: [...t.subtasks, newSubtask]
          }
        )
      }))
    }
  },
}))
