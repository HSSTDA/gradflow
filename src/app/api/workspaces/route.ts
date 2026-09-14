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

const generateSlug = (name: string) =>
  name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') +
  '-' + Math.random().toString(36).slice(2, 6)

export async function GET(req: NextRequest) {
  try {
    const { userId } = getUser(req)
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            _count: { select: { members: true, tasks: true } },
            owner: { select: { id: true, name: true, email: true } }
          }
        }
      }
    })
    const workspaces = memberships.map(m => ({ ...m.workspace, myRole: m.role }))
    return NextResponse.json({ success: true, data: { workspaces } })
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = getUser(req)
    const { name, description } = await req.json()

    const nameError = validate.workspaceName(name ?? '')
    if (nameError)
      return NextResponse.json({ success: false, error: nameError }, { status: 400 })

    const safeName = validate.text(name, 100)

    const workspace = await prisma.workspace.create({
      data: {
        name: safeName,
        slug: generateSlug(safeName),
        description: description?.trim() || null,
        ownerId: userId,
        members: { create: { userId, role: 'OWNER' } }
      },
      include: {
        _count: { select: { members: true } },
        owner: { select: { id: true, name: true, email: true } }
      }
    })

    return NextResponse.json({ success: true, data: { workspace } }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
