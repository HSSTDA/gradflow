import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'No token' }, { status: 401 })
    verifyToken(token)

    const { workspaceId } = await params

    const messages = await prisma.message.findMany({
      where: { workspaceId, isPinned: true, receiverId: null },
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({ success: true, data: { messages } })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
