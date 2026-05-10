import { Response } from 'express'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export const getMeetings = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string

    const meetings = await prisma.meeting.findMany({
      where: { workspaceId },
      include: {
        attendees: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } }
          }
        },
        notes: true,
        actions: {
          include: {
            assignee: { select: { id: true, name: true, avatarUrl: true } }
          }
        }
      },
      orderBy: { date: 'desc' }
    })

    return res.json({ success: true, data: { meetings } })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const createMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string
    const { title, date, time = '', duration, type, attendeeIds, notes, actionItems } = req.body

    if (!title || !date) {
      return res.status(400).json({ success: false, error: 'Title and date required' })
    }

    if (attendeeIds?.length) {
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId, userId: { in: attendeeIds } }
      })
      if (members.length !== attendeeIds.length) {
        return res.status(400).json({ success: false, error: 'Some attendees are not workspace members' })
      }
    }

    const meeting = await prisma.meeting.create({
      data: {
        title: title.trim(),
        date,
        time,
        duration: duration || 60,
        type: type || 'TEAM_SYNC',
        workspaceId,
        attendees: {
          create: (attendeeIds || [req.userId]).map((userId: string) => ({ userId }))
        },
        notes: {
          create: (notes || []).map((text: string) => ({ text }))
        },
        actions: {
          create: (actionItems || []).map((item: { text: string; assigneeId?: string }) => ({
            text: item.text,
            assigneeId: item.assigneeId || null,
          }))
        }
      },
      include: {
        attendees: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } }
          }
        },
        notes: true,
        actions: {
          include: {
            assignee: { select: { id: true, name: true, avatarUrl: true } }
          }
        }
      }
    })

    return res.status(201).json({ success: true, data: { meeting } })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const toggleActionItem = async (req: AuthRequest, res: Response) => {
  try {
    const actionId = req.params.actionId as string
    const meetingId = req.params.meetingId as string

    const existing = await prisma.actionItem.findFirst({
      where: { id: actionId, meetingId }
    })

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Action item not found' })
    }

    const action = await prisma.actionItem.update({
      where: { id: actionId },
      data: { done: !existing.done }
    })

    return res.json({ success: true, data: { action } })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const deleteMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const meetingId = req.params.meetingId as string
    const workspaceId = req.params.workspaceId as string

    const existing = await prisma.meeting.findFirst({
      where: { id: meetingId, workspaceId }
    })

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Meeting not found' })
    }

    await prisma.meeting.delete({ where: { id: meetingId } })

    return res.json({ success: true, data: { message: 'Meeting deleted' } })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
