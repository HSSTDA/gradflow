import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@/lib/getToken'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; userId: string }> }
) {
  try {
    const token = getToken(req)
    if (!token) return NextResponse.json({ success: false, error: 'No token' }, { status: 401 })
    const { userId: requesterId } = verifyToken(token)
    const { workspaceId, userId } = await params

    const requester = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: requesterId } }
    })
    if (!requester || requester.role === 'MEMBER') {
      return NextResponse.json({ success: false, error: 'Only admins can remove members' }, { status: 403 })
    }

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })
    if (workspace?.ownerId === userId) {
      return NextResponse.json({ success: false, error: 'Cannot remove workspace owner' }, { status: 403 })
    }

    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } }
    })

    return NextResponse.json({ success: true, data: { message: 'Member removed' } })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
