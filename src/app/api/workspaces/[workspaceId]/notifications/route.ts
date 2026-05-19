import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'No token' }, { status: 401 })
    const { userId } = verifyToken(token)
    const { workspaceId } = await params

    const notifications = await prisma.notification.findMany({
      where: { workspaceId, userId },
      include: {
        triggeredBy: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const unreadCount = notifications.filter((n: { read: boolean }) => !n.read).length

    return NextResponse.json({ success: true, data: { notifications, unreadCount } })
  } catch (err: unknown) {
    const e = err as { message?: string; meta?: unknown }
    console.error(err)
    return NextResponse.json({ success: false, error: e.message ?? 'Internal server error' }, { status: 500 })
  }
}
