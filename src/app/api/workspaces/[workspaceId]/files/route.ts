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
    const folder = req.nextUrl.searchParams.get('folder')

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } }
    })
    if (!member) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })

    const files = await prisma.file.findMany({
      where: { workspaceId, ...(folder && folder !== 'All Files' && { folder }) },
      include: { uploadedBy: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: { files } })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { workspaceId: string } }) {
  try {
    const { userId } = getUser(req)
    const { workspaceId } = params
    const { name, type, folder, size, url } = await req.json()

    if (!name || !type || !folder || !url)
      return NextResponse.json({ success: false, error: 'name, type, folder, url required' }, { status: 400 })

    const file = await prisma.file.create({
      data: { name, type, folder, size: size || 'Unknown', url, workspaceId, uploadedById: userId },
      include: { uploadedBy: { select: { id: true, name: true, avatarUrl: true } } }
    })

    return NextResponse.json({ success: true, data: { file } }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
