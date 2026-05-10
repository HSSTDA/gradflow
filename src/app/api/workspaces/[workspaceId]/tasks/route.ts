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

    const tasks = await prisma.task.findMany({
      where: { workspaceId },
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        subtasks: {
          include: {
            assignee: { select: { id: true, name: true, avatarUrl: true } },
            dependsOn: { select: { id: true, title: true, done: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: { tasks } })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { workspaceId: string } }) {
  try {
    const { userId } = getUser(req)
    const { workspaceId } = params
    const { title, priority = 'MEDIUM', status = 'TODO' } = await req.json()

    if (!title?.trim())
      return NextResponse.json({ success: false, error: 'Title required' }, { status: 400 })

    const task = await prisma.task.create({
      data: { title: title.trim(), priority, status, workspaceId, createdById: userId },
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        subtasks: true
      }
    })

    return NextResponse.json({ success: true, data: { task } }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
