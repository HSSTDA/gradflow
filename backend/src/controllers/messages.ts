import { Response } from 'express'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string
    const { cursor, limit = '50' } = req.query

    const messages = await prisma.message.findMany({
      where: {
        workspaceId,
        receiverId: null,
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'asc' },
      take: parseInt(limit as string),
      ...(cursor && {
        cursor: { id: cursor as string },
        skip: 1,
      }),
    })

    return res.json({ success: true, data: { messages } })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const getDirectMessages = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string
    const userId = req.params.userId as string
    const myId = req.userId!

    const messages = await prisma.message.findMany({
      where: {
        workspaceId,
        OR: [
          { senderId: myId, receiverId: userId },
          { senderId: userId, receiverId: myId },
        ]
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })

    return res.json({ success: true, data: { messages } })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const createMessage = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string
    const { text, receiverId } = req.body

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Message text required' })
    }

    if (receiverId) {
      const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: receiverId } }
      })
      if (!member) {
        return res.status(400).json({ success: false, error: 'Receiver is not a workspace member' })
      }
    }

    const message = await prisma.message.create({
      data: {
        text: text.trim(),
        workspaceId,
        senderId: req.userId!,
        receiverId: receiverId || null,
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } }
      }
    })

    return res.status(201).json({ success: true, data: { message } })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const togglePin = async (req: AuthRequest, res: Response) => {
  try {
    const messageId = req.params.messageId as string
    const workspaceId = req.params.workspaceId as string

    const existing = await prisma.message.findFirst({
      where: { id: messageId, workspaceId }
    })

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Message not found' })
    }

    const message = await prisma.message.update({
      where: { id: messageId },
      data: { isPinned: !existing.isPinned }
    })

    return res.json({ success: true, data: { message } })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const getPinnedMessages = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string

    const messages = await prisma.message.findMany({
      where: { workspaceId, isPinned: true, receiverId: null },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return res.json({ success: true, data: { messages } })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const deleteMessage = async (req: AuthRequest, res: Response) => {
  try {
    const messageId = req.params.messageId as string
    const workspaceId = req.params.workspaceId as string

    const existing = await prisma.message.findFirst({
      where: { id: messageId, workspaceId }
    })

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Message not found' })
    }

    if (existing.senderId !== req.userId) {
      return res.status(403).json({ success: false, error: 'Can only delete your own messages' })
    }

    await prisma.message.delete({ where: { id: messageId } })

    return res.json({ success: true, data: { message: 'Message deleted' } })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
