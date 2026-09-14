import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@/lib/getToken'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const getUser = (req: NextRequest) => {
  const token = getToken(req)
  if (!token) throw new Error('No token')
  return verifyToken(token)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { userId } = getUser(req)
    const { workspaceId } = await params

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } }
    })
    if (!member) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })

    const meetings = await prisma.meeting.findMany({
      where: { workspaceId },
      include: {
        attendees: {
          select: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
        notes: { select: { id: true, text: true } },
        actions: {
          select: {
            id: true, text: true, done: true, assigneeId: true,
            assignee: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({ success: true, data: { meetings } })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { userId } = getUser(req)
    const { workspaceId } = await params
    const { title, date, duration, type, attendeeIds, notes, actionItems } = await req.json()

    if (!title || !date)
      return NextResponse.json({ success: false, error: 'Title and date required' }, { status: 400 })

    // Step 1: Create meeting without attendees
    // (adapter-pg fails on nested creates for models with @@id composite PK)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const created = await prisma.meeting.create({
      data: {
        title: title.trim(),
        date: new Date(date),
        duration: parseInt(duration) || 60,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: ((type || 'TEAM_SYNC') as any),
        workspaceId,
        notes: {
          create: (notes || [])
            .filter((n: string) => n?.trim())
            .map((text: string) => ({ text: text.trim() }))
        },
        actions: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          create: (actionItems || [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((a: any) => a?.text?.trim())
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((a: any) => ({ text: a.text.trim(), assigneeId: a.assigneeId || null }))
        },
      },
    })

    // Step 2: Create attendees separately
    const ids = (attendeeIds?.length ? attendeeIds : [userId]) as string[]
    await prisma.meetingAttendee.createMany({
      data: ids.map((uid: string) => ({ meetingId: created.id, userId: uid })),
      skipDuplicates: true,
    })

    // Step 3: Fetch complete meeting with all relations
    const meeting = await prisma.meeting.findUnique({
      where: { id: created.id },
      include: {
        attendees: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        notes: true,
        actions: { include: { assignee: { select: { id: true, name: true, avatarUrl: true } } } }
      }
    })

    return NextResponse.json({ success: true, data: { meeting } }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
