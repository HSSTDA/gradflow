import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const getUser = (req: NextRequest) => {
  const token = req.headers.get('authorization')?.split(' ')[1]
  if (!token) throw new Error('No token')
  return verifyToken(token)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ workspaceId: string; milestoneId: string }> }) {
  try {
    const { userId } = getUser(req)
    const { workspaceId, milestoneId } = await params

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } }
    })
    if (!member) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })

    const body = await req.json()
    const { title, description, dueDate, status } = body

    const milestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        ...(title       !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(dueDate     !== undefined && { dueDate }),
        ...(status      !== undefined && { status }),
      },
    })

    return NextResponse.json({ success: true, data: milestone })
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ workspaceId: string; milestoneId: string }> }) {
  try {
    const { userId } = getUser(req)
    const { workspaceId, milestoneId } = await params

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } }
    })
    if (!member) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })

    await prisma.milestone.delete({ where: { id: milestoneId } })

    return NextResponse.json({ success: true, data: null })
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
}
