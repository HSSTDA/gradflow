import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer '))
      return NextResponse.json({ success: false, error: 'No token' }, { status: 401 })

    const token = authHeader.split(' ')[1]
    const { userId } = verifyToken(token)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, avatarUrl: true }
    })

    return NextResponse.json({ success: true, data: { user } })
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
  }
}
