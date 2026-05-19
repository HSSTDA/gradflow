import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const getUser = (req: NextRequest) => {
  const token = req.headers.get('authorization')?.split(' ')[1]
  if (!token) throw new Error('No token')
  return verifyToken(token)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; taskId: string; subtaskId: string }> }
) {
  try {
    getUser(req)
    const { subtaskId } = await params
    await prisma.subTask.delete({ where: { id: subtaskId } })
    return NextResponse.json({ success: true, data: { message: 'Deleted' } })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; taskId: string; subtaskId: string }> }
) {
  try {
    getUser(req)
    const { subtaskId } = await params
    const body = await req.json()
    const subtask = await prisma.subTask.update({
      where: { id: subtaskId },
      data: {
        ...(body.status === 'DONE'        && { done: true  }),
        ...(body.status === 'TODO'        && { done: false }),
        ...(body.status === 'IN_PROGRESS' && { done: false }),
        ...(body.title      !== undefined && { title:      body.title }),
        ...(body.done       !== undefined && { done:       body.done }),
        ...(body.note       !== undefined && { note:       body.note }),
        ...(body.dueDate    !== undefined && { dueDate:    body.dueDate ?? null }),
        ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId ?? null }),
      },
      include: {
        assignee:  { select: { id: true, name: true, avatarUrl: true } },
        dependsOn: { select: { id: true, title: true, done: true } },
      },
    })
    return NextResponse.json({ success: true, data: { subtask } })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
