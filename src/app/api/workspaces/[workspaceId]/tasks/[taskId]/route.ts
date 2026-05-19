import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const getUser = (req: NextRequest) => {
  const token = req.headers.get('authorization')?.split(' ')[1]
  if (!token) throw new Error('No token')
  return verifyToken(token)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ workspaceId: string; taskId: string }> }) {
  try {
    const { userId } = getUser(req)
    const { workspaceId, taskId } = await params

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } }
    })
    if (!member) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })

    const body = await req.json()
    const task = await prisma.task.update({
      where: { id: taskId },
      data: body,
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        subtasks: {
          include: {
            assignee: { select: { id: true, name: true, avatarUrl: true } },
            dependsOn: { select: { id: true, title: true, done: true } }
          }
        }
      }
    })

    return NextResponse.json({ success: true, data: { task } })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ workspaceId: string; taskId: string }> }) {
  try {
    const { userId } = getUser(req)
    const { workspaceId, taskId } = await params

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } }
    })
    if (!member) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })

    await prisma.task.delete({ where: { id: taskId } })

    return NextResponse.json({ success: true, data: {} })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
