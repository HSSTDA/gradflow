import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validate } from '@/lib/validate'

const getUser = (req: NextRequest) => {
  const token = req.headers.get('authorization')?.split(' ')[1]
  if (!token) throw new Error('No token')
  return verifyToken(token)
}

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { userId } = getUser(req)
    const { workspaceId } = await params

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } }
    })
    if (!member) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })

    const raw = await prisma.pinnedItem.findMany({
      where: { workspaceId },
      include: { addedBy: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    })

    const items = raw.map(item => ({ ...item, date: formatDate(item.createdAt) }))
    return NextResponse.json({ success: true, data: { items } }, {
      headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=600' },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { userId } = getUser(req)
    const { workspaceId } = await params
    const { title, body, category } = await req.json()

    if (!title?.trim() || !body?.trim() || !category) {
      return NextResponse.json(
        { success: false, error: 'title, body, category required' },
        { status: 400 }
      )
    }

    const safeTitle = validate.text(title, 200)
    const safeBody  = validate.text(body, 5000)

    const raw = await prisma.pinnedItem.create({
      data: { title: safeTitle, body: safeBody, category, workspaceId, addedById: userId },
      include: { addedBy: { select: { id: true, name: true, avatarUrl: true } } },
    })

    const item = { ...raw, date: formatDate(raw.createdAt) }
    return NextResponse.json({ success: true, data: { item } }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
