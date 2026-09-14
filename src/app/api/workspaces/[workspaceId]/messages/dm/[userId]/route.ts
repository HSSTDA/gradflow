import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@/lib/getToken'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; userId: string }> }
) {
  try {
    const token = getToken(req)
    if (!token) return NextResponse.json({ success: false, error: 'No token' }, { status: 401 })
    const { userId: myId } = verifyToken(token)

    const { workspaceId, userId } = await params

    const messages = await prisma.message.findMany({
      where: {
        workspaceId,
        OR: [
          { senderId: myId,   receiverId: userId },
          { senderId: userId, receiverId: myId   },
        ],
      },
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })

    return NextResponse.json({ success: true, data: { messages } })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
