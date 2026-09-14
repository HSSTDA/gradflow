import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@/lib/getToken'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const getUser = (req: NextRequest) => {
  const token = getToken(req)
  if (!token) throw new Error('No token')
  return verifyToken(token)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { userId } = getUser(req)
    const { workspaceId } = await params

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } }
    })
    if (!member) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })

    const milestones = await prisma.milestone.findMany({
      where: { workspaceId },
      orderBy: { dueDate: 'asc' },
    })

    return NextResponse.json({ success: true, data: milestones })
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { userId } = getUser(req)
    const { workspaceId } = await params

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } }
    })
    if (!member) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })

    const body = await req.json()
    const { title, description, dueDate, status } = body

    if (!title || !dueDate) {
      return NextResponse.json({ success: false, error: 'title and dueDate are required' }, { status: 400 })
    }

    const milestone = await prisma.milestone.create({
      data: {
        workspaceId,
        title,
        description: description ?? null,
        dueDate,
        status: status ?? 'UPCOMING',
      },
    })

    return NextResponse.json({ success: true, data: milestone }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
}
