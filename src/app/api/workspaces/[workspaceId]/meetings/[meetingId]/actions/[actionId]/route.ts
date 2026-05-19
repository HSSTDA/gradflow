import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; meetingId: string; actionId: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'No token' }, { status: 401 })
    verifyToken(token)

    const { actionId } = await params

    const current = await prisma.actionItem.findUnique({ where: { id: actionId }, select: { done: true } })
    if (!current) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    const action = await prisma.actionItem.update({
      where: { id: actionId },
      data: { done: !current.done },
    })

    return NextResponse.json({ success: true, data: { action } })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
