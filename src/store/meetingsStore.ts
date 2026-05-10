import { create } from 'zustand'
import { api } from '@/lib/api'

interface ActionItem {
  id: string
  text: string
  assigneeId: string | null
  assignee?: { id: string; name: string; avatarUrl?: string }
  done: boolean
}

interface MeetingNote {
  id: string
  content: string
}

interface Meeting {
  id: string
  title: string
  date: string
  time?: string
  duration: number
  type: string
  typeColor: string
  location?: string
  attendees: { user: { id: string; name: string; avatarUrl?: string } }[]
  notes: MeetingNote[]
  actionItems: ActionItem[]
}

interface MeetingsStore {
  meetings: Meeting[]
  isLoading: boolean

  fetchMeetings: (workspaceId: string) => Promise<void>
  createMeeting: (workspaceId: string, data: object) => Promise<void>
  toggleAction: (workspaceId: string, meetingId: string, actionId: string) => Promise<void>
  deleteMeeting: (workspaceId: string, meetingId: string) => Promise<void>
}

const TYPE_COLORS: Record<string, string> = {
  TEAM_SYNC: '#2563EB',
  SUPERVISOR: '#D4500A',
  DESIGN_REVIEW: '#7C3AED',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeMeeting(m: any): Meeting {
  return {
    ...m,
    // backend relation is named 'actions'; store interface uses 'actionItems'
    actionItems: m.actions ?? [],
    // backend MeetingNote has 'text'; interface uses 'content'
    notes: (m.notes ?? []).map((n: any) => ({ id: n.id, content: n.text })),
    typeColor: TYPE_COLORS[m.type] ?? '#2563EB',
  }
}

export const useMeetingsStore = create<MeetingsStore>((set) => ({
  meetings: [],
  isLoading: false,

  fetchMeetings: async (workspaceId) => {
    set({ isLoading: true })
    const result = await api.meetings.list(workspaceId)
    if (result.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const meetings = (result.data as any).meetings.map(normalizeMeeting)
      set({ meetings, isLoading: false })
    } else {
      set({ isLoading: false })
    }
  },

  createMeeting: async (workspaceId, data) => {
    const result = await api.meetings.create(workspaceId, data)
    if (result.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const meeting = normalizeMeeting((result.data as any).meeting)
      set((state) => ({ meetings: [meeting, ...state.meetings] }))
    }
  },

  toggleAction: async (workspaceId, meetingId, actionId) => {
    // Optimistic update
    set((state) => ({
      meetings: state.meetings.map((m) =>
        m.id !== meetingId ? m : {
          ...m,
          actionItems: m.actionItems.map((a) =>
            a.id !== actionId ? a : { ...a, done: !a.done }
          )
        }
      )
    }))
    await api.meetings.toggleAction(workspaceId, meetingId, actionId)
  },

  deleteMeeting: async (workspaceId, meetingId) => {
    const result = await api.meetings.delete(workspaceId, meetingId)
    if (result.success) {
      set((state) => ({
        meetings: state.meetings.filter((m) => m.id !== meetingId)
      }))
    }
  },
}))
