const BASE_URL = ''

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('gradflow_token')
      : null

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    })

    const json = await res.json()

    if (!res.ok) {
      return { success: false, error: json.error || 'Something went wrong' }
    }

    return { success: true, data: json.data }
  } catch {
    return { success: false, error: 'Network error — check your connection' }
  }
}

export const api = {
  auth: {
    signup: (body: { name: string; email: string; password: string }) =>
      apiFetch('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
      apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    me: () => apiFetch('/api/auth/me'),
  },

  workspaces: {
    list: () => apiFetch('/api/workspaces'),
    create: (body: { name: string; description?: string }) =>
      apiFetch('/api/workspaces', { method: 'POST', body: JSON.stringify(body) }),
    get: (id: string) => apiFetch(`/api/workspaces/${id}`),
    members: (workspaceId: string) =>
      apiFetch(`/api/workspaces/${workspaceId}/members`),
    removeMember: (workspaceId: string, userId: string) =>
      apiFetch(`/api/workspaces/${workspaceId}/members/${userId}`, { method: 'DELETE' }),
  },

  invitations: {
    list: (workspaceId: string) =>
      apiFetch(`/api/workspaces/${workspaceId}/invitations`),
    create: (workspaceId: string, body: { email: string; role?: string }) =>
      apiFetch(`/api/workspaces/${workspaceId}/invitations`, { method: 'POST', body: JSON.stringify(body) }),
  },

  invites: {
    get: (token: string) => apiFetch(`/api/invite/${token}`),
    accept: (token: string) => apiFetch(`/api/invite/${token}/accept`, { method: 'POST' }),
  },

  tasks: {
    list: (workspaceId: string) =>
      apiFetch(`/api/workspaces/${workspaceId}/tasks`),
    create: (workspaceId: string, body: { title: string; priority?: string; status?: string }) =>
      apiFetch(`/api/workspaces/${workspaceId}/tasks`, { method: 'POST', body: JSON.stringify(body) }),
    update: (workspaceId: string, taskId: string, body: object) =>
      apiFetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (workspaceId: string, taskId: string) =>
      apiFetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`, { method: 'DELETE' }),
    createSubtask: (workspaceId: string, taskId: string, body: object) =>
      apiFetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/subtasks`, { method: 'POST', body: JSON.stringify(body) }),
    updateSubtask: (workspaceId: string, taskId: string, subtaskId: string, body: object) =>
      apiFetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/subtasks/${subtaskId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteSubtask: (workspaceId: string, taskId: string, subtaskId: string) =>
      apiFetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/subtasks/${subtaskId}`, { method: 'DELETE' }),
  },

  files: {
    list: (workspaceId: string, folder?: string) =>
      apiFetch(`/api/workspaces/${workspaceId}/files${folder ? `?folder=${encodeURIComponent(folder)}` : ''}`),
    create: (workspaceId: string, body: object) =>
      apiFetch(`/api/workspaces/${workspaceId}/files`, { method: 'POST', body: JSON.stringify(body) }),
    delete: (workspaceId: string, fileId: string) =>
      apiFetch(`/api/workspaces/${workspaceId}/files/${fileId}`, { method: 'DELETE' }),
  },

  pinned: {
    list: (workspaceId: string) =>
      apiFetch(`/api/workspaces/${workspaceId}/pinned`),
    create: (workspaceId: string, body: object) =>
      apiFetch(`/api/workspaces/${workspaceId}/pinned`, { method: 'POST', body: JSON.stringify(body) }),
    delete: (workspaceId: string, itemId: string) =>
      apiFetch(`/api/workspaces/${workspaceId}/pinned/${itemId}`, { method: 'DELETE' }),
    update: (workspaceId: string, itemId: string, body: object) =>
      apiFetch(`/api/workspaces/${workspaceId}/pinned/${itemId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  },

  meetings: {
    list: (workspaceId: string) =>
      apiFetch(`/api/workspaces/${workspaceId}/meetings`),
    create: (workspaceId: string, body: object) =>
      apiFetch(`/api/workspaces/${workspaceId}/meetings`, { method: 'POST', body: JSON.stringify(body) }),
    update: (workspaceId: string, meetingId: string, body: object) =>
      apiFetch(`/api/workspaces/${workspaceId}/meetings/${meetingId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (workspaceId: string, meetingId: string) =>
      apiFetch(`/api/workspaces/${workspaceId}/meetings/${meetingId}`, { method: 'DELETE' }),
    toggleAction: (workspaceId: string, meetingId: string, actionId: string) =>
      apiFetch(`/api/workspaces/${workspaceId}/meetings/${meetingId}/actions/${actionId}`, { method: 'PATCH' }),
    addNote: (workspaceId: string, meetingId: string, body: { text: string }) =>
      apiFetch(`/api/workspaces/${workspaceId}/meetings/${meetingId}/notes`, { method: 'POST', body: JSON.stringify(body) }),
    addAction: (workspaceId: string, meetingId: string, body: { text: string; assigneeId?: string | null }) =>
      apiFetch(`/api/workspaces/${workspaceId}/meetings/${meetingId}/actions`, { method: 'POST', body: JSON.stringify(body) }),
  },

  notifications: {
    list: (workspaceId: string) =>
      apiFetch(`/api/workspaces/${workspaceId}/notifications`),
    markAllRead: (workspaceId: string) =>
      apiFetch('/api/notifications/mark-read', { method: 'POST', body: JSON.stringify({ workspaceId }) }),
  },

  milestones: {
    list: (workspaceId: string) =>
      apiFetch(`/api/workspaces/${workspaceId}/milestones`),
    create: (workspaceId: string, body: { title: string; description?: string; dueDate: string; status?: string }) =>
      apiFetch(`/api/workspaces/${workspaceId}/milestones`, { method: 'POST', body: JSON.stringify(body) }),
    update: (workspaceId: string, milestoneId: string, body: object) =>
      apiFetch(`/api/workspaces/${workspaceId}/milestones/${milestoneId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (workspaceId: string, milestoneId: string) =>
      apiFetch(`/api/workspaces/${workspaceId}/milestones/${milestoneId}`, { method: 'DELETE' }),
  },

  messages: {
    list: (workspaceId: string) =>
      apiFetch(`/api/workspaces/${workspaceId}/messages`),
    pinned: (workspaceId: string) =>
      apiFetch(`/api/workspaces/${workspaceId}/messages/pinned`),
    dm: (workspaceId: string, userId: string) =>
      apiFetch(`/api/workspaces/${workspaceId}/messages/dm/${userId}`),
    send: (workspaceId: string, body: { text: string; receiverId?: string }) =>
      apiFetch(`/api/workspaces/${workspaceId}/messages`, { method: 'POST', body: JSON.stringify(body) }),
    togglePin: (workspaceId: string, messageId: string) =>
      apiFetch(`/api/workspaces/${workspaceId}/messages/${messageId}/pin`, { method: 'PATCH' }),
  },
}
