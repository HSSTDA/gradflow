import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const getUser = (req: NextRequest) => {
  const token = req.headers.get('authorization')?.split(' ')[1]
  if (!token) throw new Error('No token')
  return verifyToken(token)
}

export async function GET(req: NextRequest, { params }: { params: { workspaceId: string } }) {
  try {
    const { userId } = getUser(req)
    const { workspaceId } = params

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } }
    })
    if (!member) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })

    const messages = await prisma.message.findMany({
      where: { workspaceId, receiverId: null },
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100
    })

    return NextResponse.json({ success: true, data: { messages } })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { workspaceId: string } }) {
  try {
    const { userId } = getUser(req)
    const { workspaceId } = params
    const { text, receiverId } = await req.json()

    if (!text?.trim())
      return NextResponse.json({ success: false, error: 'Text required' }, { status: 400 })

    const message = await prisma.message.create({
      data: { text: text.trim(), workspaceId, senderId: userId, receiverId: receiverId || null },
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } }
    })

    return NextResponse.json({ success: true, data: { message } }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
