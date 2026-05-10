import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import { env } from '../config/env'

// workspaceId → Set of userIds
const onlineUsers = new Map<string, Set<string>>()

export const initSocket = (io: Server) => {

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) return next(new Error('No token'))

      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string }
      const workspaceId = socket.handshake.auth.workspaceId

      if (!workspaceId) return next(new Error('No workspaceId'))

      const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: decoded.userId } },
        include: { user: { select: { id: true, name: true } } }
      })

      if (!member) return next(new Error('Not a workspace member'))

      socket.data.userId = decoded.userId
      socket.data.name = member.user.name
      socket.data.workspaceId = workspaceId

      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket: Socket) => {
    const { userId, name, workspaceId } = socket.data

    socket.join(`workspace:${workspaceId}`)

    if (!onlineUsers.has(workspaceId)) {
      onlineUsers.set(workspaceId, new Set())
    }
    onlineUsers.get(workspaceId)!.add(userId)

    io.to(`workspace:${workspaceId}`).emit('online:update', {
      onlineUserIds: Array.from(onlineUsers.get(workspaceId)!)
    })

    console.log(`${name} connected to workspace ${workspaceId}`)

    // ── TEAM CHAT ──────────────────────────────────────

    socket.on('message:send', async (data: { text: string }) => {
      try {
        if (!data.text?.trim()) return

        const message = await prisma.message.create({
          data: {
            text: data.text.trim(),
            workspaceId,
            senderId: userId,
            receiverId: null,
          },
          include: {
            sender: { select: { id: true, name: true, avatarUrl: true } }
          }
        })

        io.to(`workspace:${workspaceId}`).emit('message:new', { message })
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' })
      }
    })

    // ── DIRECT MESSAGES ────────────────────────────────

    socket.on('dm:send', async (data: { text: string; receiverId: string }) => {
      try {
        if (!data.text?.trim() || !data.receiverId) return

        const message = await prisma.message.create({
          data: {
            text: data.text.trim(),
            workspaceId,
            senderId: userId,
            receiverId: data.receiverId,
          },
          include: {
            sender: { select: { id: true, name: true, avatarUrl: true } }
          }
        })

        socket.emit('dm:new', { message })

        const receiverSocketId = [...io.sockets.sockets.entries()]
          .find(([_, s]) =>
            s.data.userId === data.receiverId &&
            s.data.workspaceId === workspaceId
          )?.[0]

        if (receiverSocketId) {
          io.to(receiverSocketId).emit('dm:new', { message })
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to send DM' })
      }
    })

    // ── TYPING INDICATORS ──────────────────────────────

    socket.on('typing:start', () => {
      socket.to(`workspace:${workspaceId}`).emit('typing:update', {
        userId,
        name,
        isTyping: true,
      })
    })

    socket.on('typing:stop', () => {
      socket.to(`workspace:${workspaceId}`).emit('typing:update', {
        userId,
        name,
        isTyping: false,
      })
    })

    // ── TASK UPDATES ───────────────────────────────────

    socket.on('task:updated', (data: { taskId: string; changes: object }) => {
      socket.to(`workspace:${workspaceId}`).emit('task:updated', {
        taskId: data.taskId,
        changes: data.changes,
        updatedBy: { userId, name },
      })
    })

    socket.on('subtask:toggled', (data: { taskId: string; subtaskId: string; done: boolean }) => {
      socket.to(`workspace:${workspaceId}`).emit('subtask:toggled', {
        ...data,
        updatedBy: { userId, name },
      })
    })

    // ── DISCONNECT ─────────────────────────────────────

    socket.on('disconnect', () => {
      onlineUsers.get(workspaceId)?.delete(userId)

      io.to(`workspace:${workspaceId}`).emit('online:update', {
        onlineUserIds: Array.from(onlineUsers.get(workspaceId) ?? [])
      })

      console.log(`${name} disconnected from workspace ${workspaceId}`)
    })
  })
}

// CLIENT → SERVER:
// message:send    { text }                         → team message
// dm:send         { text, receiverId }             → direct message
// typing:start    {}                               → user started typing
// typing:stop     {}                               → user stopped typing
// task:updated    { taskId, changes }              → task changed
// subtask:toggled { taskId, subtaskId, done }      → subtask checked

// SERVER → CLIENT:
// message:new     { message }                      → new team message
// dm:new          { message }                      → new direct message
// typing:update   { userId, name, isTyping }       → typing indicator
// task:updated    { taskId, changes, updatedBy }   → task sync
// subtask:toggled { taskId, subtaskId, done, updatedBy }
// online:update   { onlineUserIds }                → who's online
// error           { message }                      → error occurred
