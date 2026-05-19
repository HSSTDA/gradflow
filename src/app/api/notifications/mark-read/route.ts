import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'No token' }, { status: 401 })
    const { userId } = verifyToken(token)
    const { workspaceId } = await req.json()

    await prisma.notification.updateMany({
      where: { userId, workspaceId, read: false },
      data: { read: true },
    })

    return NextResponse.json({ success: true, data: { message: 'Marked as read' } })
  } catch {
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
