import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const getUser = (req: NextRequest) => {
  const token = req.headers.get('authorization')?.split(' ')[1]
  if (!token) throw new Error('No token')
  return verifyToken(token)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ workspaceId: string; taskId: string }> }) {
  try {
    const { userId } = getUser(req)
    const { workspaceId, taskId } = await params

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } }
    })
    if (!member) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })

    const { title, note, dueDate, assigneeId, dependsOnId } = await req.json()

    if (!title?.trim())
      return NextResponse.json({ success: false, error: 'Title required' }, { status: 400 })

    const subtask = await prisma.subTask.create({
      data: {
        title: title.trim(),
        note: note || '',
        dueDate: dueDate || null,
        assigneeId: assigneeId || null,
        dependsOnId: dependsOnId || null,
        taskId,
      },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        dependsOn: { select: { id: true, title: true, done: true } }
      }
    })

    return NextResponse.json({ success: true, data: { subtask } }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
