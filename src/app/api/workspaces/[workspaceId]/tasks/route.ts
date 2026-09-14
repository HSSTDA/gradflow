import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@/lib/getToken'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validate } from '@/lib/validate'

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

    const tasks = await prisma.task.findMany({
      where: { workspaceId },
      include: {
        createdBy: { select: { id: true, name: true } },
        subtasks: {
          select: {
            id: true,
            title: true,
            done: true,
            dueDate: true,
            note: true,
            assigneeId: true,
            dependsOnId: true,
            assignee: { select: { id: true, name: true, avatarUrl: true } },
            dependsOn: { select: { id: true, title: true, done: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { subtasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: { tasks } })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { userId } = getUser(req)
    const { workspaceId } = await params
    const { title, priority = 'MEDIUM', status = 'TODO' } = await req.json()

    if (!title?.trim())
      return NextResponse.json({ success: false, error: 'Title required' }, { status: 400 })

    const safeTitle = validate.text(title, 200)

    const task = await prisma.task.create({
      data: { title: safeTitle, priority, status, workspaceId, createdById: userId },
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        subtasks: true
      }
    })

    return NextResponse.json({ success: true, data: { task } }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
