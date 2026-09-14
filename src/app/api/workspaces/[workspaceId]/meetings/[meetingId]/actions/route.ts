import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@/lib/getToken'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; meetingId: string }> }
) {
  try {
    const token = getToken(req)
    if (!token) return NextResponse.json({ success: false, error: 'No token' }, { status: 401 })
    verifyToken(token)

    const { meetingId } = await params
    const { text, assigneeId } = await req.json()

    const action = await prisma.actionItem.create({
      data: {
        text: text.trim(),
        meetingId,
        assigneeId: assigneeId || null,
      },
      include: { assignee: { select: { id: true, name: true, avatarUrl: true } } },
    })

    return NextResponse.json({ success: true, data: { action } })
  } catch {
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
