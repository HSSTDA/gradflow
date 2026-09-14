import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@/lib/getToken'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; messageId: string }> }
) {
  try {
    const token = getToken(req)
    if (!token) return NextResponse.json({ success: false, error: 'No token' }, { status: 401 })
    verifyToken(token)

    const { messageId } = await params

    const current = await prisma.message.findUnique({ where: { id: messageId }, select: { isPinned: true } })
    if (!current) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    const message = await prisma.message.update({
      where: { id: messageId },
      data: { isPinned: !current.isPinned },
    })

    return NextResponse.json({ success: true, data: { message } })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
