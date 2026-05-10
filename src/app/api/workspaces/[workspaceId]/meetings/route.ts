import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const getUser = (req: NextRequest) => {
  const token = req.headers.get('authorization')?.split(' ')[1]
  if (!token) throw new Error('No token')
  return verifyToken(token)
}

export async function GET(req: NextRequest, { params }: { params: { workspaceId: string } }) {
  try {
    const { userId } = getUser(req)
    const { workspaceId } = params

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } }
    })
    if (!member) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })

    const meetings = await prisma.meeting.findMany({
      where: { workspaceId },
      include: {
        attendees: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        notes: true,
        actionItems: { include: { assignee: { select: { id: true, name: true, avatarUrl: true } } } }
      },
      orderBy: { date: 'desc' }
    })

    return NextResponse.json({ success: true, data: { meetings } })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { workspaceId: string } }) {
  try {
    const { userId } = getUser(req)
    const { workspaceId } = params
    const { title, date, duration, type, location, attendeeIds, notes, actionItems } = await req.json()

    if (!title || !date)
      return NextResponse.json({ success: false, error: 'Title and date required' }, { status: 400 })

    const meeting = await prisma.meeting.create({
      data: {
        title: title.trim(),
        date: new Date(date),
        duration: duration || 60,
        type: type || 'TEAM_SYNC',
        location: location || 'Online',
        workspaceId,
        attendees: { create: (attendeeIds || [userId]).map((uid: string) => ({ userId: uid })) },
        notes: { create: (notes || []).map((content: string) => ({ content })) },
        actionItems: { create: (actionItems || []).map((a: any) => ({ text: a.text, assigneeId: a.assigneeId || null })) }
      },
      include: {
        attendees: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        notes: true,
        actionItems: { include: { assignee: { select: { id: true, name: true, avatarUrl: true } } } }
      }
    })

    return NextResponse.json({ success: true, data: { meeting } }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
