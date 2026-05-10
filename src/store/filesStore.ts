import { create } from 'zustand'
import { api } from '@/lib/api'

export interface FileItem {
  id: string
  name: string
  type: string
  folder: string
  size: string
  url: string
  date?: string
  uploadedBy: { id: string; name: string; avatarUrl?: string }
  createdAt: string
}

interface FilesStore {
  files: FileItem[]
  folderCounts: Record<string, number>
  isLoading: boolean

  fetchFiles: (workspaceId: string, folder?: string) => Promise<void>
  addFile: (workspaceId: string, data: object) => Promise<void>
  deleteFile: (workspaceId: string, fileId: string) => Promise<void>
}

export const useFilesStore = create<FilesStore>((set) => ({
  files: [],
  folderCounts: {},
  isLoading: false,

  fetchFiles: async (workspaceId, folder) => {
    set({ isLoading: true })
    const result = await api.files.list(workspaceId, folder)
    if (result.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { files, folderCounts } = result.data as any
      set({ files, folderCounts, isLoading: false })
    } else {
      set({ isLoading: false })
    }
  },

  addFile: async (workspaceId, data) => {
    const result = await api.files.create(workspaceId, data)
    if (result.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const file = (result.data as any).file
      set((state) => ({ files: [file, ...state.files] }))
    }
  },

  deleteFile: async (workspaceId, fileId) => {
    const result = await api.files.delete(workspaceId, fileId)
    if (result.success) {
      set((state) => ({
        files: state.files.filter((f) => f.id !== fileId)
      }))
    }
  },
}))
