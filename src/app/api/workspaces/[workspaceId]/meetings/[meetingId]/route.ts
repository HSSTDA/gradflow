import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@/lib/getToken'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; meetingId: string }> }
) {
  try {
    const token = getToken(req)
    if (!token) return NextResponse.json({ success: false, error: 'No token' }, { status: 401 })
    verifyToken(token)

    const { meetingId } = await params
    const { title, date, duration, type } = await req.json()

    const meeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        ...(title    && { title }),
        ...(date     && { date: new Date(date) }),
        ...(duration && { duration: parseInt(duration) }),
        ...(type     && { type }),
      },
    })

    return NextResponse.json({ success: true, data: { meeting } })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; meetingId: string }> }
) {
  try {
    const token = getToken(req)
    if (!token) return NextResponse.json({ success: false, error: 'No token' }, { status: 401 })
    verifyToken(token)

    const { meetingId } = await params
    await prisma.meeting.delete({ where: { id: meetingId } })

    return NextResponse.json({ success: true, data: { message: 'Deleted' } })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
